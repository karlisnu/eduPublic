function createTutorManagementRepository(pool) {
  async function getWeek(tutorId, weekStart) {
    const [availability] = await pool.query(
      `SELECT weekday, start_hour AS startHour
       FROM tutor_availability
       WHERE tutor_id = ? AND week_start = ?
       ORDER BY weekday, start_hour`,
      [tutorId, weekStart],
    );
    const [requests] = await pool.query(
      `SELECT r.id, r.student_id AS studentId,
              CONCAT(sp.first_name, ' ', sp.last_name) AS studentName,
              r.subject, r.topic, r.school_shift AS schoolShift,
              r.preferred_weekday AS preferredWeekday,
              r.preferred_start_hour AS preferredStartHour,
              r.submitted_at AS submittedAt
       FROM tutoring_requests r
       INNER JOIN student_profiles sp ON sp.user_id = r.student_id
       WHERE r.tutor_id = ? AND r.week_start = ? AND r.status = 'pending'
       ORDER BY r.submitted_at`,
      [tutorId, weekStart],
    );
    const [students] = await pool.query(
      `SELECT ws.id, ws.student_id AS studentId,
              CONCAT(sp.first_name, ' ', sp.last_name) AS studentName,
              r.subject, r.topic, r.school_shift AS schoolShift,
              r.preferred_weekday AS preferredWeekday,
              r.preferred_start_hour AS preferredStartHour,
              ts.id AS sessionId, ts.weekday, ts.start_hour AS startHour,
              COALESCE(ts.status, 'pending') AS sessionStatus
       FROM tutor_weekly_students ws
       INNER JOIN tutoring_requests r ON r.id = ws.request_id
       INNER JOIN student_profiles sp ON sp.user_id = ws.student_id
       LEFT JOIN tutor_sessions ts
         ON ts.weekly_student_id = ws.id
       WHERE ws.tutor_id = ? AND ws.week_start = ?
       ORDER BY sp.first_name, sp.last_name`,
      [tutorId, weekStart],
    );
    return {
      availability,
      requests,
      students,
      acceptedCount: new Set(students.map((student) => student.studentId)).size,
    };
  }

  async function saveAvailability(tutorId, weekStart, slots) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("SELECT user_id FROM tutor_profiles WHERE user_id = ? FOR UPDATE", [tutorId]);
      const [occupied] = await connection.query(
        `SELECT weekday, start_hour AS startHour
         FROM tutor_sessions
         WHERE tutor_id = ? AND week_start = ? AND weekday IS NOT NULL
           AND status <> 'cancelled'
         FOR UPDATE`,
        [tutorId, weekStart],
      );
      const requestedKeys = new Set(slots.map((slot) => `${slot.weekday}:${slot.startHour}`));
      if (occupied.some((slot) => !requestedKeys.has(`${slot.weekday}:${slot.startHour}`))) {
        const error = new Error("No puedes quitar un horario que ya tiene una tutoría programada");
        error.status = 409;
        throw error;
      }
      await connection.query(
        `DELETE FROM tutor_availability
         WHERE tutor_id = ? AND week_start = ?
           AND NOT (${slots.length
             ? slots.map(() => "(weekday = ? AND start_hour = ?)").join(" OR ")
             : "1 = 0"})`,
        [tutorId, weekStart, ...slots.flatMap((slot) => [slot.weekday, slot.startHour])],
      );
      for (const slot of slots) {
        await connection.query(
          `INSERT INTO tutor_availability (tutor_id, week_start, weekday, start_hour)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE start_hour = VALUES(start_hour)`,
          [tutorId, weekStart, slot.weekday, slot.startHour],
        );
      }
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function decideRequest(tutorId, requestId, decision, validateAcceptance) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("SELECT user_id FROM tutor_profiles WHERE user_id = ? FOR UPDATE", [tutorId]);
      const [rows] = await connection.query(
        `SELECT id, student_id AS studentId, week_start AS weekStart,
                preferred_weekday AS preferredWeekday,
                preferred_start_hour AS preferredStartHour, status
         FROM tutoring_requests
         WHERE id = ? AND tutor_id = ? FOR UPDATE`,
        [requestId, tutorId],
      );
      const request = rows[0];
      if (!request || request.status !== "pending") {
        const error = new Error("La solicitud ya no está pendiente o no existe");
        error.status = 404;
        throw error;
      }

      if (decision === "accepted") {
        const [existing] = await connection.query(
          `SELECT id FROM tutor_weekly_students
           WHERE tutor_id = ? AND student_id = ? AND week_start = ?`,
          [tutorId, request.studentId, request.weekStart],
        );
        const [availability] = await connection.query(
          `SELECT a.start_hour FROM tutor_availability a
           WHERE a.tutor_id = ? AND a.week_start = ?
             AND (? IS NULL OR a.weekday = ?)
             AND (? IS NULL OR a.start_hour = ?)
             AND NOT EXISTS (
               SELECT 1 FROM tutor_sessions ts
               WHERE ts.tutor_id = a.tutor_id AND ts.week_start = a.week_start
                 AND ts.weekday = a.weekday AND ts.start_hour = a.start_hour
                 AND ts.status <> 'cancelled'
             )
           LIMIT 1 FOR UPDATE`,
          [
            tutorId, request.weekStart, request.preferredWeekday, request.preferredWeekday,
            request.preferredStartHour, request.preferredStartHour,
          ],
        );
        const [countRows] = await connection.query(
          `SELECT COUNT(DISTINCT student_id) AS total
           FROM tutor_weekly_students
           WHERE tutor_id = ? AND week_start = ?`,
          [tutorId, request.weekStart],
        );
        await validateAcceptance({
          acceptedStudentExists: existing.length > 0,
          acceptedStudentCount: Number(countRows[0].total),
          hasCompatibleAvailability: availability.length > 0,
        });
        if (existing.length === 0) {
          const [weeklyStudent] = await connection.query(
            `INSERT INTO tutor_weekly_students (tutor_id, student_id, week_start, request_id)
             VALUES (?, ?, ?, ?)`,
            [tutorId, request.studentId, request.weekStart, request.id],
          );
          await connection.query(
            `INSERT INTO tutor_sessions (weekly_student_id, tutor_id, week_start, status)
             VALUES (?, ?, ?, 'pending')`,
            [weeklyStudent.insertId, tutorId, request.weekStart],
          );
        }
      }
      await connection.query(
        "UPDATE tutoring_requests SET status = ?, responded_at = NOW() WHERE id = ?",
        [decision, request.id],
      );
      await connection.commit();
      return { studentId: request.studentId, weekStart: request.weekStart };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function scheduleStudent(tutorId, weeklyStudentId, slot, requestedWeekStart) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("SELECT user_id FROM tutor_profiles WHERE user_id = ? FOR UPDATE", [tutorId]);
      const [students] = await connection.query(
        `SELECT id, week_start AS weekStart
         FROM tutor_weekly_students WHERE id = ? AND tutor_id = ? FOR UPDATE`,
        [weeklyStudentId, tutorId],
      );
      const student = students[0];
      if (!student) {
        const error = new Error("No se encontró al alumno aceptado para esta semana");
        error.status = 404;
        throw error;
      }
      if (student.weekStart !== requestedWeekStart) {
        const error = new Error("El alumno no pertenece a la semana seleccionada");
        error.status = 409;
        throw error;
      }
      const [available] = await connection.query(
        `SELECT a.id FROM tutor_availability a
         INNER JOIN tutor_weekly_students ws ON ws.id = ?
         INNER JOIN tutoring_requests r ON r.id = ws.request_id
         WHERE a.tutor_id = ? AND a.week_start = ? AND a.weekday = ? AND a.start_hour = ?
           AND (r.preferred_weekday IS NULL OR r.preferred_weekday = a.weekday)
           AND (r.preferred_start_hour IS NULL OR r.preferred_start_hour = a.start_hour)`,
        [weeklyStudentId, tutorId, student.weekStart, slot.weekday, slot.startHour],
      );
      if (!available.length) {
        const error = new Error("Ese bloque no está guardado como disponible");
        error.status = 409;
        throw error;
      }
      const [conflicts] = await connection.query(
        `SELECT id FROM tutor_sessions
         WHERE tutor_id = ? AND week_start = ? AND weekday = ? AND start_hour = ?
           AND status <> 'cancelled' AND weekly_student_id <> ?
         FOR UPDATE`,
        [tutorId, student.weekStart, slot.weekday, slot.startHour, weeklyStudentId],
      );
      if (conflicts.length) {
        const error = new Error("Ese horario ya está ocupado por otra tutoría");
        error.status = 409;
        throw error;
      }
      const [existing] = await connection.query(
        `SELECT id FROM tutor_sessions
         WHERE weekly_student_id = ? FOR UPDATE`,
        [weeklyStudentId],
      );
      if (!existing.length) {
        const error = new Error("No se encontró el registro semanal de la tutoría");
        error.status = 409;
        throw error;
      }
      await connection.query(
        `UPDATE tutor_sessions SET weekday = ?, start_hour = ?, status = 'scheduled'
         WHERE id = ?`,
        [slot.weekday, slot.startHour, existing[0].id],
      );
      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  async function updateSessionStatus(tutorId, sessionId, status) {
    const [result] = await pool.query(
      `UPDATE tutor_sessions SET status = ?
       WHERE id = ? AND tutor_id = ? AND status = 'scheduled'`,
      [status, sessionId, tutorId],
    );
    if (result.affectedRows !== 1) {
      const error = new Error("No se encontró la tutoría o su estado ya cambió");
      error.status = 404;
      throw error;
    }
  }

  async function createRequest(entity) {
    const [subjects] = await pool.query(
      `SELECT s.name FROM tutor_subjects ts
       INNER JOIN subjects s ON s.id = ts.subject_id
       INNER JOIN tutor_profiles tp ON tp.user_id = ts.tutor_id
       INNER JOIN users u ON u.id = tp.user_id
       WHERE ts.tutor_id = ? AND s.name = ?
         AND tp.application_status = 'approved' AND tp.is_available = TRUE
         AND u.account_status = 'approved'`,
      [entity.tutorId, entity.subject],
    );
    if (!subjects.length) {
      const error = new Error("El tutor no está habilitado para esa materia");
      error.status = 404;
      throw error;
    }
    const [result] = await pool.query(
      `INSERT INTO tutoring_requests
        (tutor_id, student_id, week_start, subject, topic, school_shift,
         preferred_weekday, preferred_start_hour)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entity.tutorId, entity.studentId, entity.weekStart, entity.subject, entity.topic, entity.schoolShift,
        entity.preferredWeekday, entity.preferredStartHour,
      ],
    );
    return result.insertId;
  }

  return {
    createRequest,
    decideRequest,
    getWeek,
    saveAvailability,
    scheduleStudent,
    updateSessionStatus,
  };
}

module.exports = { createTutorManagementRepository };

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const { pool } = require("./db");
const openapi = require("./openapi");
const { AdminLoginRequestDto, AdminLoginResponseDto } = require("./dtos/admin-login.dto");
const { createTutorManagementRouter } = require("./routes/tutor-management.routes");
const {
  SESSION_MAX_AGE_SECONDS,
  clearSessionCookie,
  createRequireAuthentication,
  hashSessionToken,
  readSessionToken,
  requireRoles,
  sessionCookie,
} = require("./auth");
const {
  acquireMicrosoftIdentity,
  authTransactionCookie,
  clearAuthTransactionCookie,
  clearRegistrationCookie,
  createAuthorizationUrl,
  getMicrosoftConfiguration,
  hashesMatch,
  parseAuthTransaction,
  randomToken,
  readRegistrationToken,
  registrationCookie,
} = require("./microsoft-auth");

const app = express();
const requireAuthentication = createRequireAuthentication(pool);

app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
  credentials: true,
}));
app.use(express.json());
app.use("/Alumnos/html", express.static(path.join(__dirname, "../../Alumnos/html")));
app.use("/imagenes", express.static(path.join(__dirname, "../../imagenes")));

app.get("/api-docs.json", (req, res) => {
  res.json(openapi);
});

app.get(["/api-docs", "/api-docs/"], (req, res) => {
  res.type("html").send(`<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>EduMatch API - Swagger UI</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
    <style>
      body { margin: 0; background: #fafafa; }
      .swagger-ui .topbar { background: #173b57; }
      .swagger-ui .topbar-wrapper .link { display: none; }
    </style>
  </head>
  <body>
    <div id="swagger-ui"></div>
    <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
    <script>
      window.onload = () => {
        window.ui = SwaggerUIBundle({
          url: "/api-docs.json",
          dom_id: "#swagger-ui",
          deepLinking: true,
          persistAuthorization: true,
          displayRequestDuration: true,
          filter: true,
          presets: [SwaggerUIBundle.presets.apis],
          layout: "BaseLayout",
        });
      };
    </script>
  </body>
</html>`);
});

function verifyPassword(password, storedHash) {
  if (typeof storedHash !== "string") return false;
  const [salt, hash] = storedHash.split(":");
  if (!salt || !/^[a-f\d]{128}$/i.test(hash || "")) return false;

  const calculatedHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(calculatedHash, "hex"));
}

async function requireDatabase() {
  try {
    await pool.query("SELECT 1");
  } catch (error) {
    error.status = 503;
    error.publicMessage = "MySQL no está disponible; los datos no se guardaron.";
    throw error;
  }
}

const prepareDatabase = async () => {
  try {
    await requireDatabase();
  } catch (error) {
    throw new Error(
      "No se pudo conectar con MySQL. Inicia la base de datos y ejecuta `npm --prefix backend run db:setup`.",
      { cause: error },
    );
  }

  const requiredColumnsByTable = {
    users: ["id", "username", "login_identifier", "email", "password_hash", "microsoft_object_id", "role", "account_status", "approved_at"],
    auth_sessions: ["id", "user_id", "token_hash", "expires_at"],
    microsoft_registration_sessions: [
      "id", "token_hash", "email", "microsoft_object_id", "role", "expires_at",
    ],
    approval_events: ["id", "user_id", "reviewer_id", "decision", "created_at"],
    student_profiles: ["user_id", "student_number", "career_id", "campus_id"],
    tutor_profiles: [
      "user_id", "application_status", "is_available", "career_id",
      "current_semester", "average",
    ],
    careers: ["id", "name", "is_active"],
    campuses: ["id", "name", "is_active"],
    subjects: ["id", "name"],
    career_subjects: ["career_id", "subject_id", "semester_number"],
    tutor_subjects: ["tutor_id", "subject_id"],
    tutor_ratings: ["tutor_id", "rating"],
    tutor_availability: ["tutor_id", "week_start", "weekday", "start_hour"],
    tutoring_requests: [
      "id", "tutor_id", "student_id", "week_start", "subject", "topic", "school_shift",
      "preferred_weekday", "preferred_start_hour", "status", "submitted_at",
    ],
    tutor_weekly_students: ["id", "tutor_id", "student_id", "week_start", "request_id"],
    tutor_sessions: [
      "id", "weekly_student_id", "tutor_id", "week_start", "weekday", "start_hour", "status",
    ],
  };
  const [tableRows] = await pool.query("SHOW TABLES");
  const existingTables = new Set(tableRows.map((row) => Object.values(row)[0]));
  const schemaErrors = [];
  for (const [table, requiredColumns] of Object.entries(requiredColumnsByTable)) {
    if (!existingTables.has(table)) {
      schemaErrors.push(`falta la tabla ${table}`);
      continue;
    }
    const [columns] = await pool.query(`SHOW COLUMNS FROM \`${table}\``);
    const availableColumns = new Set(columns.map((column) => column.Field));
    const missingColumns = requiredColumns.filter((column) => !availableColumns.has(column));
    if (missingColumns.length > 0) {
      schemaErrors.push(`${table}: ${missingColumns.join(", ")}`);
    }
  }
  if (schemaErrors.length > 0) {
    throw new Error(
      `Esquema MySQL incompleto (${schemaErrors.join("; ")}). Ejecuta \`npm --prefix backend run db:setup\`.`,
    );
  }
};

app.get("/", async (req, res) => {
  await requireDatabase();
  res.json({
    message: "API EDU-EduMatch funcionando",
    login: "http://localhost:5173/",
    endpoints: [
      "GET /api/health",
      "GET /api-docs",
      "GET /api-docs.json",
      "GET /api/catalogs",
      "GET /api/catalogs/tutor-subjects",
      "POST /api/login",
      "GET /api/auth/microsoft",
      "GET /api/auth/microsoft/callback",
      "GET /api/auth/microsoft/registration",
      "POST /api/auth/microsoft/registration",
      "POST /api/auth/microsoft/student-registration",
      "GET /api/session",
      "POST /api/logout",
      "GET /api/tutors",
      "GET /api/tutor-management/week",
      "PUT /api/tutor-management/availability",
      "PATCH /api/tutor-management/requests/:id",
      "PUT /api/tutor-management/students/:id/schedule",
      "PATCH /api/tutor-management/sessions/:id/status",
      "POST /api/tutor-management/requests",
      "GET /api/admin/approvals/pending",
      "PATCH /api/admin/users/:id/approval",
      "DELETE /api/admin/users/:id",
    ],
    database: "mysql",
  });
});

app.get("/api/health", async (req, res, next) => {
  try {
    await requireDatabase();
    res.json({ message: "Backend funcionando", database: "mysql" });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/microsoft", async (req, res, next) => {
  const role = typeof req.query.role === "string" ? req.query.role : "alumno";
  if (!["alumno", "tutor"].includes(role)) {
    return res.status(400).json({ error: "El tipo de cuenta institucional no es válido" });
  }
  if (!getMicrosoftConfiguration()) {
    return res.redirect(
      `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/?institutional=unavailable&role=${role}`,
    );
  }
  if (readSessionToken(req)) {
    return res.redirect(
      `${process.env.FRONTEND_ORIGIN || "http://localhost:5173"}/?institutional=logout_first&role=${role}`,
    );
  }

  const state = randomToken();
  const nonce = randomToken();
  const codeVerifier = randomToken();
  try {
    const authorizationUrl = await createAuthorizationUrl(state, nonce, codeVerifier);
    res.setHeader("Set-Cookie", authTransactionCookie(
      state,
      nonce,
      codeVerifier,
      process.env.NODE_ENV === "production",
      role,
    ));
    res.redirect(authorizationUrl);
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/microsoft/callback", async (req, res, next) => {
  const frontendOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
  const transaction = parseAuthTransaction(req);
  const callbackState = typeof req.query.state === "string" ? req.query.state : "";
  const code = typeof req.query.code === "string" ? req.query.code : "";
  const fail = (status, reason) => {
    res.setHeader("Set-Cookie", [
      clearAuthTransactionCookie(),
      clearRegistrationCookie(),
    ]);
    const redirectUrl = new URL(frontendOrigin);
    redirectUrl.searchParams.set("institutional", status);
    if (transaction?.role === "tutor") redirectUrl.searchParams.set("role", "tutor");
    if (reason && /^[a-z][a-z\d_]{0,63}$/i.test(reason)) {
      redirectUrl.searchParams.set("reason", reason);
    }
    return res.redirect(redirectUrl.toString());
  };

  if (!transaction || !callbackState || !hashesMatch(transaction.state, callbackState)) {
    return fail("failed");
  }
  if (!code || req.query.error) {
    return fail("failed");
  }

  let identity;
  try {
    identity = await acquireMicrosoftIdentity(code, transaction.nonce, transaction.codeVerifier);
  } catch (error) {
    if (error.microsoftCode) {
      console.error("Microsoft authorization code exchange failed:", {
        error: error.microsoftCode,
        aadsts: error.aadstsCode || "not provided",
        correlationId: error.correlationId || "not provided",
      });
      return fail("exchange_failed", error.microsoftCode);
    }
    console.error("Microsoft sign-in verification failed:", error.message);
    return fail("failed");
  }

  try {
    await requireDatabase();
    const [users] = await pool.query(
      `SELECT u.id, u.username, u.email, u.role, u.account_status,
              u.microsoft_object_id, sp.user_id AS student_profile_id,
              tp.user_id AS tutor_profile_id, tp.application_status
       FROM users u
       LEFT JOIN student_profiles sp ON sp.user_id = u.id
       LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
       WHERE u.email = ? OR u.microsoft_object_id = ?
       LIMIT 2`,
      [identity.email, identity.objectId],
    );

    if (users.length > 1) return fail("conflict");
    const user = users[0];
    if (user) {
      const hasExpectedProfile = transaction.role === "alumno"
        ? user.role === "alumno" && user.student_profile_id
        : user.role === "tutor" && user.tutor_profile_id;
      if (!hasExpectedProfile ||
          (user.microsoft_object_id && user.microsoft_object_id !== identity.objectId)) {
        return fail("conflict");
      }

      if (!user.microsoft_object_id) {
        const [linkResult] = await pool.query(
          "UPDATE users SET microsoft_object_id = ? WHERE id = ? AND microsoft_object_id IS NULL",
          [identity.objectId, user.id],
        );
        if (linkResult.affectedRows !== 1) return fail("conflict");
      }
      if (user.account_status !== "approved") {
        return fail(user.account_status === "pending" ? "pending" : "disabled");
      }
      if (user.role === "tutor" && user.application_status !== "approved") {
        return fail(user.application_status === "pending" ? "pending" : "disabled");
      }

      const token = randomToken();
      const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
      await pool.query(
        "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
        [user.id, hashSessionToken(token), expiresAt],
      );
      res.setHeader("Set-Cookie", [
        clearAuthTransactionCookie(),
        clearRegistrationCookie(),
        sessionCookie(token),
      ]);
      return res.redirect(frontendOrigin);
    }

    const registrationToken = randomToken();
    await pool.query("DELETE FROM microsoft_registration_sessions WHERE expires_at <= NOW()");
    await pool.query(
      "DELETE FROM microsoft_registration_sessions WHERE microsoft_object_id = ?",
      [identity.objectId],
    );
    const registrationRole = transaction.role;
    await pool.query(
      `INSERT INTO microsoft_registration_sessions
        (token_hash, email, microsoft_object_id, role, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        hashSessionToken(registrationToken),
        identity.email,
        identity.objectId,
        registrationRole,
        new Date(Date.now() + 15 * 60 * 1000),
      ],
    );
    res.setHeader("Set-Cookie", [
      clearAuthTransactionCookie(),
      registrationCookie(registrationToken),
    ]);
    const registrationStatus = registrationRole === "alumno" ? "student_register" : "tutor_register";
    return res.redirect(
      `${frontendOrigin}/?institutional=${registrationStatus}&role=${registrationRole}`,
    );
  } catch (error) {
    return next(error);
  }
});

app.get("/api/auth/microsoft/registration", async (req, res, next) => {
  const token = readRegistrationToken(req);
  if (!token) return res.status(401).json({ error: "La verificación institucional expiró; inicia sesión nuevamente" });

  try {
    await requireDatabase();
    const [rows] = await pool.query(
      `SELECT email, role FROM microsoft_registration_sessions
       WHERE token_hash = ? AND expires_at > NOW()
       LIMIT 1`,
      [hashSessionToken(token)],
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: "La verificación institucional expiró; inicia sesión nuevamente" });
    }
    return res.json({ email: rows[0].email, role: rows[0].role });
  } catch (error) {
    return next(error);
  }
});

app.post("/api/auth/microsoft/registration", async (req, res, next) => {
  const token = readRegistrationToken(req);
  if (!token) return res.status(401).json({ error: "La verificación institucional expiró; inicia sesión nuevamente" });

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const studentNumber = typeof body.studentNumber === "string" ? body.studentNumber : "";
  const careerId = typeof body.careerId === "number" ? body.careerId : Number.NaN;
  const currentSemester = typeof body.currentSemester === "number" ? body.currentSemester : Number.NaN;
  const average = typeof body.average === "number" ? body.average : Number.NaN;
  const subjectIds = Array.isArray(body.subjectIds) ? body.subjectIds : [];
  const bio = typeof body.bio === "string" ? body.bio.trim() : "";
  const experience = typeof body.experience === "string" ? body.experience.trim() : "";
  const validName = (value, maxLength) => value.length > 0 &&
    value.length <= maxLength && /^\p{L}+$/u.test(value);

  if (username.length < 3 || username.length > 80 || !/^\p{L}+$/u.test(username) ||
      !validName(firstName, 80) || !validName(lastName, 120)) {
    return res.status(400).json({ error: "Usuario, nombre o apellido tienen un formato inválido" });
  }
  if (!/^\d{11}$/.test(studentNumber)) {
    return res.status(400).json({ error: "La matrícula debe tener exactamente 11 dígitos" });
  }
  if (!Number.isSafeInteger(careerId) || careerId < 1 ||
      !Number.isSafeInteger(currentSemester) || currentSemester < 1 ||
      currentSemester > 65535 ||
      !Number.isFinite(average) || average < 0 || average > 100) {
    return res.status(400).json({ error: "Selecciona una carrera, semestre y promedio válidos (0 a 100)" });
  }
  if (bio.length > 100 || experience.length < 1 || experience.length > 100) {
    return res.status(400).json({ error: "La biografía y experiencia deben tener como máximo 100 caracteres" });
  }
  if (subjectIds.length === 0 ||
      subjectIds.some((id) => !Number.isSafeInteger(id) || id < 1) ||
      new Set(subjectIds).size !== subjectIds.length) {
    return res.status(400).json({ error: "Selecciona al menos una materia elegible" });
  }

  let connection;
  let transactionStarted = false;
  try {
    await requireDatabase();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [sessions] = await connection.query(
      `SELECT email, microsoft_object_id FROM microsoft_registration_sessions
       WHERE token_hash = ? AND expires_at > NOW() AND role = 'tutor'
       FOR UPDATE`,
      [hashSessionToken(token)],
    );
    const registration = sessions[0];
    if (!registration) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(401).json({ error: "La verificación institucional expiró; inicia sesión nuevamente" });
    }

    const [careers] = await connection.query(
      "SELECT id FROM careers WHERE id = ? AND is_active = TRUE",
      [careerId],
    );
    if (careers.length === 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ error: "La carrera seleccionada no está activa en el catálogo" });
    }

    const subjectPlaceholders = subjectIds.map(() => "?").join(", ");
    const [eligibleSubjects] = await connection.query(
      `SELECT subject_id
       FROM career_subjects
       WHERE career_id = ? AND semester_number <= ?
         AND subject_id IN (${subjectPlaceholders})`,
      [careerId, currentSemester, ...subjectIds],
    );
    if (eligibleSubjects.length !== subjectIds.length) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({
        error: "Una o más materias no pertenecen a la carrera o superan tu semestre actual",
      });
    }

    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ? OR microsoft_object_id = ? OR login_identifier = ? LIMIT 1",
      [registration.email, registration.microsoft_object_id, studentNumber],
    );
    if (existingUsers.length > 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ error: "Esta cuenta institucional ya está vinculada a un perfil" });
    }

    const [userResult] = await connection.query(
      `INSERT INTO users
        (username, login_identifier, email, password_hash, microsoft_object_id, role, account_status)
       VALUES (?, ?, ?, NULL, ?, 'tutor', 'pending')`,
      [username, studentNumber, registration.email, registration.microsoft_object_id],
    );
    await connection.query(
      `INSERT INTO tutor_profiles
        (user_id, first_name, last_name, bio, experience, career_id, current_semester,
         average, application_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userResult.insertId,
        firstName,
        lastName,
        bio || null,
        experience,
        careerId,
        currentSemester,
        average,
      ],
    );
    const subjectValues = subjectIds.map(() => "(?, ?)").join(", ");
    await connection.query(
      `INSERT INTO tutor_subjects (tutor_id, subject_id) VALUES ${subjectValues}`,
      subjectIds.flatMap((subjectId) => [userResult.insertId, subjectId]),
    );
    await connection.query(
      "DELETE FROM microsoft_registration_sessions WHERE id = ?",
      [sessions[0].id],
    );
    await connection.commit();
    transactionStarted = false;
    res.setHeader("Set-Cookie", clearRegistrationCookie());
    return res.status(201).json({
      id: userResult.insertId,
      username,
      role: "tutor",
      accountStatus: "pending",
      applicationStatus: "pending",
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "La matrícula, el usuario o el correo ya están registrados" });
    }
    return next(error);
  } finally {
    if (connection) connection.release();
  }
});

app.post("/api/auth/microsoft/student-registration", async (req, res, next) => {
  const token = readRegistrationToken(req);
  if (!token) {
    return res.status(401).json({ error: "La verificación institucional expiró; inicia sesión nuevamente" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const username = typeof body.username === "string" ? body.username.trim() : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";
  const studentNumber = typeof body.studentNumber === "string" ? body.studentNumber : "";
  const careerId = typeof body.careerId === "number" ? body.careerId : Number.NaN;
  const campusId = typeof body.campusId === "number" ? body.campusId : Number.NaN;
  const phone = typeof body.phone === "string" ? body.phone : "";
  const validName = (value, maxLength) =>
    value.length > 0 && value.length <= maxLength && /^\p{L}+$/u.test(value);

  if (username.length < 3 || username.length > 80 || !/^\p{L}+$/u.test(username) ||
      !validName(firstName, 80) || !validName(lastName, 120)) {
    return res.status(400).json({ error: "Usuario, nombre o apellido tienen un formato inválido" });
  }
  if (!/^\d{11}$/.test(studentNumber) || !/^\d{11}$/.test(phone)) {
    return res.status(400).json({
      error: "La matrícula y el teléfono deben tener exactamente 11 dígitos",
    });
  }
  if (!Number.isSafeInteger(careerId) || careerId < 1 ||
      !Number.isSafeInteger(campusId) || campusId < 1) {
    return res.status(400).json({ error: "Selecciona una carrera y un campus válidos" });
  }

  let connection;
  let transactionStarted = false;
  try {
    await requireDatabase();
    connection = await pool.getConnection();
    await connection.beginTransaction();
    transactionStarted = true;

    const [sessions] = await connection.query(
      `SELECT id, email, microsoft_object_id FROM microsoft_registration_sessions
       WHERE token_hash = ? AND expires_at > NOW() AND role = 'alumno'
       FOR UPDATE`,
      [hashSessionToken(token)],
    );
    const registration = sessions[0];
    if (!registration) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(401).json({ error: "La verificación institucional expiró; inicia sesión nuevamente" });
    }

    const [catalogEntries] = await connection.query(
      `SELECT
         (SELECT COUNT(*) FROM careers WHERE id = ? AND is_active = TRUE) AS career_count,
         (SELECT COUNT(*) FROM campuses WHERE id = ? AND is_active = TRUE) AS campus_count`,
      [careerId, campusId],
    );
    if (catalogEntries[0].career_count !== 1 || catalogEntries[0].campus_count !== 1) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(400).json({ error: "La carrera o el campus no están activos en el catálogo" });
    }

    const [existingUsers] = await connection.query(
      "SELECT id FROM users WHERE email = ? OR microsoft_object_id = ? OR login_identifier = ? LIMIT 1",
      [registration.email, registration.microsoft_object_id, studentNumber],
    );
    if (existingUsers.length > 0) {
      await connection.rollback();
      transactionStarted = false;
      return res.status(409).json({ error: "Esta cuenta institucional o matrícula ya está vinculada a un perfil" });
    }

    const [userResult] = await connection.query(
      `INSERT INTO users
        (username, login_identifier, email, password_hash, microsoft_object_id, role, account_status)
       VALUES (?, ?, ?, NULL, ?, 'alumno', 'pending')`,
      [username, studentNumber, registration.email, registration.microsoft_object_id],
    );
    await connection.query(
      `INSERT INTO student_profiles
        (user_id, first_name, last_name, student_number, career_id, campus_id, phone,
         student_number_verification_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        userResult.insertId,
        firstName,
        lastName,
        studentNumber,
        careerId,
        campusId,
        phone,
      ],
    );
    await connection.query(
      "DELETE FROM microsoft_registration_sessions WHERE id = ?",
      [registration.id],
    );
    await connection.commit();
    transactionStarted = false;
    res.setHeader("Set-Cookie", clearRegistrationCookie());
    return res.status(201).json({
      id: userResult.insertId,
      username,
      role: "alumno",
      accountStatus: "pending",
      studentNumberVerificationStatus: "pending",
    });
  } catch (error) {
    if (connection && transactionStarted) {
      await connection.rollback();
      transactionStarted = false;
    }
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "La matrícula, el usuario o el correo ya están registrados" });
    }
    return next(error);
  } finally {
    if (connection) connection.release();
  }
});

app.get("/api/catalogs/tutor-subjects", async (req, res, next) => {
  const careerId = Number(req.query.careerId);
  const currentSemester = Number(req.query.currentSemester);
  if (!Number.isSafeInteger(careerId) || careerId < 1 ||
      !Number.isSafeInteger(currentSemester) || currentSemester < 1 || currentSemester > 65535) {
    return res.status(400).json({ error: "Indica una carrera y semestre válidos" });
  }

  try {
    await requireDatabase();
    const [careers] = await pool.query(
      "SELECT id FROM careers WHERE id = ? AND is_active = TRUE",
      [careerId],
    );
    if (careers.length === 0) {
      return res.status(400).json({ error: "La carrera seleccionada no está activa en el catálogo" });
    }
    const [subjects] = await pool.query(
      `SELECT s.id, s.name, cs.semester_number AS semesterNumber
       FROM career_subjects cs
       INNER JOIN subjects s ON s.id = cs.subject_id
       WHERE cs.career_id = ? AND cs.semester_number <= ?
       ORDER BY cs.semester_number, s.name`,
      [careerId, currentSemester],
    );
    return res.json(subjects);
  } catch (error) {
    return next(error);
  }
});

app.get("/api/catalogs", async (req, res, next) => {
  try {
    await requireDatabase();
    const [careers, campuses, subjects] = await Promise.all([
      pool.query("SELECT id, name FROM careers WHERE is_active = TRUE ORDER BY name"),
      pool.query("SELECT id, name FROM campuses WHERE is_active = TRUE ORDER BY name"),
      pool.query("SELECT id, name FROM subjects ORDER BY name"),
    ]);
    res.json({
      careers: careers[0],
      campuses: campuses[0],
      subjects: subjects[0],
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/login", async (req, res, next) => {
  let loginRequest;
  try {
    loginRequest = AdminLoginRequestDto.from(req.body);
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }

  try {
    await requireDatabase();

    const query = pool.query(
      `SELECT id, username, password_hash, role, account_status
       FROM users
       WHERE (login_identifier = ? OR username = ? OR email = ?) AND role = 'admin'
       LIMIT 1`,
      [loginRequest.identifier, loginRequest.identifier, loginRequest.identifier],
    );
    const [rows] = await query;

    if (rows.length === 0 || !verifyPassword(loginRequest.password, rows[0].password_hash)) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    if (rows[0].account_status !== "approved") {
      return res.status(403).json({ error: "La cuenta está pendiente de aprobación o no está habilitada" });
    }
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
    await pool.query("DELETE FROM auth_sessions WHERE expires_at <= NOW()");
    await pool.query(
      "INSERT INTO auth_sessions (user_id, token_hash, expires_at) VALUES (?, ?, ?)",
      [rows[0].id, hashSessionToken(token), expiresAt],
    );
    res.setHeader("Set-Cookie", sessionCookie(token));
    res.json(new AdminLoginResponseDto(rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get("/api/session", requireAuthentication, (req, res) => {
  res.json(req.auth);
});

app.post("/api/logout", async (req, res, next) => {
  const token = readSessionToken(req);
  try {
    if (token) {
      await pool.query("DELETE FROM auth_sessions WHERE token_hash = ?", [hashSessionToken(token)]);
    }
    res.setHeader("Set-Cookie", clearSessionCookie());
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/admin/approvals/pending",
  requireAuthentication,
  requireRoles("admin"),
  async (req, res, next) => {
    try {
      await requireDatabase();
      const [rows] = await pool.query(
        `SELECT u.id, u.username, u.email, u.login_identifier, u.role, u.account_status,
                tp.application_status,
                COALESCE(tp.first_name, sp.first_name) AS first_name,
                COALESCE(tp.last_name, sp.last_name) AS last_name,
                tp.current_semester, tp.average, c.name AS career,
                sp.student_number, sp.phone, cp.name AS campus,
                sp.student_number_verification_status,
                GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS subjects
         FROM users u
         LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
         LEFT JOIN student_profiles sp ON sp.user_id = u.id
         LEFT JOIN careers c ON c.id = COALESCE(tp.career_id, sp.career_id)
         LEFT JOIN campuses cp ON cp.id = sp.campus_id
         LEFT JOIN tutor_subjects ts ON ts.tutor_id = tp.user_id
         LEFT JOIN subjects s ON s.id = ts.subject_id
         WHERE (u.role = 'alumno' AND u.account_status = 'pending')
            OR (u.role = 'tutor' AND
                (u.account_status = 'pending' OR tp.application_status = 'pending'))
         GROUP BY u.id, u.username, u.email, u.login_identifier, u.role, u.account_status,
                  tp.application_status, tp.first_name, tp.last_name,
                  tp.current_semester, tp.average, sp.first_name, sp.last_name,
                  sp.student_number, sp.phone, sp.student_number_verification_status,
                  cp.name, c.name, u.created_at
         ORDER BY u.created_at ASC`,
      );
      res.json(rows);
    } catch (error) {
      next(error);
    }
  },
);

app.patch(
  "/api/admin/users/:id/approval",
  requireAuthentication,
  requireRoles("admin"),
  async (req, res, next) => {
    const userId = Number(req.params.id);
    const decision = typeof req.body?.decision === "string" ? req.body.decision : "";
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim() : null;

    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(400).json({ error: "El id de usuario no es válido" });
    }
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "La decisión debe ser approved o rejected" });
    }
    if (req.body?.reason !== undefined && typeof req.body.reason !== "string") {
      return res.status(400).json({ error: "El motivo debe ser texto" });
    }
    if (reason && reason.length > 1000) {
      return res.status(400).json({ error: "El motivo no puede superar 1000 caracteres" });
    }
    if (userId === req.auth.id) {
      return res.status(403).json({ error: "No puedes revisar tu propia cuenta" });
    }

    let connection;
    let transactionStarted = false;
    try {
      await requireDatabase();
      connection = await pool.getConnection();
      await connection.beginTransaction();
      transactionStarted = true;

      const [users] = await connection.query(
        `SELECT u.role, u.account_status, tp.application_status
         FROM users u
         LEFT JOIN tutor_profiles tp ON tp.user_id = u.id
         WHERE u.id = ?
         FOR UPDATE`,
        [userId],
      );
      const target = users[0];
      const isReviewable = target &&
        ["alumno", "tutor"].includes(target.role) &&
        (target.account_status === "pending" ||
          (target.role === "tutor" && target.application_status === "pending"));
      if (!isReviewable) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(404).json({ error: "No se encontró una solicitud pendiente para revisar" });
      }

      await connection.query(
        "UPDATE users SET account_status = ?, approved_at = ? WHERE id = ?",
        [decision, decision === "approved" ? new Date() : null, userId],
      );
      if (target.role === "tutor") {
        await connection.query(
          "UPDATE tutor_profiles SET application_status = ? WHERE user_id = ?",
          [decision, userId],
        );
      }
      await connection.query(
        `INSERT INTO approval_events (user_id, reviewer_id, decision, reason)
         VALUES (?, ?, ?, ?)`,
        [userId, req.auth.id, decision, reason || null],
      );

      await connection.commit();
      transactionStarted = false;
      res.json({ id: userId, role: target.role, accountStatus: decision });
    } catch (error) {
      if (connection && transactionStarted) {
        await connection.rollback();
        transactionStarted = false;
      }
      next(error);
    } finally {
      if (connection) connection.release();
    }
  },
);

app.delete(
  "/api/admin/users/:id",
  requireAuthentication,
  requireRoles("admin"),
  async (req, res, next) => {
    const userId = Number(req.params.id);

    if (!Number.isSafeInteger(userId) || userId < 1) {
      return res.status(400).json({ error: "El id de usuario no es válido" });
    }
    if (userId === req.auth.id) {
      return res.status(403).json({ error: "No puedes eliminar tu propia cuenta" });
    }

    let connection;
    let transactionStarted = false;
    try {
      await requireDatabase();
      connection = await pool.getConnection();
      await connection.beginTransaction();
      transactionStarted = true;

      const [users] = await connection.query(
        "SELECT id FROM users WHERE id = ? FOR UPDATE",
        [userId],
      );
      if (users.length === 0) {
        await connection.rollback();
        transactionStarted = false;
        return res.status(404).json({ error: "Usuario no encontrado" });
      }

      await connection.query("DELETE FROM users WHERE id = ?", [userId]);
      await connection.commit();
      transactionStarted = false;
      return res.status(204).end();
    } catch (error) {
      if (connection && transactionStarted) {
        await connection.rollback();
        transactionStarted = false;
      }
      if (error.code === "ER_ROW_IS_REFERENCED_2") {
        return res.status(409).json({
          error: "No se puede eliminar el usuario porque tiene registros relacionados que deben conservarse",
        });
      }
      return next(error);
    } finally {
      if (connection) connection.release();
    }
  },
);

app.post("/api/users", (_req, res) => {
  res.status(410).json({
    error: "El registro público fue retirado. Estudiantes y tutores deben validar su identidad institucional con Microsoft.",
  });
});

app.get("/api/tutors", requireAuthentication, requireRoles("alumno"), async (req, res, next) => {
  try {
    await requireDatabase();
    const subject = typeof req.query.subject === "string" ? req.query.subject.trim() : "";

    const query = `
      SELECT
        tp.user_id AS id,
        CONCAT(tp.first_name, ' ', tp.last_name) AS name,
        GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS subject,
        tp.experience,
        COALESCE(ROUND(AVG(tr.rating), 1), 0) AS rating,
        tp.bio,
        tp.is_available
      FROM tutor_profiles tp
      INNER JOIN users u ON u.id = tp.user_id
      INNER JOIN careers c ON c.id = tp.career_id AND c.is_active = TRUE
      INNER JOIN tutor_subjects ts ON ts.tutor_id = tp.user_id
      INNER JOIN subjects s ON s.id = ts.subject_id
      INNER JOIN career_subjects cs
        ON cs.career_id = tp.career_id
       AND cs.subject_id = ts.subject_id
       AND cs.semester_number <= tp.current_semester
      LEFT JOIN tutor_ratings tr ON tr.tutor_id = tp.user_id
      WHERE tp.is_available = 1
        AND tp.application_status = 'approved'
        AND u.account_status = 'approved'
        ${subject ? "AND s.name LIKE ?" : ""}
      GROUP BY tp.user_id, tp.first_name, tp.last_name, tp.experience,
        tp.bio, tp.is_available
      ORDER BY rating DESC, name ASC`;
    const [rows] = await pool.query(query, subject ? [`%${subject}%`] : []);
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.get("/api/tutors/:id", requireAuthentication, requireRoles("alumno"), async (req, res, next) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ error: "El id debe ser un entero positivo" });
  }

  try {
    await requireDatabase();

    const [rows] = await pool.query(
      `SELECT
         tp.user_id AS id,
         CONCAT(tp.first_name, ' ', tp.last_name) AS name,
         GROUP_CONCAT(DISTINCT s.name ORDER BY s.name SEPARATOR ', ') AS subject,
         tp.experience,
         COALESCE(ROUND(AVG(tr.rating), 1), 0) AS rating,
         tp.bio,
         tp.is_available
       FROM tutor_profiles tp
       INNER JOIN users u ON u.id = tp.user_id
       INNER JOIN careers c ON c.id = tp.career_id AND c.is_active = TRUE
       INNER JOIN tutor_subjects ts ON ts.tutor_id = tp.user_id
       INNER JOIN subjects s ON s.id = ts.subject_id
       INNER JOIN career_subjects cs
         ON cs.career_id = tp.career_id
        AND cs.subject_id = ts.subject_id
        AND cs.semester_number <= tp.current_semester
       LEFT JOIN tutor_ratings tr ON tr.tutor_id = tp.user_id
       WHERE tp.user_id = ?
         AND tp.is_available = 1
         AND tp.application_status = 'approved'
         AND u.account_status = 'approved'
       GROUP BY tp.user_id, tp.first_name, tp.last_name, tp.experience,
         tp.bio, tp.is_available`,
      [id],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "Tutor no encontrado" });
    }

    res.json(rows[0]);
  } catch (error) {
    next(error);
  }
});

app.use(
  "/api/tutor-management",
  createTutorManagementRouter({ pool, requireAuthentication, requireRoles }),
);

app.use((error, req, res, next) => {
  console.error(error);
  const status = Number.isInteger(error.status) ? error.status : 500;
  res.status(status).json({
    error: error.publicMessage || (status === 503
      ? "MySQL no está disponible; los datos no se guardaron."
      : "Error interno del servidor"),
  });
});

const PORT = process.env.PORT || 8000;

prepareDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend ejecutándose en http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("No se pudo iniciar el backend:", error.message);
    pool.end().finally(() => {
      process.exitCode = 1;
    });
  });
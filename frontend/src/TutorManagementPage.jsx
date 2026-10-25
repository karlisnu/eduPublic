import { useCallback, useEffect, useMemo, useState } from "react";
import { API_URL, requestApi } from "./api.js";

const weekdays = [
  { id: 1, label: "Lunes" },
  { id: 2, label: "Martes" },
  { id: 3, label: "Miércoles" },
  { id: 4, label: "Jueves" },
  { id: 5, label: "Viernes" },
];
const hours = Array.from({ length: 13 }, (_, index) => index + 7);
const sessionLabels = {
  pending: "Pendiente de programación",
  scheduled: "Programada",
  completed: "Completada",
  cancelled: "Cancelada",
};

function localDateString(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function mondayOf(date) {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDateString(monday);
}

function shiftWeek(weekStart, offset) {
  const date = new Date(`${weekStart}T12:00:00`);
  date.setDate(date.getDate() + offset * 7);
  return localDateString(date);
}

function formatWeek(weekStart) {
  const monday = new Date(`${weekStart}T12:00:00`);
  const friday = new Date(monday);
  friday.setDate(friday.getDate() + 4);
  return `${monday.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} – ${friday.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" })}`;
}

function formatHour(hour) {
  return `${hour % 12 || 12}:00 ${hour < 12 ? "a. m." : "p. m."}`;
}

function TutorManagementPage({ onSessionExpired }) {
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [week, setWeek] = useState(null);
  const [draftSlots, setDraftSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [dayFilter, setDayFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [scheduleChoices, setScheduleChoices] = useState({});

  const loadWeek = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await requestApi(
        `${API_URL}/api/tutor-management/week?weekStart=${encodeURIComponent(weekStart)}`,
        { credentials: "include" },
      );
      setWeek(data);
      setDraftSlots(data.availability);
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired(requestError.message);
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [onSessionExpired, weekStart]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  const occupied = useMemo(() => new Set(
    (week?.students || [])
      .filter((student) => student.sessionStatus && student.sessionStatus !== "cancelled")
      .map((student) => `${student.weekday}:${student.startHour}`),
  ), [week]);
  const acceptedCount = week?.acceptedCount ?? 0;
  const pendingCount = week?.requests.length ?? 0;

  const toggleSlot = (weekday, startHour) => {
    const key = `${weekday}:${startHour}`;
    if (occupied.has(key)) return;
    setDraftSlots((current) => current.some((slot) => `${slot.weekday}:${slot.startHour}` === key)
      ? current.filter((slot) => `${slot.weekday}:${slot.startHour}` !== key)
      : [...current, { weekday, startHour }]);
    setNotice("");
  };

  const saveAvailability = async () => {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await requestApi(`${API_URL}/api/tutor-management/availability`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStart, slots: draftSlots }),
      });
      setNotice("Disponibilidad guardada para esta semana.");
      await loadWeek();
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired(requestError.message);
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const decideRequest = async (requestId, decision) => {
    setError("");
    setNotice("");
    try {
      await requestApi(`${API_URL}/api/tutor-management/requests/${requestId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      setNotice(decision === "accepted" ? "Alumno aceptado para esta semana." : "Solicitud rechazada.");
      await loadWeek();
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired(requestError.message);
      setError(requestError.message);
    }
  };

  const scheduleStudent = async (student, selectedSlot) => {
    if (!selectedSlot) return;
    const [weekday, startHour] = selectedSlot.split(":").map(Number);
    setError("");
    setNotice("");
    try {
      await requestApi(
        `${API_URL}/api/tutor-management/students/${student.id}/schedule`,
        {
          method: "PUT",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ weekStart, weekday, startHour }),
        },
      );
      setNotice("Tutoría programada.");
      setScheduleChoices((current) => ({ ...current, [student.id]: "" }));
      await loadWeek();
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired(requestError.message);
      setError(requestError.message);
    }
  };

  const updateSessionStatus = async (sessionId, status) => {
    setError("");
    setNotice("");
    try {
      await requestApi(`${API_URL}/api/tutor-management/sessions/${sessionId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      setNotice(status === "completed" ? "Tutoría marcada como completada." : "Tutoría cancelada.");
      await loadWeek();
    } catch (requestError) {
      if (requestError.status === 401) onSessionExpired(requestError.message);
      setError(requestError.message);
    }
  };

  const filteredStudents = (week?.students || []).filter((student) =>
    (!subjectFilter || student.subject === subjectFilter) &&
    (!dayFilter || String(student.weekday || "") === dayFilter) &&
    (!statusFilter || (student.sessionStatus || "pending") === statusFilter));
  const subjectOptions = [...new Set((week?.students || []).map((student) => student.subject))];
  const slotOptions = draftSlots
    .filter((slot) => !occupied.has(`${slot.weekday}:${slot.startHour}`))
    .sort((a, b) => a.weekday - b.weekday || a.startHour - b.startHour);

  return (
    <section className="tutor-management">
      <div className="tutor-page-heading">
        <div>
          <p className="eyebrow">Panel del tutor</p>
          <h1>Gestión semanal</h1>
          <p>Organiza tus horarios y acompaña a tus alumnos durante la semana.</p>
        </div>
        <div className="week-switcher">
          <button type="button" aria-label="Semana anterior" onClick={() => setWeekStart((value) => shiftWeek(value, -1))}>←</button>
          <strong>{formatWeek(weekStart)}</strong>
          <button type="button" aria-label="Semana siguiente" onClick={() => setWeekStart((value) => shiftWeek(value, 1))}>→</button>
        </div>
      </div>

      {error && <p className="management-alert error" role="alert">{error}</p>}
      {notice && <p className="management-alert success" role="status">{notice}</p>}

      <div className="tutor-stats">
        <article><span>Alumnos aceptados</span><strong>{acceptedCount} <small>/ 15</small></strong></article>
        <article><span>Lugares disponibles</span><strong>{Math.max(15 - acceptedCount, 0)}</strong></article>
        <article><span>Solicitudes pendientes</span><strong>{pendingCount}</strong></article>
      </div>

      <section className="management-section">
        <div className="section-heading">
          <div><p className="eyebrow">Disponibilidad</p><h2>Configura tu semana</h2></div>
          <button className="management-primary" type="button" disabled={saving || loading} onClick={saveAvailability}>
            {saving ? "Guardando..." : "Guardar disponibilidad"}
          </button>
        </div>
        <p className="management-hint">Selecciona bloques de una hora de lunes a viernes. Los horarios ocupados no se pueden modificar.</p>
        <div className="calendar-legend">
          <span><i className="legend-dot selected" /> Disponible</span>
          <span><i className="legend-dot occupied" /> Ocupado</span>
          <span><i className="legend-dot" /> Sin seleccionar</span>
        </div>
        {loading ? <p className="message">Cargando calendario...</p> : (
          <div className="availability-calendar">
            <div className="calendar-corner">Hora</div>
            {weekdays.map((day) => <div className="calendar-day" key={day.id}>{day.label}</div>)}
            {hours.flatMap((hour) => [
              <div className="calendar-hour" key={`hour-${hour}`}>{formatHour(hour)}</div>,
              ...weekdays.map((day) => {
                const key = `${day.id}:${hour}`;
                const isOccupied = occupied.has(key);
                const isSelected = draftSlots.some((slot) => `${slot.weekday}:${slot.startHour}` === key);
                return (
                  <button
                    className={`calendar-slot${isOccupied ? " is-occupied" : isSelected ? " is-selected" : ""}`}
                    type="button"
                    key={key}
                    aria-label={`${day.label} ${formatHour(hour)}: ${isOccupied ? "ocupado" : isSelected ? "disponible" : "sin seleccionar"}`}
                    aria-pressed={isSelected}
                    disabled={isOccupied}
                    onClick={() => toggleSlot(day.id, hour)}
                  >
                    <span aria-hidden="true">{isOccupied ? "●" : isSelected ? "✓" : "↗"}</span>
                  </button>
                );
              }),
            ])}
          </div>
        )}
      </section>

      <section className="management-section">
        <div className="section-heading"><div><p className="eyebrow">Revisa y decide</p><h2>Solicitudes de tutoría</h2></div></div>
        {pendingCount === 0 && !loading && <p className="management-empty">No hay solicitudes pendientes para esta semana.</p>}
        <div className="management-card-grid">
          {(week?.requests || []).map((request) => (
            <article className="management-card" key={request.id}>
              <div className="management-card-top"><span className="status-pill pending">Pendiente</span><time>{new Date(request.submittedAt).toLocaleDateString("es-MX")}</time></div>
              <h3>{request.studentName}</h3>
              <p className="subject">{request.subject}</p>
              <p>{request.topic}</p>
              <div className="management-card-meta">
                <span>Turno {request.schoolShift}</span>
                <span>{request.preferredWeekday
                  ? `${weekdays[request.preferredWeekday - 1].label}, ${formatHour(request.preferredStartHour)}`
                  : "Horario flexible"}</span>
              </div>
              <div className="management-actions">
                <button className="management-primary" type="button" disabled={acceptedCount >= 15} onClick={() => decideRequest(request.id, "accepted")}>Aceptar alumno</button>
                <button className="management-secondary danger" type="button" onClick={() => decideRequest(request.id, "rejected")}>Rechazar</button>
              </div>
              {acceptedCount >= 15 && <p className="management-hint">Ya alcanzaste el límite semanal de 15 alumnos.</p>}
            </article>
          ))}
        </div>
      </section>

      <section className="management-section">
        <div className="section-heading"><div><p className="eyebrow">Tu roster semanal</p><h2>Mis alumnos de esta semana</h2></div></div>
        <div className="management-filters">
          <label>Materia<select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value)}><option value="">Todas</option>{subjectOptions.map((subject) => <option key={subject}>{subject}</option>)}</select></label>
          <label>Día<select value={dayFilter} onChange={(event) => setDayFilter(event.target.value)}><option value="">Todos</option>{weekdays.map((day) => <option key={day.id} value={day.id}>{day.label}</option>)}</select></label>
          <label>Estado<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="">Todos</option>{Object.entries(sessionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        {!loading && filteredStudents.length === 0 && <p className="management-empty">No hay alumnos que coincidan con estos filtros.</p>}
        <div className="management-card-grid">
          {filteredStudents.map((student) => {
            const status = student.sessionStatus || "pending";
            const selectedChoice = scheduleChoices[student.id] || "";
            const compatibleSlots = slotOptions.filter((slot) =>
              (!student.preferredWeekday || student.preferredWeekday === slot.weekday) &&
              (!student.preferredStartHour || student.preferredStartHour === slot.startHour));
            return (
              <article className="management-card" key={student.id}>
                <div className="management-card-top"><span className={`status-pill ${status}`}>{sessionLabels[status]}</span></div>
                <h3>{student.studentName}</h3>
                <p className="subject">{student.subject}</p>
                <p>{student.topic}</p>
                <div className="management-card-meta">
                  <span>Turno {student.schoolShift}</span>
                  {student.weekday && <span>{weekdays[student.weekday - 1].label}, {formatHour(student.startHour)}</span>}
                </div>
                {(status === "pending" || status === "cancelled") && (
                  <div className="schedule-controls">
                    <select aria-label={`Horario para ${student.studentName}`} value={selectedChoice} onChange={(event) => setScheduleChoices((current) => ({ ...current, [student.id]: event.target.value }))}>
                      <option value="">Seleccionar horario disponible</option>
                      {compatibleSlots.map((slot) => {
                        const value = `${slot.weekday}:${slot.startHour}`;
                        return <option key={value} value={value}>{weekdays[slot.weekday - 1].label}, {formatHour(slot.startHour)}</option>;
                      })}
                    </select>
                    <button className="management-primary" type="button" disabled={!selectedChoice} onClick={() => scheduleStudent(student, selectedChoice)}>Programar tutoría</button>
                  </div>
                )}
                {status === "scheduled" && (
                  <div className="management-actions">
                    <button className="management-primary" type="button" onClick={() => updateSessionStatus(student.sessionId, "completed")}>Marcar completada</button>
                    <button className="management-secondary danger" type="button" onClick={() => updateSessionStatus(student.sessionId, "cancelled")}>Cancelar</button>
                  </div>
                )}
                {status === "cancelled" && <p className="management-hint">La tutoría se canceló; puedes asignar otro horario disponible.</p>}
              </article>
            );
          })}
        </div>
      </section>
    </section>
  );
}

export default TutorManagementPage;

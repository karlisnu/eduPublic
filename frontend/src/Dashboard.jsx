import { useEffect, useState } from "react";
import { API_URL, HTTP_STATUS, requestApi } from "./api/api.js";
import TutorManagementPage from "./TutorManagementPage.jsx";
import {
  startTutorAvailabilitySync,
  useTutorAvailabilityStore,
} from "./store/tutorAvailabilityStore.js";
import { useTutorsStore } from "./store/tutorsStore.js";
import TutorResultsCount from "./TutorResultsCount.jsx";

function getCurrentWeekStart() {
  const today = new Date();
  today.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
}

function Dashboard({ user, authError, onLogout, onSessionExpired }) {
  const [subject, setSubject] = useState("");
  const tutors = useTutorsStore((store) => store.items);
  const loadingTutors = useTutorsStore((store) => store.loading);
  const tutorsError = useTutorsStore((store) => store.error);
  const fetchTutors = useTutorsStore((store) => store.fetchAll);
  const [approvals, setApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState("");
  const [requestTutor, setRequestTutor] = useState(null);
  const [requestSubject, setRequestSubject] = useState("");
  const [requestTopic, setRequestTopic] = useState("");
  const [requestShift, setRequestShift] = useState("matutino");
  const [requestWeekday, setRequestWeekday] = useState("");
  const [requestHour, setRequestHour] = useState("");
  const [requestWeekStart, setRequestWeekStart] = useState(getCurrentWeekStart);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const availability = useTutorAvailabilityStore((store) => store.slots);
  const availabilityTutorId = useTutorAvailabilityStore((store) => store.tutorId);
  const availabilityWeekStart = useTutorAvailabilityStore((store) => store.weekStart);
  const availabilityLoading = useTutorAvailabilityStore((store) => store.loading);
  const availabilityError = useTutorAvailabilityStore((store) => store.error);

  useEffect(() => {
    if (!requestTutor) return undefined;
    return startTutorAvailabilitySync(requestTutor.id, requestWeekStart);
  }, [requestTutor?.id, requestWeekStart]);

  const tutorAvailability = availabilityTutorId === requestTutor?.id &&
    availabilityWeekStart === requestWeekStart ? availability : [];
  const availableDays = [...new Set(tutorAvailability.map((slot) => slot.weekday))];
  const availableHours = tutorAvailability
    .filter((slot) => String(slot.weekday) === requestWeekday)
    .map((slot) => slot.startHour);

  useEffect(() => {
    if (requestWeekday && !tutorAvailability.some((slot) =>
      slot.weekday === Number(requestWeekday) && slot.startHour === Number(requestHour))) {
      setRequestWeekday("");
      setRequestHour("");
    }
  }, [requestHour, requestWeekday, tutorAvailability]);

  useEffect(() => {
    if (user.role !== "alumno") return undefined;

    const controller = new AbortController();
    fetchTutors(subject, controller.signal).catch((requestError) => {
      if (requestError.status === HTTP_STATUS.UNAUTHORIZED) {
        onSessionExpired(requestError.message);
      }
    });

    return () => controller.abort();
  }, [fetchTutors, onSessionExpired, subject, user.role]);

  useEffect(() => {
    if (user.role !== "admin") return undefined;

    const controller = new AbortController();
    setApprovalsLoading(true);
    setApprovalsError("");
    requestApi(`${API_URL}/api/admin/approvals/pending`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(({ data }) => setApprovals(data))
      .catch((requestError) => {
        if (requestError.status === HTTP_STATUS.UNAUTHORIZED) {
          onSessionExpired(requestError.message);
        }
        if (requestError.name !== "AbortError") setApprovalsError(requestError.message);
      })
      .finally(() => setApprovalsLoading(false));

    return () => controller.abort();
  }, [onSessionExpired, user.role]);

  const handleApproval = async (userId, decision) => {
    setApprovalsError("");
    try {
      await requestApi(`${API_URL}/api/admin/users/${userId}/approval`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      setApprovals((current) => current.filter((item) => item.id !== userId));
    } catch (requestError) {
      if (requestError.status === HTTP_STATUS.UNAUTHORIZED) {
        onSessionExpired(requestError.message);
      }
      setApprovalsError(requestError.message);
    }
  };

  const submitTutorRequest = async (event) => {
    event.preventDefault();
    setRequestError("");
    setRequestMessage("");
    if (!requestTutor || !requestSubject || requestTopic.trim().length === 0) {
      setRequestError("Describe brevemente el tema en el que necesitas ayuda.");
      return;
    }
    if (Boolean(requestWeekday) !== Boolean(requestHour)) {
      setRequestError("Selecciona el día y la hora preferidos, o déjalos ambos vacíos.");
      return;
    }

    setSubmittingRequest(true);
    try {
      await requestApi(`${API_URL}/api/tutor-management/requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: requestTutor.id,
          subject: requestSubject,
          topic: requestTopic.trim(),
          schoolShift: requestShift,
          weekStart: requestWeekStart,
          preferredWeekday: requestWeekday ? Number(requestWeekday) : null,
          preferredStartHour: requestHour ? Number(requestHour) : null,
        }),
      });
      setRequestTutor(null);
      setRequestTopic("");
      setRequestWeekday("");
      setRequestHour("");
      setRequestMessage("Solicitud enviada. El tutor debe confirmarla para que la tutoría quede programada.");
    } catch (requestFailure) {
      if (requestFailure.status === HTTP_STATUS.UNAUTHORIZED) {
        onSessionExpired(requestFailure.message);
      }
      setRequestError(requestFailure.message);
    } finally {
      setSubmittingRequest(false);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">Edu<span>Match</span></a>
        <div className="user-bar">
          <span>{user.username}</span>
          <button type="button" className="logout-button" onClick={onLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {authError && <p className="message error">{authError}</p>}
      {user.role === "admin" ? (
        <section className="admin-panel">
          <p className="eyebrow">Administración</p>
          <h1>Solicitudes pendientes</h1>
          <p className="message">
            Verifica la documentación de cada cuenta antes de aprobarla. La aprobación no verifica
            automáticamente la matrícula.
          </p>
          {approvalsLoading && <p className="message">Cargando solicitudes...</p>}
          {approvalsError && <p className="message error">{approvalsError}</p>}
          {!approvalsLoading && !approvalsError && approvals.length === 0 &&
            <p className="message">No hay solicitudes pendientes.</p>}
          <div className="approval-list">
            {approvals.map((item) => (
              <article className="approval-card" key={item.id}>
                <div>
                  <h2>{item.username}</h2>
                  <p>{item.email}</p>
                  <span>{item.role === "alumno" ? "Estudiante" : "Tutor"}</span>
                  {item.role === "tutor" && (
                    <div className="approval-academic-data">
                      <p>Nombre: {item.first_name} {item.last_name}</p>
                      <p>Matrícula: {item.login_identifier}</p>
                      <p>Carrera: {item.career || "Sin carrera registrada"}</p>
                      <p>Semestre actual: {item.current_semester || "Sin dato"}</p>
                      <p>Promedio: {item.average ?? "Sin dato"}</p>
                      <p>Materias: {item.subjects || "Sin materias registradas"}</p>
                    </div>
                  )}
                  {item.role === "alumno" && (
                    <div className="approval-academic-data">
                      <p>Nombre: {item.first_name} {item.last_name}</p>
                      <p>Matrícula: {item.student_number || item.login_identifier}</p>
                      <p>Carrera: {item.career || "Sin carrera registrada"}</p>
                      <p>Campus: {item.campus || "Sin campus registrado"}</p>
                      <p>Teléfono: {item.phone || "Sin teléfono registrado"}</p>
                      <p>Verificación de matrícula: {item.student_number_verification_status || "pendiente"}</p>
                    </div>
                  )}
                </div>
                <div className="approval-actions">
                  <button type="button" onClick={() => handleApproval(item.id, "approved")}>Aprobar</button>
                  <button type="button" onClick={() => handleApproval(item.id, "rejected")}>Rechazar</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : user.role === "tutor" ? (
        <TutorManagementPage onSessionExpired={onSessionExpired} />
      ) : (
        <>
          <section className="hero">
            <p className="eyebrow">Aprendizaje que encuentra su ritmo</p>
            <h1>Encuentra un tutor para avanzar hoy.</h1>
            <p className="intro">Busca apoyo académico por materia y conecta con perfiles disponibles.</p>
            <label className="search-box">
              <span>Materia</span>
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Ej. Matemáticas"
                type="search"
              />
            </label>
          </section>

          <section className="results" aria-live="polite">
            {requestMessage && <p className="management-alert success" role="status">{requestMessage}</p>}
            {requestError && <p className="management-alert error" role="alert">{requestError}</p>}
            <div className="section-heading">
              <div>
                <p className="eyebrow">Resultados</p>
                <h2>Tutores disponibles</h2>
              </div>
              <TutorResultsCount />
            </div>

            {loadingTutors && <p className="message">Cargando tutores...</p>}
            {tutorsError && <p className="message error">{tutorsError}. Verifica que la API esté ejecutándose en el puerto 8000.</p>}
            {!loadingTutors && !tutorsError && tutors.length === 0 &&
              <p className="message">No encontramos tutores para esa materia.</p>}

            <div className="tutor-grid">
              {tutors.map((tutor) => (
                <article className="tutor-card" key={tutor.id}>
                  <div className="avatar">{tutor.name.charAt(0)}</div>
                  <div>
                    <h3>{tutor.name}</h3>
                    <p className="subject">{tutor.subject}</p>
                    <p>{tutor.bio || tutor.experience}</p>
                    <div className="card-footer">
                      <span>★ {tutor.rating}</span>
                      <span>{tutor.is_available ? "Disponible" : "No disponible"}</span>
                    </div>
                    {tutor.is_available && (
                      <button
                        className="management-primary request-tutor-button"
                        type="button"
                        onClick={() => {
                          setRequestError("");
                          if (requestTutor?.id === tutor.id) {
                            setRequestTutor(null);
                          } else {
                            const tutorSubjects = tutor.subject.split(", ");
                            setRequestTutor(tutor);
                            setRequestWeekStart(getCurrentWeekStart());
                            setRequestWeekday("");
                            setRequestHour("");
                            setRequestSubject(tutorSubjects.includes(subject.trim())
                              ? subject.trim()
                              : tutorSubjects[0]);
                          }
                        }}
                      >
                        Solicitar tutoría
                      </button>
                    )}
                    {requestTutor?.id === tutor.id && (
                      <form className="tutor-request-form" onSubmit={submitTutorRequest}>
                        <label>Materia
                          <select value={requestSubject} onChange={(event) => setRequestSubject(event.target.value)}>
                            {requestTutor.subject.split(", ").map((tutorSubject) => (
                              <option key={tutorSubject} value={tutorSubject}>{tutorSubject}</option>
                            ))}
                          </select>
                        </label>
                        <label>¿Qué tema necesitas resolver?
                          <textarea className="dark-input" maxLength={500} required value={requestTopic} onChange={(event) => setRequestTopic(event.target.value)} />
                        </label>
                        <label>Turno escolar
                          <select value={requestShift} onChange={(event) => setRequestShift(event.target.value)}>
                            <option value="matutino">Matutino</option><option value="vespertino">Vespertino</option><option value="nocturno">Nocturno</option>
                          </select>
                        </label>
                        <p className="message" aria-live="polite">
                          {availabilityLoading
                            ? "Cargando los horarios disponibles..."
                            : availabilityError
                              ? `No se pudieron cargar los horarios: ${availabilityError}`
                              : tutorAvailability.length === 0
                                ? "Este tutor no tiene horarios libres publicados para esta semana."
                                : "Los horarios se actualizan automáticamente. La hora elegida es una preferencia; el tutor confirmará la tutoría."}
                        </p>
                        <label>Día preferido (opcional)
                          <select value={requestWeekday} onChange={(event) => { setRequestWeekday(event.target.value); setRequestHour(""); }}>
                            <option value="">Horario flexible</option>
                            {availableDays.map((day) => (
                              <option key={day} value={day}>
                                {["", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes"][day]}
                              </option>
                            ))}
                          </select>
                        </label>
                        {requestWeekday && <label>Hora preferida
                          <select required value={requestHour} onChange={(event) => setRequestHour(event.target.value)}>
                            <option value="">Selecciona una hora</option>
                            {availableHours.map((hour) => (
                              <option key={hour} value={hour}>{`${hour % 12 || 12}:00 ${hour < 12 ? "a. m." : "p. m."}`}</option>
                            ))}
                          </select>
                        </label>}
                        <button
                          className="management-primary"
                          type="submit"
                          disabled={submittingRequest || availabilityLoading || Boolean(availabilityError) || tutorAvailability.length === 0}
                        >
                          {submittingRequest ? "Enviando..." : "Enviar solicitud"}
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}

export default Dashboard;

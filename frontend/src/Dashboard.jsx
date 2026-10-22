import { useEffect, useState } from "react";
import { API_URL, readApiResponse } from "./api.js";
import TutorManagementPage from "./TutorManagementPage.jsx";

function Dashboard({ user, authError, onLogout, onSessionExpired }) {
  const [subject, setSubject] = useState("");
  const [tutors, setTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(true);
  const [tutorsError, setTutorsError] = useState("");
  const [approvals, setApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState("");
  const [requestTutor, setRequestTutor] = useState(null);
  const [requestSubject, setRequestSubject] = useState("");
  const [requestTopic, setRequestTopic] = useState("");
  const [requestShift, setRequestShift] = useState("matutino");
  const [requestWeekday, setRequestWeekday] = useState("");
  const [requestHour, setRequestHour] = useState("");
  const [requestMessage, setRequestMessage] = useState("");
  const [requestError, setRequestError] = useState("");
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    if (user.role !== "alumno") return undefined;

    const controller = new AbortController();
    const query = subject.trim() ? `?subject=${encodeURIComponent(subject.trim())}` : "";
    setLoadingTutors(true);
    setTutorsError("");
    fetch(`${API_URL}/api/tutors${query}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await readApiResponse(response);
        if (response.status === 401) {
          onSessionExpired("La sesión expiró. Inicia sesión nuevamente.");
        }
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar los tutores.");
        return data;
      })
      .then(setTutors)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setTutorsError(requestError.message);
      })
      .finally(() => setLoadingTutors(false));

    return () => controller.abort();
  }, [onSessionExpired, subject, user.role]);

  useEffect(() => {
    if (user.role !== "admin") return undefined;

    const controller = new AbortController();
    setApprovalsLoading(true);
    setApprovalsError("");
    fetch(`${API_URL}/api/admin/approvals/pending`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await readApiResponse(response);
        if (response.status === 401) {
          onSessionExpired("La sesión expiró. Inicia sesión nuevamente.");
        }
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar las solicitudes.");
        return data;
      })
      .then(setApprovals)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setApprovalsError(requestError.message);
      })
      .finally(() => setApprovalsLoading(false));

    return () => controller.abort();
  }, [onSessionExpired, user.role]);

  const handleApproval = async (userId, decision) => {
    setApprovalsError("");
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/approval`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      const data = await readApiResponse(response);
      if (response.status === 401) onSessionExpired("La sesión expiró. Inicia sesión nuevamente.");
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la decisión.");
      setApprovals((current) => current.filter((item) => item.id !== userId));
    } catch (requestError) {
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

    const today = new Date();
    today.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    const weekStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    setSubmittingRequest(true);
    try {
      const response = await fetch(`${API_URL}/api/tutor-management/requests`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tutorId: requestTutor.id,
          subject: requestSubject,
          topic: requestTopic.trim(),
          schoolShift: requestShift,
          weekStart,
          preferredWeekday: requestWeekday ? Number(requestWeekday) : null,
          preferredStartHour: requestHour ? Number(requestHour) : null,
        }),
      });
      const data = await readApiResponse(response);
      if (response.status === 401) onSessionExpired("La sesión expiró. Inicia sesión nuevamente.");
      if (!response.ok) throw new Error(data.error || "No se pudo enviar la solicitud.");
      setRequestTutor(null);
      setRequestTopic("");
      setRequestWeekday("");
      setRequestHour("");
      setRequestMessage("Solicitud enviada al tutor para esta semana.");
    } catch (requestFailure) {
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
              {!loadingTutors && <span className="result-count">{tutors.length} perfiles</span>}
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
                        <label>Día preferido (opcional)
                          <select value={requestWeekday} onChange={(event) => { setRequestWeekday(event.target.value); if (!event.target.value) setRequestHour(""); }}>
                            <option value="">Horario flexible</option><option value="1">Lunes</option><option value="2">Martes</option><option value="3">Miércoles</option><option value="4">Jueves</option><option value="5">Viernes</option>
                          </select>
                        </label>
                        {requestWeekday && <label>Hora preferida
                          <select required value={requestHour} onChange={(event) => setRequestHour(event.target.value)}>
                            <option value="">Selecciona una hora</option>
                            {Array.from({ length: 13 }, (_, index) => index + 7).map((hour) => (
                              <option key={hour} value={hour}>{`${hour % 12 || 12}:00 ${hour < 12 ? "a. m." : "p. m."}`}</option>
                            ))}
                          </select>
                        </label>}
                        <button className="management-primary" type="submit" disabled={submittingRequest}>{submittingRequest ? "Enviando..." : "Enviar solicitud"}</button>
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

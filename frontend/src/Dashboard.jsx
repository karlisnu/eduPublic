import { useEffect, useState } from "react";
import { API_URL, readApiResponse } from "./api.js";

function Dashboard({ user, authError, onLogout, onSessionExpired }) {
  const [subject, setSubject] = useState("");
  const [tutors, setTutors] = useState([]);
  const [loadingTutors, setLoadingTutors] = useState(true);
  const [tutorsError, setTutorsError] = useState("");
  const [approvals, setApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState("");

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
        <section className="admin-panel">
          <p className="eyebrow">Tutor</p>
          <h1>Sesión segura</h1>
          <p className="message">Tu cuenta está autenticada. El panel de gestión de estudiantes se integrará en este módulo.</p>
        </section>
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

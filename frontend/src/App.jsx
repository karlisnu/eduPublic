import { useEffect, useState } from "react";
import WelcomePage from "./WelcomePage.jsx";

const API_URL = import.meta.env.VITE_API_URL || "";

async function readApiResponse(response) {
  const body = await response.text();
  if (!body) return {};

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(
      `La API devolvió una respuesta no válida (HTTP ${response.status}). Verifica que el backend esté ejecutándose.`,
    );
  }
}

function App() {
  const [subject, setSubject] = useState("");
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("alumno");
  const [loginError, setLoginError] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [approvals, setApprovals] = useState([]);
  const [approvalsLoading, setApprovalsLoading] = useState(false);
  const [approvalsError, setApprovalsError] = useState("");

  useEffect(() => {
    fetch(`${API_URL}/api/session`, { credentials: "include" })
      .then(async (response) => {
        if (response.status === 401) return null;
        const data = await readApiResponse(response);
        if (!response.ok) throw new Error(data.error || "No se pudo restaurar la sesión");
        return data;
      })
      .then(setUser)
      .catch((requestError) => {
        setAuthError(requestError.message);
        setShowLogin(true);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role !== "alumno") return;

    const controller = new AbortController();
    const query = subject.trim() ? `?subject=${encodeURIComponent(subject.trim())}` : "";

    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/tutors${query}`, {
      credentials: "include",
      signal: controller.signal,
    })
      .then((response) => {
        if (response.status === 401) {
          setUser(null);
          setShowLogin(true);
          throw new Error("La sesión expiró. Inicia sesión nuevamente.");
        }
        if (!response.ok) throw new Error("No se pudieron cargar los tutores");
        return response.json();
      })
      .then(setTutors)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [subject, user]);

  useEffect(() => {
    if (user?.role !== "admin") return;

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
          setUser(null);
          setShowLogin(true);
        }
        if (!response.ok) throw new Error(data.error || "No se pudieron cargar las solicitudes");
        return data;
      })
      .then(setApprovals)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setApprovalsError(requestError.message);
      })
      .finally(() => setApprovalsLoading(false));

    return () => controller.abort();
  }, [user]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError("");

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: loginIdentifier, password, role: selectedRole }),
      });

      const data = await readApiResponse(response);
      if (!response.ok) {
        throw new Error(data.error || "No se pudo iniciar sesión");
      }

      if (selectedRole === "admin" && data.role !== "admin") {
        throw new Error("Selecciona el acceso que corresponde a tu usuario");
      }

      if (selectedRole === "alumno" && data.role !== "alumno") {
        throw new Error("Selecciona el acceso que corresponde a tu usuario");
      }

      if (selectedRole === "tutor" && data.role !== "tutor") {
        throw new Error("Selecciona el acceso que corresponde a tu usuario");
      }

      setUser(data);
      setPassword("");
      setAuthError("");
    } catch (requestError) {
      setLoginError(requestError.message);
    }
  };

  const handleLogout = async () => {
    setAuthError("");
    try {
      const response = await fetch(`${API_URL}/api/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) {
        const data = await readApiResponse(response);
        throw new Error(data.error || "No se pudo cerrar la sesión");
      }
      setUser(null);
      setLoginIdentifier("");
      setPassword("");
      setLoginError("");
      setSelectedRole("alumno");
      setShowLogin(false);
    } catch (requestError) {
      setAuthError(requestError.message);
    }
  };

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
      if (response.status === 401) {
        setUser(null);
        setShowLogin(true);
      }
      if (!response.ok) throw new Error(data.error || "No se pudo guardar la decisión");
      setApprovals((current) => current.filter((item) => item.id !== userId));
    } catch (requestError) {
      setApprovalsError(requestError.message);
    }
  };

  if (authLoading) {
    return <main className="login-page"><p className="message">Verificando sesión...</p></main>;
  }

  if (!user && !showLogin) {
    return <WelcomePage onLogin={() => setShowLogin(true)} />;
  }

  if (!user) {
    return (
      <main className="login-page">
        <div className="login-container">
          <div className="login-image">
            <div className="login-image-overlay" />
            <div className="login-image-text">
              <span className="mini-tag">Tutorías universitarias</span>
              <h2>Aprende con apoyo real.</h2>
            </div>
          </div>

          <div className="login-form-section">
            <div className="form-content">
              <button
                type="button"
                className="back-to-welcome"
                onClick={() => {
                  setShowLogin(false);
                  setLoginError("");
                }}
              >
                ← Volver al inicio
              </button>
              <div className="main-group">
                <h1>
                  INICIO DE <br /> SESIÓN
                </h1>

                <p className="question">¿A qué vienes?</p>

                <div className="role-selection">
                  <button
                    type="button"
                    className={selectedRole === "alumno" ? "role-btn active" : "role-btn"}
                    onClick={() => setSelectedRole("alumno")}
                  >
                    Estudiante
                  </button>
                  <button
                    type="button"
                    className={selectedRole === "tutor" ? "role-btn active" : "role-btn"}
                    onClick={() => setSelectedRole("tutor")}
                  >
                    Tutor
                  </button>
                  <button
                    type="button"
                    className={selectedRole === "admin" ? "role-btn active" : "role-btn"}
                    onClick={() => setSelectedRole("admin")}
                  >
                    Admin
                  </button>
                </div>

                <form onSubmit={handleLogin}>
                  <div className="input-group">
                    <label htmlFor="username">
                      {selectedRole === "alumno" ? "Matrícula escolar" : "Usuario o correo"}
                    </label>
                    <input
                      id="username"
                      className="dark-input"
                      type="text"
                      value={loginIdentifier}
                      onChange={(event) => setLoginIdentifier(event.target.value)}
                      autoComplete="username"
                      inputMode={selectedRole === "alumno" ? "numeric" : "text"}
                      placeholder={selectedRole === "alumno"
                        ? "Ingresa tu matrícula de 11 dígitos"
                        : "Ingresa tu usuario o correo"}
                      pattern={selectedRole === "alumno" ? "[0-9]{11}" : undefined}
                      maxLength={selectedRole === "alumno" ? 11 : undefined}
                      required
                    />
                  </div>

                  <div className="input-group">
                    <label htmlFor="password">Contraseña</label>
                    <input
                      id="password"
                      className="dark-input"
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />
                    <a href="#" className="forgot-password">¿Olvidaste tu contraseña?</a>
                  </div>

                  {loginError && <p className="login-error">{loginError}</p>}
                  {authError && <p className="login-error">{authError}</p>}

                  <button type="submit" className="btn-main-login">
                    LOG IN
                  </button>
                </form>
              </div>

              <div className="footer-login">
                <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/9/93/Google_Logo_%282015%29.svg/512px-Google_Logo_%282015%29.svg.png" alt="Logo Tutorías" className="mini-logo" />
                <p>
                  TUTORÍAS <br /> UNIVERSITARIAS
                </p>
                <a href="#" className="terms">Términos y condiciones de servicio</a>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">Edu<span>Match</span></a>
        <div className="user-bar">
          <span>{user.username}</span>
          <button type="button" className="logout-button" onClick={handleLogout}>
            Cerrar sesión
          </button>
        </div>
      </header>

      {authError && <p className="message error">{authError}</p>}
      {user.role === "admin" ? (
        <section className="admin-panel">
          <p className="eyebrow">Administración</p>
          <h1>Solicitudes pendientes</h1>
          <p className="message">Verifica la documentación de cada cuenta antes de aprobarla. La aprobación no verifica automáticamente la matrícula.</p>
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
              {!loading && <span className="result-count">{tutors.length} perfiles</span>}
            </div>

            {loading && <p className="message">Cargando tutores...</p>}
            {error && <p className="message error">{error}. Verifica que la API esté ejecutándose en el puerto 8000.</p>}
            {!loading && !error && tutors.length === 0 && <p className="message">No encontramos tutores para esa materia.</p>}

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

export default App;

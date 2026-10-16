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
  const [institutionalRegistration, setInstitutionalRegistration] = useState(false);
  const [institutionalRegistrationLoading, setInstitutionalRegistrationLoading] = useState(false);
  const [institutionalRegistrationError, setInstitutionalRegistrationError] = useState("");
  const [institutionalRegistrationEmail, setInstitutionalRegistrationEmail] = useState("");
  const [institutionalRegistrationComplete, setInstitutionalRegistrationComplete] = useState(false);
  const [institutionalCatalogs, setInstitutionalCatalogs] = useState({ careers: [], campuses: [] });
  const [institutionalProfile, setInstitutionalProfile] = useState({
    username: "",
    firstName: "",
    lastName: "",
    studentNumber: "",
    careerId: "",
    campusId: "",
    phone: "",
  });

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const status = query.get("institutional");
    const exchangeReason = query.get("reason");
    if (status === "register") {
      setInstitutionalRegistration(true);
      setInstitutionalRegistrationLoading(true);
      Promise.all([
        fetch(`${API_URL}/api/auth/microsoft/registration`, { credentials: "include" }),
        fetch(`${API_URL}/api/catalogs`),
      ])
        .then(async ([registrationResponse, catalogsResponse]) => {
          const registration = await readApiResponse(registrationResponse);
          const catalogs = await readApiResponse(catalogsResponse);
          if (!registrationResponse.ok) {
            throw new Error(registration.error || "La verificación institucional expiró; inicia sesión nuevamente.");
          }
          if (!catalogsResponse.ok) throw new Error(catalogs.error || "No se pudieron cargar las carreras y campus.");
          setInstitutionalRegistrationEmail(registration.email);
          setInstitutionalCatalogs(catalogs);
        })
        .catch((requestError) => setInstitutionalRegistrationError(requestError.message))
        .finally(() => setInstitutionalRegistrationLoading(false));
      return;
    }

    const statusMessages = {
      unavailable: "El inicio con cuenta institucional no está configurado todavía.",
      failed: "No se pudo completar el inicio de sesión institucional. Inténtalo de nuevo.",
      conflict: "La cuenta institucional no coincide con un perfil elegible de estudiante.",
      pending: "Tu cuenta está pendiente de aprobación. Recibirás acceso cuando un administrador la apruebe.",
      disabled: "La cuenta no está habilitada para iniciar sesión.",
      logout_first: "Cierra la sesión actual antes de iniciar con otra cuenta institucional.",
    };
    const exchangeMessages = {
      invalid_client: "Microsoft rechazó las credenciales de la aplicación. Verifica el Client ID y que el Client Secret sea el valor vigente, no su identificador.",
      invalid_grant: "Microsoft rechazó el código de acceso. Inicia un intento nuevo y confirma que la URI de redirección y PKCE coincidan.",
      unauthorized_client: "Microsoft no autorizó esta aplicación para ese flujo. Revisa el registro, tipo de cuenta y permisos en Entra.",
    };
    if (status === "exchange_failed") {
      setAuthError(exchangeMessages[exchangeReason] ||
        "Microsoft rechazó el intercambio del código. Consulta la terminal del backend para ver el código AADSTS.");
      setShowLogin(true);
    } else if (statusMessages[status]) {
      setAuthError(statusMessages[status]);
      setShowLogin(true);
    }
  }, []);

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

  const handleInstitutionalRegistration = async (event) => {
    event.preventDefault();
    setInstitutionalRegistrationError("");
    try {
      const response = await fetch(`${API_URL}/api/auth/microsoft/registration`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(institutionalProfile),
      });
      const data = await readApiResponse(response);
      if (!response.ok) throw new Error(data.error || "No se pudo completar el registro");
      setInstitutionalRegistrationComplete(true);
      window.history.replaceState({}, "", window.location.pathname);
    } catch (requestError) {
      setInstitutionalRegistrationError(requestError.message);
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

  if (!user && institutionalRegistration) {
    return (
      <main className="login-page">
        <section className="institutional-registration">
          {institutionalRegistrationComplete ? (
            <>
              <p className="eyebrow">Registro enviado</p>
              <h1>Tu cuenta está pendiente de aprobación.</h1>
              <p className="message">
                La verificación del correo institucional no valida automáticamente la matrícula.
                Un administrador revisará tu solicitud antes de habilitar el acceso.
              </p>
              <button
                type="button"
                className="btn-main-login"
                onClick={() => {
                  setInstitutionalRegistration(false);
                  setShowLogin(true);
                }}
              >
                VOLVER AL INICIO DE SESIÓN
              </button>
            </>
          ) : (
            <>
              <p className="eyebrow">Cuenta institucional verificada</p>
              <h1>Completa tu registro de estudiante</h1>
              <p className="message">Correo: <strong>{institutionalRegistrationEmail || "Cargando..."}</strong></p>
              {institutionalRegistrationError ? (
                <>
                  <p className="login-error">{institutionalRegistrationError}</p>
                  <button
                    type="button"
                    className="btn-main-login"
                    onClick={() => window.location.assign("/")}
                  >
                    VOLVER AL INICIO
                  </button>
                </>
              ) : institutionalRegistrationLoading ? (
                <p className="message">Cargando los catálogos institucionales...</p>
              ) : (
                <form onSubmit={handleInstitutionalRegistration}>
                  {(institutionalCatalogs.careers.length === 0 ||
                    institutionalCatalogs.campuses.length === 0) && (
                    <p className="login-error">
                      El catálogo oficial de carreras o campus no está disponible. Contacta a un administrador antes de continuar.
                    </p>
                  )}
                  <div className="input-group">
                    <label htmlFor="institutional-username">Usuario</label>
                    <input
                      id="institutional-username"
                      className="dark-input"
                      value={institutionalProfile.username}
                      onChange={(event) => setInstitutionalProfile({
                        ...institutionalProfile,
                        username: event.target.value,
                      })}
                      pattern="\p{L}+"
                      minLength={3}
                      maxLength={80}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="institutional-first-name">Nombre</label>
                    <input
                      id="institutional-first-name"
                      className="dark-input"
                      value={institutionalProfile.firstName}
                      onChange={(event) => setInstitutionalProfile({
                        ...institutionalProfile,
                        firstName: event.target.value,
                      })}
                      pattern="\p{L}+"
                      maxLength={80}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="institutional-last-name">Apellido</label>
                    <input
                      id="institutional-last-name"
                      className="dark-input"
                      value={institutionalProfile.lastName}
                      onChange={(event) => setInstitutionalProfile({
                        ...institutionalProfile,
                        lastName: event.target.value,
                      })}
                      pattern="\p{L}+"
                      maxLength={120}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="institutional-student-number">Matrícula (11 dígitos)</label>
                    <input
                      id="institutional-student-number"
                      className="dark-input"
                      inputMode="numeric"
                      pattern="[0-9]{11}"
                      maxLength={11}
                      value={institutionalProfile.studentNumber}
                      onChange={(event) => setInstitutionalProfile({
                        ...institutionalProfile,
                        studentNumber: event.target.value,
                      })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label htmlFor="institutional-career">Carrera</label>
                    <select
                      id="institutional-career"
                      className="dark-input"
                      value={institutionalProfile.careerId}
                      onChange={(event) => setInstitutionalProfile({
                        ...institutionalProfile,
                        careerId: event.target.value,
                      })}
                      required
                    >
                      <option value="">Selecciona tu carrera</option>
                      {institutionalCatalogs.careers.map((career) => (
                        <option key={career.id} value={career.id}>{career.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label htmlFor="institutional-campus">Campus</label>
                    <select
                      id="institutional-campus"
                      className="dark-input"
                      value={institutionalProfile.campusId}
                      onChange={(event) => setInstitutionalProfile({
                        ...institutionalProfile,
                        campusId: event.target.value,
                      })}
                      required
                    >
                      <option value="">Selecciona tu campus</option>
                      {institutionalCatalogs.campuses.map((campus) => (
                        <option key={campus.id} value={campus.id}>{campus.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label htmlFor="institutional-phone">Teléfono (11 dígitos)</label>
                    <input
                      id="institutional-phone"
                      className="dark-input"
                      inputMode="numeric"
                      pattern="[0-9]{11}"
                      maxLength={11}
                      value={institutionalProfile.phone}
                      onChange={(event) => setInstitutionalProfile({
                        ...institutionalProfile,
                        phone: event.target.value,
                      })}
                      required
                    />
                  </div>
                  {institutionalRegistrationError &&
                    <p className="login-error">{institutionalRegistrationError}</p>}
                  <button
                    type="submit"
                    className="btn-main-login"
                    disabled={!institutionalCatalogs.careers.length || !institutionalCatalogs.campuses.length}
                  >
                    ENVIAR SOLICITUD
                  </button>
                </form>
              )}
            </>
          )}
        </section>
      </main>
    );
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
                {selectedRole === "alumno" && (
                  <a className="microsoft-login-button" href={`${API_URL}/api/auth/microsoft`}>
                    Continuar con cuenta institucional UES
                  </a>
                )}
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

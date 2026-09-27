import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

function App() {
  const [subject, setSubject] = useState("");
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState("alumno");
  const [loginError, setLoginError] = useState("");
  const [user, setUser] = useState(() => {
    try {
      const storedUser = sessionStorage.getItem("edumatchUser");
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();
    const query = subject.trim() ? `?subject=${encodeURIComponent(subject.trim())}` : "";

    setLoading(true);
    setError("");
    fetch(`${API_URL}/api/tutors${query}`, { signal: controller.signal })
      .then((response) => {
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

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginError("");

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "No se pudo iniciar sesión");
      }

      if (selectedRole === "admin" && data.role !== "admin") {
        throw new Error("Selecciona el acceso que corresponde a tu usuario");
      }

      if (selectedRole === "alumno" && data.role !== "alumno") {
        throw new Error("Selecciona el acceso que corresponde a tu usuario");
      }

      sessionStorage.setItem("edumatchUser", JSON.stringify(data));
      setUser(data);
      setPassword("");
    } catch (requestError) {
      setLoginError(requestError.message);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem("edumatchUser");
    setUser(null);
    setUsername("");
    setPassword("");
    setLoginError("");
    setSelectedRole("alumno");
  };

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
                    className={selectedRole === "admin" ? "role-btn active" : "role-btn"}
                    onClick={() => setSelectedRole("admin")}
                  >
                    Admin
                  </button>
                </div>

                <form onSubmit={handleLogin}>
                  <div className="input-group">
                    <label htmlFor="username">Nombre de usuario</label>
                    <input
                      id="username"
                      className="dark-input"
                      type="text"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
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
    </main>
  );
}

export default App;

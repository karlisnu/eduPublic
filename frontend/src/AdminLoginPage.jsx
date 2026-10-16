import { useState } from "react";

function AdminLoginPage({ error, onLogin, onBack }) {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin({ identifier, password });
  };

  return (
    <main className="login-page">
      <section className="institutional-registration admin-login">
        <button type="button" className="back-to-welcome" onClick={onBack}>
          ← Volver al inicio
        </button>
        <p className="eyebrow">Acceso protegido</p>
        <h1>Administración</h1>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="admin-identifier">Usuario o correo administrativo</label>
            <input
              id="admin-identifier"
              className="dark-input"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="admin-password">Contraseña</label>
            <input
              id="admin-password"
              className="dark-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="btn-main-login">INICIAR SESIÓN</button>
        </form>
      </section>
    </main>
  );
}

export default AdminLoginPage;

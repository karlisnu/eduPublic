function LoginPage({
  selectedRole,
  onSelectRole,
  authError,
  institutionalLoginLoading,
  onInstitutionalLogin,
  onBackToWelcome,
}) {
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
            <button type="button" className="back-to-welcome" onClick={onBackToWelcome}>
              ← Volver al inicio
            </button>
            <div className="main-group">
              <h1>INICIO DE <br /> SESIÓN</h1>
              <p className="question">¿A qué vienes?</p>

              <div className="role-selection">
                <button
                  type="button"
                  className={selectedRole === "alumno" ? "role-btn active" : "role-btn"}
                  aria-pressed={selectedRole === "alumno"}
                  onClick={() => onSelectRole("alumno")}
                >
                  Estudiante
                </button>
                <button
                  type="button"
                  className={selectedRole === "tutor" ? "role-btn active" : "role-btn"}
                  aria-pressed={selectedRole === "tutor"}
                  onClick={() => onSelectRole("tutor")}
                >
                  Tutor
                </button>
              </div>

              {selectedRole === "alumno" ? (
                <>
                  <p className="message">
                    Inicia sesión con Microsoft. Si aún no tienes perfil, primero se vinculará tu
                    correo institucional y después podrás completar tus datos.
                  </p>
                  {authError && <p className="login-error" role="alert">{authError}</p>}
                  <button
                    type="button"
                    className="microsoft-login-button"
                    disabled={institutionalLoginLoading}
                    onClick={() => onInstitutionalLogin("alumno")}
                  >
                    {institutionalLoginLoading
                      ? "Conectando con EduMatch..."
                      : "Vincular correo institucional / continuar con Microsoft"}
                  </button>
                </>
              ) : (
                <>
                  <p className="message">
                    Inicia sesión con tu cuenta institucional. Microsoft valida la contraseña; EduMatch
                    no la recibe ni la almacena. La matrícula se asocia al perfil después de verificar
                    el correo.
                  </p>
                  {authError && <p className="login-error" role="alert">{authError}</p>}
                  <button
                    type="button"
                    className="microsoft-login-button"
                    disabled={institutionalLoginLoading}
                    onClick={() => onInstitutionalLogin("tutor")}
                  >
                    {institutionalLoginLoading
                      ? "Conectando con EduMatch..."
                      : "Iniciar sesión con Microsoft"}
                  </button>
                  <button
                    type="button"
                    className="tutor-create-account"
                    disabled={institutionalLoginLoading}
                    onClick={() => onInstitutionalLogin("tutor")}
                  >
                    {institutionalLoginLoading
                      ? "Conectando con EduMatch..."
                      : "Crear cuenta de tutor"}
                  </button>
                </>
              )}
            </div>

            <div className="footer-login">
              <p>TUTORÍAS <br /> UNIVERSITARIAS</p>
              <span className="terms">Acceso institucional seguro</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default LoginPage;

import { useEffect, useState } from "react";
import { API_URL, HTTP_STATUS, requestApi } from "./api.js";

const emptyProfile = {
  username: "",
  firstName: "",
  lastName: "",
  studentNumber: "",
  careerId: "",
  campusId: "",
  phone: "",
};

function StudentRegistrationPage({ onBackToLogin }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [email, setEmail] = useState("");
  const [careers, setCareers] = useState([]);
  const [campuses, setCampuses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      requestApi(`${API_URL}/api/auth/microsoft/registration`, {
        credentials: "include",
        signal: controller.signal,
      }),
      requestApi(`${API_URL}/api/catalogs`, { signal: controller.signal }),
    ])
      .then(([{ data: registration }, { data: catalogs }]) => {
        if (registration.role !== "alumno") {
          throw new Error("La verificación institucional no corresponde a un perfil de estudiante.");
        }
        setEmail(registration.email);
        setCareers(catalogs.careers);
        setCampuses(catalogs.campuses);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const updateProfile = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await requestApi(
        `${API_URL}/api/auth/microsoft/student-registration`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...profile,
            careerId: Number(profile.careerId),
            campusId: Number(profile.campusId),
          }),
        },
        { expectedStatus: HTTP_STATUS.CREATED },
      );
      setComplete(true);
      window.history.replaceState({}, "", window.location.pathname);
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <main className="login-page">
      <section className="institutional-registration">
        {complete ? (
          <>
            <p className="eyebrow">Perfil enviado</p>
            <h1>Tu cuenta está pendiente de aprobación.</h1>
            <p className="message">
              El correo institucional quedó vinculado. Un administrador revisará tus datos antes
              de habilitar el acceso. La matrícula no se verifica automáticamente.
            </p>
            <button type="button" className="btn-main-login" onClick={onBackToLogin}>
              VOLVER AL INICIO DE SESIÓN
            </button>
          </>
        ) : (
          <>
            <button type="button" className="back-to-welcome" onClick={onBackToLogin}>
              ← Volver al inicio de sesión
            </button>
            <p className="eyebrow">Registro de estudiante</p>
            <h1>Completa tu perfil</h1>
            <p className="message">
              Correo institucional verificado: <strong>{email || "Cargando..."}</strong>
            </p>
            <p className="message">
              La matrícula debe tener 11 dígitos. Su existencia se revisará durante la aprobación;
              no se puede confirmar automáticamente con los datos disponibles.
            </p>
            {loading ? (
              <p className="message">Cargando carreras y campus institucionales...</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="student-username">Nombre de usuario</label>
                  <input
                    id="student-username"
                    className="dark-input"
                    autoComplete="username"
                    value={profile.username}
                    onChange={(event) => updateProfile("username", event.target.value)}
                    pattern="\p{L}+"
                    minLength={3}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="student-first-name">Nombre(s)</label>
                  <input
                    id="student-first-name"
                    className="dark-input"
                    autoComplete="given-name"
                    value={profile.firstName}
                    onChange={(event) => updateProfile("firstName", event.target.value)}
                    pattern="\p{L}+"
                    maxLength={80}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="student-last-name">Apellido(s)</label>
                  <input
                    id="student-last-name"
                    className="dark-input"
                    autoComplete="family-name"
                    value={profile.lastName}
                    onChange={(event) => updateProfile("lastName", event.target.value)}
                    pattern="\p{L}+"
                    maxLength={120}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="student-number">Matrícula (11 dígitos)</label>
                  <input
                    id="student-number"
                    className="dark-input"
                    inputMode="numeric"
                    pattern="[0-9]{11}"
                    maxLength={11}
                    value={profile.studentNumber}
                    onChange={(event) => updateProfile("studentNumber", event.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="student-career">Carrera</label>
                  <select
                    id="student-career"
                    className="dark-input"
                    value={profile.careerId}
                    onChange={(event) => updateProfile("careerId", event.target.value)}
                    required
                  >
                    <option value="">Selecciona tu carrera</option>
                    {careers.map((career) => (
                      <option key={career.id} value={career.id}>{career.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="student-campus">Campus</label>
                  <select
                    id="student-campus"
                    className="dark-input"
                    value={profile.campusId}
                    onChange={(event) => updateProfile("campusId", event.target.value)}
                    required
                  >
                    <option value="">Selecciona tu campus</option>
                    {campuses.map((campus) => (
                      <option key={campus.id} value={campus.id}>{campus.name}</option>
                    ))}
                  </select>
                </div>
                <div className="input-group">
                  <label htmlFor="student-phone">Teléfono (11 dígitos, incluye lada)</label>
                  <input
                    id="student-phone"
                    className="dark-input"
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]{11}"
                    maxLength={11}
                    autoComplete="tel-national"
                    value={profile.phone}
                    onChange={(event) => updateProfile("phone", event.target.value)}
                    required
                  />
                </div>
                {careers.length === 0 && (
                  <p className="message">
                    No hay carreras activas en el catálogo. Contacta a la administración.
                  </p>
                )}
                {campuses.length === 0 && (
                  <p className="message">
                    No hay campus activos en el catálogo. Contacta a la administración.
                  </p>
                )}
                {error && <p className="login-error" role="alert">{error}</p>}
                <button
                  type="submit"
                  className="btn-main-login"
                  disabled={!email || !careers.length || !campuses.length}
                >
                  ENVIAR PERFIL PARA REVISIÓN
                </button>
              </form>
            )}
            {error && loading && <p className="login-error" role="alert">{error}</p>}
          </>
        )}
      </section>
    </main>
  );
}

export default StudentRegistrationPage;

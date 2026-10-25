import { useEffect, useState } from "react";
import { API_URL, requestApi } from "./api.js";

const emptyProfile = {
  username: "",
  firstName: "",
  lastName: "",
  studentNumber: "",
  careerId: "",
  currentSemester: "",
  average: "",
  subjectIds: [],
  bio: "",
  experience: "",
};

function TutorRegistrationPage({ onBackToLogin }) {
  const [profile, setProfile] = useState(emptyProfile);
  const [email, setEmail] = useState("");
  const [careers, setCareers] = useState([]);
  const [eligibleSubjects, setEligibleSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
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
        setEmail(registration.email);
        setCareers(catalogs.careers);
      })
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!profile.careerId || !profile.currentSemester) {
      setEligibleSubjects([]);
      return undefined;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      careerId: profile.careerId,
      currentSemester: profile.currentSemester,
    });
    setEligibleSubjects([]);
    setSubjectsLoading(true);
    setError("");
    requestApi(`${API_URL}/api/catalogs/tutor-subjects?${query}`, { signal: controller.signal })
      .then(({ data }) => data)
      .then(setEligibleSubjects)
      .catch((requestError) => {
        if (requestError.name !== "AbortError") setError(requestError.message);
      })
      .finally(() => setSubjectsLoading(false));

    return () => controller.abort();
  }, [profile.careerId, profile.currentSemester]);

  const updateProfile = (field, value) => {
    setProfile((current) => ({ ...current, [field]: value }));
  };

  const handleSubjectChange = (subjectId, checked) => {
    setProfile((current) => ({
      ...current,
      subjectIds: checked
        ? [...current.subjectIds, String(subjectId)]
        : current.subjectIds.filter((id) => id !== String(subjectId)),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    try {
      const { status } = await requestApi(`${API_URL}/api/auth/microsoft/registration`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...profile,
          careerId: Number(profile.careerId),
          currentSemester: Number(profile.currentSemester),
          average: Number(profile.average),
          subjectIds: profile.subjectIds.map(Number),
        }),
      });
      if (status !== 201) {
        throw new Error(`Se esperaba una respuesta HTTP 201 al registrar al tutor; se recibió HTTP ${status}.`);
      }
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
            <p className="eyebrow">Solicitud enviada</p>
            <h1>Tu cuenta está pendiente de aprobación.</h1>
            <p className="message">
              Un administrador revisará tu identidad académica, carrera, semestre, promedio y materias.
              Hasta que se apruebe la solicitud no tendrás acceso al panel de tutor.
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
            <p className="eyebrow">Registro de tutor</p>
            <h1>Completa tu perfil académico</h1>
            <p className="message">
              Correo institucional verificado: <strong>{email || "Cargando..."}</strong>
            </p>
            <p className="message">
              No hay una fuente académica conectada para precargar tus datos. Captúralos con exactitud;
              quedarán sujetos a revisión administrativa.
            </p>
            {loading ? (
              <p className="message">Cargando catálogos oficiales...</p>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="input-group">
                  <label htmlFor="tutor-username">Nombre de usuario</label>
                  <input
                    id="tutor-username"
                    className="dark-input"
                    value={profile.username}
                    onChange={(event) => updateProfile("username", event.target.value)}
                    pattern="\p{L}+"
                    minLength={3}
                    maxLength={80}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="tutor-first-name">Nombre(s)</label>
                  <input
                    id="tutor-first-name"
                    className="dark-input"
                    value={profile.firstName}
                    onChange={(event) => updateProfile("firstName", event.target.value)}
                    pattern="\p{L}+"
                    maxLength={80}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="tutor-last-name">Apellido(s)</label>
                  <input
                    id="tutor-last-name"
                    className="dark-input"
                    value={profile.lastName}
                    onChange={(event) => updateProfile("lastName", event.target.value)}
                    pattern="\p{L}+"
                    maxLength={120}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="tutor-student-number">Matrícula (11 dígitos)</label>
                  <input
                    id="tutor-student-number"
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
                  <label htmlFor="tutor-career">Carrera</label>
                  <select
                    id="tutor-career"
                    className="dark-input"
                    value={profile.careerId}
                    onChange={(event) => {
                      setProfile((current) => ({
                        ...current,
                        careerId: event.target.value,
                        subjectIds: [],
                      }));
                    }}
                    required
                  >
                    <option value="">Selecciona tu carrera</option>
                    {careers.map((career) => (
                      <option key={career.id} value={career.id}>{career.name}</option>
                    ))}
                  </select>
                  {careers.length === 0 && (
                    <p className="message">
                      No hay carreras oficiales activas disponibles. Contacta a la administración para
                      cargar el catálogo institucional.
                    </p>
                  )}
                </div>
                <div className="input-group">
                  <label htmlFor="tutor-semester">Semestre actual</label>
                  <input
                    id="tutor-semester"
                    className="dark-input"
                    type="number"
                    min="1"
                    step="1"
                    value={profile.currentSemester}
                    onChange={(event) => {
                      setProfile((current) => ({
                        ...current,
                        currentSemester: event.target.value,
                        subjectIds: [],
                      }));
                    }}
                    required
                  />
                </div>
                <fieldset className="subject-checklist">
                  <legend>Materias que puedes impartir</legend>
                  {subjectsLoading ? (
                    <p className="message">Consultando materias permitidas...</p>
                  ) : eligibleSubjects.length > 0 ? (
                    eligibleSubjects.map((subject) => (
                      <label className="subject-checkbox" key={subject.id}>
                        <input
                          type="checkbox"
                          checked={profile.subjectIds.includes(String(subject.id))}
                          onChange={(event) => handleSubjectChange(subject.id, event.target.checked)}
                        />
                        <span>{subject.name} <small>(semestre {subject.semesterNumber})</small></span>
                      </label>
                    ))
                  ) : (
                    <p className="message">
                      No hay materias elegibles cargadas para esta carrera y semestre. La selección
                      permanecerá bloqueada hasta que se incorpore el plan de estudios oficial.
                    </p>
                  )}
                </fieldset>
                <div className="input-group">
                  <label htmlFor="tutor-average">Promedio general (0 a 100)</label>
                  <input
                    id="tutor-average"
                    className="dark-input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={profile.average}
                    onChange={(event) => updateProfile("average", event.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="tutor-experience">Experiencia (máximo 100 caracteres)</label>
                  <input
                    id="tutor-experience"
                    className="dark-input"
                    maxLength={100}
                    value={profile.experience}
                    onChange={(event) => updateProfile("experience", event.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label htmlFor="tutor-bio">Descripción breve (opcional, máximo 100 caracteres)</label>
                  <textarea
                    id="tutor-bio"
                    className="dark-input"
                    maxLength={100}
                    value={profile.bio}
                    onChange={(event) => updateProfile("bio", event.target.value)}
                    rows={3}
                  />
                </div>
                {error && <p className="login-error" role="alert">{error}</p>}
                <button
                  type="submit"
                  className="btn-main-login"
                  disabled={!careers.length || !eligibleSubjects.length || !profile.subjectIds.length ||
                    !email || subjectsLoading}
                >
                  ENVIAR SOLICITUD DE TUTOR
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

export default TutorRegistrationPage;

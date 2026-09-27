import edumatchLogo from "../../imagenes/logo.jpg";
import classroomImage from "../../Imagenescosas/mesaestudio.jpg";
import tutorImage from "../../Imagenescosas/pexels-tima-miroshnichenko-9572688.jpg";
import firstStepImage from "../../Imagenescosas/annie-spratt-_dAnK9GJvdY-unsplash.jpg";
import secondStepImage from "../../Imagenescosas/kari-shea-apcUIqOPEIo-unsplash.jpg";
import thirdStepImage from "../../Imagenescosas/pexels-amaurymic-18189684.jpg";

const steps = [
  {
    title: "1. Primer paso",
    rating: "★★★★★",
    description: (
      <>
        <p>
          La inscripción como estudiante consta de 3 pasos. El primero es
          sencillo: escribe tu correo, matrícula estudiantil, institución
          educativa y una contraseña segura para proteger tus datos y el
          registro de tus asesorías.
        </p>
        <p>Asegúrate de que tus datos sean correctos para continuar con el registro.</p>
      </>
    ),
    note: "REGISTRO DE ESTUDIANTE · PASO 1 DE 3",
    image: firstStepImage,
    alt: "Aula universitaria",
    border: "welcome-border-orange",
  },
  {
    title: "2. Segundo paso",
    rating: "★★★★",
    description: (
      <>
        <p>
          Al terminar este paso, tus datos serán revisados para validar tu
          cuenta. Es importante que proporciones un correo institucional válido
          para recibir la confirmación.
        </p>
        <p>Mientras se valida tu registro, tu acceso permanecerá pendiente de aprobación.</p>
      </>
    ),
    note: "VALIDACIÓN DE CUENTA · PASO 2 DE 3",
    image: secondStepImage,
    alt: "Estudiante trabajando en su laptop",
    border: "welcome-border-bordo",
  },
  {
    title: "3. Tercer paso",
    rating: "★★★★★",
    description: (
      <>
        <p>
          Una vez validada tu cuenta, podrás acceder al portal, encontrar tutores
          por materia y comenzar a avanzar con acompañamiento académico.
        </p>
        <p>Explora las opciones disponibles y encuentra el apoyo adecuado para tus objetivos.</p>
      </>
    ),
    note: "ACCEDE AL PORTAL · PASO 3 DE 3",
    image: thirdStepImage,
    alt: "Libros y materiales para estudiar",
    border: "welcome-border-orange",
  },
];

function WelcomePage({ onLogin }) {
  return (
    <main className="welcome-page">
      <header className="welcome-header">
        <img className="welcome-logo" src={edumatchLogo} alt="EduMatch" />
        <nav className="welcome-nav" aria-label="Información">
          <span>¿Cómo ser un tutor?</span>
          <span>¿Cómo me inscribo?</span>
        </nav>
        <button
          type="button"
          className="welcome-login-button"
          onClick={onLogin}
        >
          LOG IN
        </button>
      </header>

      <div className="welcome-main">
        <section className="welcome-hero">
          <div className="welcome-hero-titles">
            <h1>Edu-Match</h1>
            <h2>ÚNETE Y FOMENTA<br />EL CONOCIMIENTO</h2>
          </div>
          <div className="welcome-photo">
            <img src={classroomImage} alt="Mesa de estudio preparada para aprender" />
          </div>
        </section>

        <div className="welcome-gradient-divider" aria-hidden="true" />

        <section className="welcome-tutors-section">
          <article className="welcome-tutor-card">
            <div className="welcome-tutor-text">
              <p className="welcome-eyebrow">Comunidad EduMatch</p>
              <h2>¿QUIERES SER UNO DE NUESTROS TUTORES?</h2>
              <p>
                Comparte lo que sabes y ayuda a otros a brillar, únete a nuestro
                equipo de tutores y transforma el aprendizaje en una experiencia
                compartida.
              </p>
              <span className="welcome-register-label">REGÍSTRATE</span>
            </div>
            <div className="welcome-tutor-image">
              <img src={tutorImage} alt="Estudiantes colaborando alrededor de una mesa" />
            </div>
          </article>
        </section>

        <section className="welcome-steps-slider" aria-label="Cómo me inscribo">
          <div className="welcome-steps-track">
            {steps.map((step) => (
              <article className="welcome-step-card" key={step.title}>
                <div className="welcome-step-content">
                  <h2>¿CÓMO ME INSCRIBO?</h2>
                  <h3>{step.title}</h3>
                  <div className="welcome-stars" aria-label={`${step.rating.length === 4 ? 4 : 5} de 5 estrellas`}>
                    {step.rating}
                    {step.rating.length === 4 && <span aria-hidden="true">★</span>}
                  </div>
                  {step.description}
                  <span className="welcome-step-note">{step.note}</span>
                  <span className={`welcome-step-login ${step.border === "welcome-border-bordo" ? "welcome-step-login-bordo" : ""}`}>
                    Inicio de sesión
                  </span>
                </div>
                <div className={`welcome-step-image ${step.border}`}>
                  <img src={step.image} alt={step.alt} />
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>

      <footer className="welcome-footer">
        <span className="welcome-footer-brand">EDU-MATCH</span>
        <span className="welcome-footer-tagline">ÚNETE Y FOMENTA EL CONOCIMIENTO</span>
        <div className="welcome-social-icons" aria-label="Redes sociales">
          <span aria-label="Facebook">f</span>
          <span aria-label="Teléfono">☎</span>
          <span aria-label="Contacto">✉</span>
          <span aria-label="Instagram">◎</span>
        </div>
      </footer>
    </main>
  );
}

export default WelcomePage;

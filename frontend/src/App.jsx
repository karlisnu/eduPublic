import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "";

function App() {
  const [subject, setSubject] = useState("");
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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
  }, [subject]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="/">Edu<span>Match</span></a>
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
                  <span>{tutor.availability}</span>
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

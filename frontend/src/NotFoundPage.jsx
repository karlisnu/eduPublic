function NotFoundPage() {
  return (
    <main className="login-page">
      <section className="not-found-page" aria-labelledby="not-found-title">
        <p className="eyebrow">Error 404</p>
        <h1 id="not-found-title">Página no encontrada</h1>
        <p className="message">La página que buscas no existe o fue movida.</p>
        <a className="btn-main-login" href="/">Volver al inicio</a>
      </section>
    </main>
  );
}

export default NotFoundPage;

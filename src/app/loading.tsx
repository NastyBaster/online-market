export default function Loading() {
  return (
    <main className="main" aria-busy="true" id="main-content" tabIndex={-1}>
      <section className="hero" aria-labelledby="loading-title">
        <div className="eyebrow">Storefront</div>
        <h1 id="loading-title">Loading branded storefront...</h1>
        <p>Preparing the configured shell and store identity.</p>
      </section>
    </main>
  );
}

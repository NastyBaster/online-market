"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="main" id="main-content" role="alert" tabIndex={-1}>
      <section className="catalog-intro" aria-labelledby="error-title">
        <div className="eyebrow">Catalog</div>
        <h1 id="error-title">Something went wrong</h1>
        <p>
          We could not load the demo catalog. Try requesting the typed demo data again.
        </p>
        <button className="retry-button" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}

export default function Loading() {
  return (
    <main className="main" aria-busy="true" id="main-content" tabIndex={-1}>
      <section className="catalog-intro" aria-labelledby="loading-title">
        <div className="eyebrow">Catalog</div>
        <h1 id="loading-title">Loading the demo catalog...</h1>
        <p>Preparing mapped products, formatted prices, and availability states.</p>
        <div className="catalog-grid" aria-hidden="true">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="catalog-card catalog-card-skeleton">
              <div className="catalog-image-wrap skeleton-block" />
              <div className="catalog-card-body">
                <div className="skeleton-line skeleton-line-short" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line-short" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

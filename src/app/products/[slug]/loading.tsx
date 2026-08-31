export default function Loading() {
  return (
    <main className="main" aria-busy="true" id="main-content" tabIndex={-1}>
      <section className="product-details" aria-labelledby="product-loading-title">
        <div className="back-link-placeholder skeleton-line skeleton-line-short" aria-hidden="true" />
        <div className="product-details-grid" aria-hidden="true">
          <div className="product-image-frame skeleton-block" />
          <div className="product-panel">
            <div className="eyebrow">Product</div>
            <h1 id="product-loading-title">Loading product details...</h1>
            <p className="product-summary">
              Preparing the mapped image, price, SKU, and availability details.
            </p>
            <div className="skeleton-line skeleton-line-short" />
            <div className="skeleton-line" />
            <div className="skeleton-line" />
          </div>
        </div>
      </section>
    </main>
  );
}

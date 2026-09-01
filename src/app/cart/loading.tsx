export default function Loading() {
  return (
    <main className="main" aria-busy="true" id="main-content" tabIndex={-1}>
      <section className="cart-page" aria-labelledby="cart-loading-title">
        <div className="eyebrow">Cart</div>
        <h1 id="cart-loading-title">Loading your cart...</h1>
        <p className="cart-copy">Preparing the latest inventory, pricing, and subtotal.</p>
        <div className="cart-layout" aria-hidden="true">
          <div className="cart-list">
            <div className="cart-line">
              <div className="cart-line-image-frame skeleton-block" />
              <div className="cart-line-body">
                <div className="skeleton-line skeleton-line-short" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line-short" />
              </div>
            </div>
          </div>
          <aside className="cart-summary">
            <div className="skeleton-line skeleton-line-short" />
            <div className="skeleton-line" />
          </aside>
        </div>
      </section>
    </main>
  );
}

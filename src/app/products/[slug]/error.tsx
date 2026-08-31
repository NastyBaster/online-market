"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="main" id="main-content" role="alert" tabIndex={-1}>
      <section className="product-details" aria-labelledby="product-error-title">
        <div className="eyebrow">Product</div>
        <h1 id="product-error-title">We could not load this demo product</h1>
        <p className="product-summary">
          Try requesting the mapped product details again.
        </p>
        <button className="retry-button" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}

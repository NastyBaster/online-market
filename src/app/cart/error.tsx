"use client";

export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="main" id="main-content" role="alert" tabIndex={-1}>
      <section className="cart-page" aria-labelledby="cart-error-title">
        <div className="eyebrow">Cart</div>
        <h1 id="cart-error-title">We could not load the cart</h1>
        <p className="cart-copy">Try requesting the authoritative cart summary again.</p>
        <button className="retry-button" type="button" onClick={reset}>
          Try again
        </button>
      </section>
    </main>
  );
}

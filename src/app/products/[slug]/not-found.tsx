import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main" id="main-content" tabIndex={-1}>
      <section className="product-details" aria-labelledby="product-not-found-title">
        <div className="eyebrow">Product</div>
        <h1 id="product-not-found-title">Demo product not found</h1>
        <p className="product-summary">
          The requested product slug does not match any mapped demo catalog item.
        </p>
        <Link className="back-link" href="/#catalog">
          Return to catalog
        </Link>
      </section>
    </main>
  );
}

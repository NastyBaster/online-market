import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main" id="main-content" tabIndex={-1}>
      <section className="product-details" aria-labelledby="page-not-found-title">
        <div className="eyebrow">Northstar</div>
        <h1 id="page-not-found-title">Page not found</h1>
        <p className="product-summary">
          The requested page could not be found.
        </p>
        <Link className="back-link" href="/">
          Return to storefront
        </Link>
      </section>
    </main>
  );
}

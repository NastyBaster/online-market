import { getStoreConfig } from "@/modules/store-config";

export default async function HomePage() {
  const storeResult = await getStoreConfig();
  const store = storeResult.config;

  return (
    <main className="main" id="main-content" tabIndex={-1}>
      <section className="hero" id="about" aria-labelledby="page-title">
        <div className="eyebrow">{store.identity.shortName}</div>
        <h1 id="page-title">{store.identity.name}</h1>
        <p>{store.identity.description}</p>
        <div className="hero-grid">
          <article className="hero-card">
            <h2>Configured server-side</h2>
            <p>
              The storefront shell reads validated store identity, contact placeholders, and
              brand tokens through the provider boundary.
            </p>
          </article>
          <article className="hero-card">
            <h2>Ready for reuse</h2>
            <p>
              Demo configuration stays isolated from the template so a production provider can
              replace it without rewriting branded UI components.
            </p>
          </article>
        </div>
        <div className="status-row">
          <div className="status" id="status" role="status">
            Demo mode: {store.demoMode ? "enabled" : "disabled"}
          </div>
          {storeResult.status === "fallback" ? (
            <p className="status-note">Safe fallback branding is active.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}

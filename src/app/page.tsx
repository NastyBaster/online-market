import Image from "next/image";
import { formatAvailability, getCatalog } from "@/modules/catalog";
import { getStoreConfig } from "@/modules/store-config";

function IntroSection({
  name,
  shortName,
  description,
}: {
  name: string;
  shortName: string;
  description: string;
}) {
  return (
    <section className="catalog-intro" id="about" aria-labelledby="page-title">
      <div className="eyebrow">{shortName}</div>
      <h1 id="page-title">Demo catalog for everyday camp rituals</h1>
      <p>{description}</p>
      <div className="catalog-callouts">
        <article className="catalog-note">
          <h2>Typed at the boundary</h2>
          <p>
            Products and variants are mapped into the catalog domain before the UI renders
            names, pricing, images, or availability.
          </p>
        </article>
        <article className="catalog-note">
          <h2>Ready for production providers</h2>
          <p>
            {name} uses the same contract a future production catalog provider can
            implement without changing this page.
          </p>
        </article>
      </div>
    </section>
  );
}

export default async function HomePage() {
  const storeResult = await getStoreConfig();
  const store = storeResult.config;
  const catalogResult = await getCatalog();

  return (
    <main className="main" id="main-content" tabIndex={-1}>
      <IntroSection
        name={store.identity.name}
        shortName={store.identity.shortName}
        description={store.identity.description}
      />
      <section className="catalog-section" id="catalog" aria-labelledby="catalog-title">
        <div className="catalog-header">
          <div>
            <div className="eyebrow">Catalog</div>
            <h2 id="catalog-title">Six demo products, rendered server-side</h2>
          </div>
          <div className="status-row">
            <div className="status" id="status" role="status">
              Demo mode: {store.demoMode ? "enabled" : "disabled"}
            </div>
            {storeResult.status === "fallback" ? (
              <p className="status-note">Safe fallback branding is active.</p>
            ) : null}
          </div>
        </div>
        {catalogResult.status === "empty" ? (
          <div className="catalog-empty" role="status">
            <h3>No demo products available</h3>
            <p>The catalog provider returned no mapped products for this storefront.</p>
          </div>
        ) : (
          <ul className="catalog-grid" aria-label="Demo products">
            {catalogResult.catalog.products.map((product) => (
              <li key={product.id}>
                <article
                  className="catalog-card"
                  tabIndex={0}
                  aria-labelledby={`${product.id}-name`}
                >
                  <div className="catalog-image-wrap">
                    <Image
                      className="catalog-image"
                      src={product.image.src}
                      alt={product.image.alt}
                      width={800}
                      height={600}
                      sizes="(min-width: 1040px) 22rem, (min-width: 720px) 30rem, 100vw"
                    />
                  </div>
                  <div className="catalog-card-body">
                    <p className="catalog-category">{product.category}</p>
                    <h3 id={`${product.id}-name`}>{product.name}</h3>
                    <p className="catalog-meta">{product.shortDescription}</p>
                    <p className="catalog-price">{product.price.display}</p>
                    <p className="catalog-availability">{formatAvailability(product.availability)}</p>
                    <p className="catalog-meta">
                      {product.variants[0]?.optionLabel} | SKU {product.variants[0]?.sku} |{" "}
                      {product.variants.length} variant{product.variants.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

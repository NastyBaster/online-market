import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  formatAvailability,
  getCatalogProductBySlug,
  getCatalogProductSlugs,
} from "@/modules/catalog";
import { getStoreConfig } from "@/modules/store-config";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

function availabilityClassName(availability: "inStock" | "lowStock" | "soldOut"): string {
  switch (availability) {
    case "inStock":
      return "availability-pill availability-pill-in-stock";
    case "lowStock":
      return "availability-pill availability-pill-low-stock";
    case "soldOut":
      return "availability-pill availability-pill-sold-out";
  }
}

export async function generateStaticParams() {
  const slugs = await getCatalogProductSlugs();

  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [product, storeResult] = await Promise.all([
    getCatalogProductBySlug(slug),
    getStoreConfig(),
  ]);

  if (!product) {
    return {
      title: `Product not found | ${storeResult.config.identity.name}`,
      description: "The requested demo product could not be found.",
    };
  }

  return {
    title: `${product.name} | ${storeResult.config.identity.name}`,
    description: product.shortDescription,
    alternates: {
      canonical: `/products/${product.slug}`,
    },
  };
}

export default async function ProductDetailsPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = await getCatalogProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const variant = product.variants[0];

  return (
    <main className="main" id="main-content" tabIndex={-1}>
      <section className="product-details" aria-labelledby="product-title">
        <Link className="back-link" href="/#catalog">
          Back to catalog
        </Link>
        <div className="product-details-grid">
          <div className="product-hero">
            <div className="product-image-frame">
              <Image
                className="product-image"
                src={product.image.src}
                alt={product.image.alt}
                width={1200}
                height={900}
                priority
                sizes="(min-width: 1040px) 34rem, (min-width: 720px) 46vw, 100vw"
              />
            </div>
          </div>
          <article className="product-panel">
            <div className="eyebrow">{product.category}</div>
            <h1 id="product-title">{product.name}</h1>
            <p className="product-summary">{product.shortDescription}</p>
            <p className="product-price">{product.price.display}</p>
            <p className={availabilityClassName(product.availability)}>
              {formatAvailability(product.availability)}
            </p>
            <dl className="product-facts">
              <div>
                <dt>Variant</dt>
                <dd>{variant?.optionLabel ?? "Unavailable"}</dd>
              </div>
              <div>
                <dt>SKU</dt>
                <dd>{variant?.sku ?? "Unavailable"}</dd>
              </div>
            </dl>
            <section
              className="product-availability-card"
              aria-labelledby="availability-title"
            >
              <h2 id="availability-title">Availability</h2>
              <p>
                {product.availability === "soldOut"
                  ? "This demo product is currently sold out."
                  : product.availability === "lowStock"
                    ? "This demo product is available in low stock."
                    : "This demo product is currently in stock."}
              </p>
              <p className="product-availability-note">
                Availability is derived server-side from the mapped variant inventory.
              </p>
            </section>
          </article>
        </div>
      </section>
    </main>
  );
}

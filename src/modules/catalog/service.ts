import { cache } from "react";
import { catalogInputSchema } from "@/modules/catalog/schema";
import type {
  Catalog,
  CatalogProvider,
  CatalogResult,
  Product,
  ProductAvailability,
  ProductVariant,
} from "@/modules/catalog/types";
import { getStoreConfig } from "@/modules/store-config";
import { createDemoCatalogProvider } from "@/providers/catalog";

function formatPrice(amountMinor: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amountMinor / 100);
}

function deriveVariantAvailability(stockOnHand: number): ProductAvailability {
  if (stockOnHand === 0) {
    return "soldOut";
  }

  if (stockOnHand <= 5) {
    return "lowStock";
  }

  return "inStock";
}

function deriveAvailability(variants: ProductVariant[]): ProductAvailability {
  const totalStock = variants.reduce((sum, variant) => sum + variant.stockOnHand, 0);

  if (totalStock === 0) {
    return "soldOut";
  }

  if (totalStock <= 5) {
    return "lowStock";
  }

  return "inStock";
}

function ensureCatalogInvariants(products: Product[], expectedCurrency: string) {
  const seenSkus = new Set<string>();

  for (const product of products) {
    for (const variant of product.variants) {
      if (variant.currency !== expectedCurrency) {
        throw new Error(`Catalog currency mismatch for SKU ${variant.sku}.`);
      }

      if (seenSkus.has(variant.sku)) {
        throw new Error(`Duplicate SKU detected: ${variant.sku}.`);
      }

      seenSkus.add(variant.sku);
    }
  }
}

function toCatalog(payload: unknown, currency: string, locale: string): Catalog {
  const parsed = catalogInputSchema.parse(payload);
  const products = parsed.products.map<Product>((product) => {
    const variants = product.variants.map<ProductVariant>((variant) => ({
      ...variant,
      availability: deriveVariantAvailability(variant.stockOnHand),
    }));
    const primaryVariant = variants.reduce((lowest, current) =>
      current.priceMinor < lowest.priceMinor ? current : lowest,
    );

    return {
      ...product,
      variants,
      price: {
        amountMinor: primaryVariant.priceMinor,
        currency: primaryVariant.currency,
        display: formatPrice(primaryVariant.priceMinor, primaryVariant.currency, locale),
      },
      availability: deriveAvailability(variants),
    };
  });

  ensureCatalogInvariants(products, currency);

  return { products };
}

export async function loadCatalog(
  provider: CatalogProvider = createDemoCatalogProvider(),
): Promise<CatalogResult> {
  const storeResult = await getStoreConfig();
  const catalog = toCatalog(
    await provider.readCatalog(),
    storeResult.config.currency,
    storeResult.config.locale,
  );

  return {
    catalog,
    source: provider.source,
    status: catalog.products.length === 0 ? "empty" : "ready",
  };
}

export const getCatalog = cache(async () => loadCatalog());

export async function getCatalogProductBySlug(slug: string): Promise<Product | null> {
  const normalizedSlug = slug.trim();

  if (!normalizedSlug) {
    return null;
  }

  const result = await getCatalog();

  return result.catalog.products.find((product) => product.slug === normalizedSlug) ?? null;
}

export async function getCatalogProductSlugs(): Promise<string[]> {
  const result = await getCatalog();

  return result.catalog.products.map((product) => product.slug);
}

export function formatAvailability(availability: ProductAvailability): string {
  switch (availability) {
    case "inStock":
      return "In stock";
    case "lowStock":
      return "Low stock";
    case "soldOut":
      return "Sold out";
  }
}

export { deriveAvailability, deriveVariantAvailability, formatPrice };

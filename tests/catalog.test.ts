import { describe, expect, it } from "vitest";
import { DemoCatalogProvider, demoCatalogPayload } from "@/providers/catalog";
import {
  deriveAvailability,
  deriveVariantAvailability,
  formatAvailability,
  formatPrice,
  getCatalogProductBySlug,
  getCatalogProductSlugs,
  loadCatalog,
} from "@/modules/catalog";

describe("catalog domain", () => {
  it("formats prices server-side using minor units", () => {
    expect(formatPrice(2800, "USD", "en-US")).toBe("$28.00");
  });

  it("derives availability from total variant stock", () => {
    expect(
      deriveAvailability([
        {
          id: "variant-1",
          sku: "SKU-1",
          optionLabel: "First",
          priceMinor: 100,
          currency: "USD",
          stockOnHand: 0,
          availability: "soldOut",
        },
      ]),
    ).toBe("soldOut");
    expect(
      deriveAvailability([
        {
          id: "variant-2",
          sku: "SKU-2",
          optionLabel: "Second",
          priceMinor: 100,
          currency: "USD",
          stockOnHand: 2,
          availability: "lowStock",
        },
      ]),
    ).toBe("lowStock");
    expect(
      deriveAvailability([
        {
          id: "variant-3",
          sku: "SKU-3",
          optionLabel: "Third",
          priceMinor: 100,
          currency: "USD",
          stockOnHand: 6,
          availability: "inStock",
        },
      ]),
    ).toBe("inStock");
    expect(deriveVariantAvailability(0)).toBe("soldOut");
    expect(deriveVariantAvailability(3)).toBe("lowStock");
    expect(deriveVariantAvailability(6)).toBe("inStock");
    expect(formatAvailability("lowStock")).toBe("Low stock");
  });

  it("maps demo provider payload into typed products", async () => {
    const result = await loadCatalog(new DemoCatalogProvider());

    expect(result).toMatchObject({
      source: "demo",
      status: "ready",
    });
    expect(result.catalog.products).toHaveLength(6);
    expect(result.catalog.products.map((product) => product.name)).toEqual([
      "Field Journal",
      "Weekend Thermos",
      "Trail Lantern",
      "Ridge Blanket",
      "Wayfinder Tote",
      "Summit Mug",
    ]);

    for (const product of result.catalog.products) {
      expect(product.variants.length).toBeGreaterThanOrEqual(1);
      expect(product.shortDescription.length).toBeGreaterThan(0);
      expect(Number.isInteger(product.price.amountMinor)).toBe(true);
      expect(product.price.currency).toBe("USD");
      expect(product.image.src.startsWith("/images/catalog/")).toBe(true);

      for (const variant of product.variants) {
        expect(variant.id.length).toBeGreaterThan(0);
        expect(variant.optionLabel.length).toBeGreaterThan(0);
        expect(Number.isInteger(variant.priceMinor)).toBe(true);
        expect(["inStock", "lowStock", "soldOut"]).toContain(variant.availability);
      }
    }

    expect(result.catalog.products[1]?.availability).toBe("lowStock");
    expect(result.catalog.products[3]?.availability).toBe("soldOut");
  });

  it("looks up a mapped product by slug", async () => {
    const product = await getCatalogProductBySlug("ridge-blanket");

    expect(product).not.toBeNull();
    expect(product?.name).toBe("Ridge Blanket");
    expect(product?.price.display).toBe("$72.00");
    expect(product?.availability).toBe("soldOut");
    expect(product?.variants[0]?.sku).toBe("NSG-BLANKET-001");
  });

  it("returns null for an unknown or empty product slug", async () => {
    await expect(getCatalogProductBySlug("unknown-product")).resolves.toBeNull();
    await expect(getCatalogProductBySlug("   ")).resolves.toBeNull();
  });

  it("returns six unique static product slugs", async () => {
    const slugs = await getCatalogProductSlugs();

    expect(slugs).toEqual([
      "field-journal",
      "weekend-thermos",
      "trail-lantern",
      "ridge-blanket",
      "wayfinder-tote",
      "summit-mug",
    ]);
  });

  it("rejects duplicate SKUs across products", async () => {
    const provider = {
      source: "demo" as const,
      async readCatalog() {
        return {
          products: [
            demoCatalogPayload.products[0],
            {
              ...demoCatalogPayload.products[1],
              variants: [
                {
                  ...demoCatalogPayload.products[1].variants[0],
                  sku: demoCatalogPayload.products[0].variants[0].sku,
                },
              ],
            },
          ],
        };
      },
    };

    await expect(loadCatalog(provider)).rejects.toThrow("Duplicate SKU detected");
  });

  it("rejects variants whose currency diverges from store config", async () => {
    const provider = {
      source: "demo" as const,
      async readCatalog() {
        return {
          products: [
            {
              ...demoCatalogPayload.products[0],
              variants: [
                {
                  ...demoCatalogPayload.products[0].variants[0],
                  currency: "EUR",
                },
              ],
            },
          ],
        };
      },
    };

    await expect(loadCatalog(provider)).rejects.toThrow("Catalog currency mismatch");
  });
});

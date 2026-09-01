import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "@/modules/catalog";
import {
  addVariantToCart,
  appendCartStatus,
  CART_COOKIE_MAX_AGE_SECONDS,
  CART_COOKIE_VERSION,
  CART_MAX_QUANTITY_PER_LINE,
  CartMutationError,
  cartCookiePayloadSchema,
  parseCartQuantity,
  removeVariantFromCart,
  resolveCart,
  sanitizeRedirectPath,
  setVariantQuantity,
} from "@/modules/cart";
import {
  createCartCookieValue,
  createSetCartCookie,
  decodeCartCookie,
  getCartCookieSecret,
  isCartWritable,
} from "@/providers/cart";

const env = {
  CART_COOKIE_SECRET: "cart-secret-for-tests-should-be-long-enough",
  NODE_ENV: "test",
};

const catalog = (await loadCatalog()).catalog;
const fieldJournal = catalog.products[0]!;
const soldOutBlanket = catalog.products[3]!;
const fieldJournalRecord = {
  product: fieldJournal,
  variant: fieldJournal.variants[0]!,
};
const soldOutRecord = {
  product: soldOutBlanket,
  variant: soldOutBlanket.variants[0]!,
};

describe("cart payload schema and cookie signing", () => {
  it("accepts the supported payload schema", () => {
    expect(
      cartCookiePayloadSchema.parse({
        version: CART_COOKIE_VERSION,
        items: [{ variantId: "variant-field-journal-clay-cover", quantity: 2 }],
      }),
    ).toEqual({
      version: 1,
      items: [{ variantId: "variant-field-journal-clay-cover", quantity: 2 }],
    });
  });

  it("signs and verifies cart cookies", () => {
    const cookie = createCartCookieValue(
      [{ variantId: "variant-field-journal-clay-cover", quantity: 2 }],
      env,
    );

    expect(decodeCartCookie(cookie, env)).toEqual([
      { variantId: "variant-field-journal-clay-cover", quantity: 2 },
    ]);
  });

  it("fails closed on malformed signatures", () => {
    const cookie = createCartCookieValue(
      [{ variantId: "variant-field-journal-clay-cover", quantity: 2 }],
      env,
    );

    expect(decodeCartCookie(`${cookie}tampered`, env)).toEqual([]);
  });

  it("fails closed on unsupported payload versions", () => {
    const encoded = Buffer.from(
      JSON.stringify({
        version: 999,
        items: [{ variantId: "variant-field-journal-clay-cover", quantity: 1 }],
      }),
      "utf8",
    ).toString("base64url");
    const secret = getCartCookieSecret(env)!;
    const signature = createHmac("sha256", secret).update(encoded).digest("base64url");

    expect(decodeCartCookie(`${encoded}.${signature}`, env)).toEqual([]);
  });

  it("returns a secure cart cookie policy", () => {
    expect(createSetCartCookie([], env)).toMatchObject({
      name: "cart",
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      path: "/",
      maxAge: CART_COOKIE_MAX_AGE_SECONDS,
    });
  });

  it("uses an env secret when configured and a bounded non-production fallback otherwise", () => {
    expect(getCartCookieSecret(env)).toBe(env.CART_COOKIE_SECRET);
    expect(getCartCookieSecret({ NODE_ENV: "test", CI: "1" })).toHaveLength(64);
    expect(isCartWritable({ NODE_ENV: "production" })).toBe(false);
  });
});

describe("cart domain behavior", () => {
  it("merges duplicate adds for the same variant", () => {
    const cart = addVariantToCart(
      [{ variantId: fieldJournalRecord.variant.id, quantity: 1 }],
      fieldJournalRecord,
    );

    expect(cart).toEqual([{ variantId: fieldJournalRecord.variant.id, quantity: 2 }]);
  });

  it("rejects sold-out additions", () => {
    expect(() => addVariantToCart([], soldOutRecord)).toThrowError(CartMutationError);
    expect(() => addVariantToCart([], soldOutRecord)).toThrowError("sold-out");
  });

  it("validates quantity input", () => {
    expect(parseCartQuantity("2")).toBe(2);

    for (const invalidValue of [
      "0",
      "-1",
      "1.5",
      "NaN",
      String(CART_MAX_QUANTITY_PER_LINE + 1),
    ]) {
      expect(() => parseCartQuantity(invalidValue)).toThrowError("invalid-quantity");
    }
  });

  it("rejects quantity updates above stock", () => {
    expect(() =>
      setVariantQuantity(
        [{ variantId: fieldJournalRecord.variant.id, quantity: 1 }],
        fieldJournalRecord,
        fieldJournalRecord.variant.stockOnHand + 1,
      ),
    ).toThrowError("invalid-quantity");
  });

  it("rejects unknown variant removals", () => {
    expect(() => removeVariantFromCart([], "missing-variant")).toThrowError("not-in-cart");
  });

  it("computes line totals and subtotal from authoritative priceMinor values", () => {
    const cart = resolveCart([{ variantId: fieldJournalRecord.variant.id, quantity: 2 }], catalog);

    expect(cart.lines[0]).toMatchObject({
      quantity: 2,
      unitPriceMinor: 2800,
      lineTotalMinor: 5600,
    });
    expect(cart.subtotalMinor).toBe(5600);
  });

  it("drops stale unknown variants and excludes them from subtotal", () => {
    const cart = resolveCart(
      [
        { variantId: fieldJournalRecord.variant.id, quantity: 1 },
        { variantId: "missing-variant", quantity: 9 },
      ],
      catalog,
    );

    expect(cart.lines).toHaveLength(1);
    expect(cart.subtotalMinor).toBe(2800);
    expect(cart.itemCount).toBe(1);
  });

  it("clamps duplicate signed-cookie quantities to stock on read", () => {
    const cart = resolveCart(
      [
        { variantId: fieldJournalRecord.variant.id, quantity: 20 },
        { variantId: fieldJournalRecord.variant.id, quantity: 20 },
      ],
      catalog,
    );

    expect(cart.lines[0]?.quantity).toBe(fieldJournalRecord.variant.stockOnHand);
  });

  it("sanitizes redirect paths and appends status safely", () => {
    expect(sanitizeRedirectPath("/products/field-journal")).toBe("/products/field-journal");
    expect(sanitizeRedirectPath("https://example.com/evil")).toBe("/cart");
    expect(appendCartStatus("/cart", "added")).toBe("/cart?cartStatus=added");
  });
});

import type { Catalog, ProductAvailability } from "@/modules/catalog";
import {
  CART_MAX_QUANTITY_PER_LINE,
  cartQuantitySchema,
  cartVariantIdSchema,
} from "@/modules/cart/schema";
import type {
  CartCookieItem,
  CartLine,
  CartStatus,
  CartView,
  CatalogVariantRecord,
} from "@/modules/cart/types";

export class CartMutationError extends Error {
  constructor(
    readonly status: Extract<
      CartStatus,
      "invalid-quantity" | "sold-out" | "unknown-variant" | "not-in-cart" | "cart-unavailable"
    >,
  ) {
    super(status);
  }
}

function mergeDuplicateItems(items: CartCookieItem[]): CartCookieItem[] {
  const quantities = new Map<string, number>();

  for (const item of items) {
    const current = quantities.get(item.variantId) ?? 0;
    quantities.set(item.variantId, current + item.quantity);
  }

  return Array.from(quantities.entries(), ([variantId, quantity]) => ({
    variantId,
    quantity,
  }));
}

export function createVariantRecordMap(catalog: Catalog): Map<string, CatalogVariantRecord> {
  const records = new Map<string, CatalogVariantRecord>();

  for (const product of catalog.products) {
    for (const variant of product.variants) {
      records.set(variant.id, { product, variant });
    }
  }

  return records;
}

function maximumQuantityForRecord(record: CatalogVariantRecord): number {
  return Math.min(record.variant.stockOnHand, CART_MAX_QUANTITY_PER_LINE);
}

export function resolveCart(items: CartCookieItem[], catalog: Catalog): CartView {
  const records = createVariantRecordMap(catalog);
  const mergedItems = mergeDuplicateItems(items);
  const lines: CartLine[] = [];
  const effectiveItems: CartCookieItem[] = [];
  let itemCount = 0;
  let subtotalMinor = 0;

  for (const item of mergedItems) {
    const record = records.get(item.variantId);

    if (!record) {
      continue;
    }

    const maxQuantity = maximumQuantityForRecord(record);

    if (maxQuantity < 1) {
      continue;
    }

    const quantity = Math.min(item.quantity, maxQuantity);
    const lineTotalMinor = record.variant.priceMinor * quantity;

    lines.push({
      productId: record.product.id,
      productSlug: record.product.slug,
      productName: record.product.name,
      productImage: record.product.image,
      variantId: record.variant.id,
      variantLabel: record.variant.optionLabel,
      sku: record.variant.sku,
      availability: record.variant.availability,
      quantity,
      maxQuantity,
      unitPriceMinor: record.variant.priceMinor,
      lineTotalMinor,
    });
    effectiveItems.push({
      variantId: record.variant.id,
      quantity,
    });
    itemCount += quantity;
    subtotalMinor += lineTotalMinor;
  }

  return {
    lines,
    itemCount,
    subtotalMinor,
    isEmpty: lines.length === 0,
    effectiveItems,
  };
}

export function parseCartVariantId(value: FormDataEntryValue | null): string {
  const parsed = cartVariantIdSchema.safeParse(value);

  if (!parsed.success) {
    throw new CartMutationError("unknown-variant");
  }

  return parsed.data;
}

export function parseCartQuantity(value: FormDataEntryValue | null): number {
  const parsed = cartQuantitySchema.safeParse(value);

  if (!parsed.success) {
    throw new CartMutationError("invalid-quantity");
  }

  return parsed.data;
}

export function assertCartWritable(secretAvailable: boolean) {
  if (!secretAvailable) {
    throw new CartMutationError("cart-unavailable");
  }
}

export function assertVariantCanBeAdded(record: CatalogVariantRecord | null): CatalogVariantRecord {
  if (!record) {
    throw new CartMutationError("unknown-variant");
  }

  if (maximumQuantityForRecord(record) < 1) {
    throw new CartMutationError("sold-out");
  }

  return record;
}

export function assertQuantityAllowed(
  requestedQuantity: number,
  record: CatalogVariantRecord,
): number {
  const maximumQuantity = maximumQuantityForRecord(record);

  if (maximumQuantity < 1) {
    throw new CartMutationError("sold-out");
  }

  if (requestedQuantity > maximumQuantity) {
    throw new CartMutationError("invalid-quantity");
  }

  return requestedQuantity;
}

export function addVariantToCart(
  items: CartCookieItem[],
  record: CatalogVariantRecord,
): CartCookieItem[] {
  const nextItems = mergeDuplicateItems(items);
  const existing = nextItems.find((item) => item.variantId === record.variant.id);
  const nextQuantity = (existing?.quantity ?? 0) + 1;

  assertQuantityAllowed(nextQuantity, record);

  if (existing) {
    return nextItems.map((item) =>
      item.variantId === record.variant.id ? { ...item, quantity: nextQuantity } : item,
    );
  }

  return [
    ...nextItems,
    {
      variantId: record.variant.id,
      quantity: nextQuantity,
    },
  ];
}

export function setVariantQuantity(
  items: CartCookieItem[],
  record: CatalogVariantRecord,
  quantity: number,
): CartCookieItem[] {
  assertQuantityAllowed(quantity, record);

  if (!items.some((item) => item.variantId === record.variant.id)) {
    throw new CartMutationError("not-in-cart");
  }

  return mergeDuplicateItems(items).map((item) =>
    item.variantId === record.variant.id ? { ...item, quantity } : item,
  );
}

export function removeVariantFromCart(items: CartCookieItem[], variantId: string): CartCookieItem[] {
  if (!items.some((item) => item.variantId === variantId)) {
    throw new CartMutationError("not-in-cart");
  }

  return mergeDuplicateItems(items).filter((item) => item.variantId !== variantId);
}

export function getCartStatusMessage(status: string | null): string | null {
  switch (status) {
    case "added":
      return "Added to cart.";
    case "updated":
      return "Cart updated.";
    case "removed":
      return "Item removed from cart.";
    case "invalid-quantity":
      return "Enter a whole-number quantity within the available stock.";
    case "sold-out":
      return "This variant is currently sold out.";
    case "unknown-variant":
      return "The requested cart item is no longer available.";
    case "not-in-cart":
      return "That cart item could not be updated.";
    case "cart-unavailable":
      return "Cart updates are unavailable until the signing secret is configured.";
    default:
      return null;
  }
}

export function sanitizeRedirectPath(value: FormDataEntryValue | null, fallback = "/cart"): string {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();

  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return fallback;
  }

  return trimmed;
}

export function appendCartStatus(path: string, status: CartStatus): string {
  const url = new URL(path, "https://storefront.local");
  url.searchParams.set("cartStatus", status);

  const search = url.searchParams.toString();
  return `${url.pathname}${search ? `?${search}` : ""}${url.hash}`;
}

export function buildRedirectUrl(path: string, request: Request): URL {
  const requestUrl = new URL(request.url);
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const host = forwardedHost ?? request.headers.get("host") ?? requestUrl.host;
  const protocol = forwardedProtocol ?? requestUrl.protocol.replace(":", "");

  return new URL(path, `${protocol}://${host}`);
}

export function getAvailabilityLabel(availability: ProductAvailability): string {
  switch (availability) {
    case "inStock":
      return "In stock";
    case "lowStock":
      return "Low stock";
    case "soldOut":
      return "Sold out";
  }
}

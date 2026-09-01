import type { Product, ProductImage, ProductVariant } from "@/modules/catalog";

export type CartCookieItem = {
  variantId: string;
  quantity: number;
};

export type CartCookiePayload = {
  version: 1;
  items: CartCookieItem[];
};

export type CartStatus =
  | "added"
  | "updated"
  | "removed"
  | "invalid-quantity"
  | "sold-out"
  | "unknown-variant"
  | "not-in-cart"
  | "cart-unavailable";

export type CatalogVariantRecord = {
  product: Product;
  variant: ProductVariant;
};

export type CartLine = {
  productId: string;
  productSlug: string;
  productName: string;
  productImage: ProductImage;
  variantId: string;
  variantLabel: string;
  sku: string;
  availability: ProductVariant["availability"];
  quantity: number;
  maxQuantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
};

export type CartView = {
  lines: CartLine[];
  itemCount: number;
  subtotalMinor: number;
  isEmpty: boolean;
  effectiveItems: CartCookieItem[];
};

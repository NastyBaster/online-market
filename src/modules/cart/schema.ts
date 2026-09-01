import { z } from "zod";

export const CART_COOKIE_NAME = "cart";
export const CART_COOKIE_VERSION = 1 as const;
export const CART_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 14;
export const CART_COOKIE_MAX_BYTES = 1024;
export const CART_MAX_LINE_ITEMS = 25;
export const CART_MAX_QUANTITY_PER_LINE = 25;

export const cartVariantIdSchema = z.string().trim().min(1).max(120);

export const cartQuantitySchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(CART_MAX_QUANTITY_PER_LINE);

export const cartCookieItemSchema = z.object({
  variantId: cartVariantIdSchema,
  quantity: z.number().int().min(1).max(CART_MAX_QUANTITY_PER_LINE),
});

export const cartCookiePayloadSchema = z.object({
  version: z.literal(CART_COOKIE_VERSION),
  items: z.array(cartCookieItemSchema).max(CART_MAX_LINE_ITEMS),
});

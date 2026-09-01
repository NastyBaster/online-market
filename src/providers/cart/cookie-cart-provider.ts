import { createHmac, timingSafeEqual } from "node:crypto";
import { cartEnvironmentSchema } from "@/modules/store-config/schema";
import {
  CART_COOKIE_MAX_AGE_SECONDS,
  CART_COOKIE_MAX_BYTES,
  CART_COOKIE_NAME,
  cartCookiePayloadSchema,
} from "@/modules/cart";
import type { CartCookieItem, CartCookiePayload } from "@/modules/cart";

type Environment = Record<string, string | undefined>;

function encodeBase64Url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decodeBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

function signPayload(encodedPayload: string, secret: string): string {
  return createHmac("sha256", secret).update(encodedPayload).digest("base64url");
}

function signaturesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left, "utf8");
  const rightBuffer = Buffer.from(right, "utf8");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}

function parseCartSecret(environment: Environment): string | null {
  const parsed = cartEnvironmentSchema.safeParse(environment);

  if (!parsed.success) {
    return null;
  }

  return parsed.data.CART_COOKIE_SECRET ?? null;
}

function fallbackDevelopmentSecret(environment: Environment): string | null {
  const nodeEnv = environment.NODE_ENV?.trim() ?? "";

  if (nodeEnv === "production") {
    return null;
  }

  const seed =
    environment.CART_COOKIE_SECRET?.trim() ||
    environment.CODEX_SESSION_ID?.trim() ||
    environment.GITHUB_RUN_ID?.trim() ||
    environment.CI?.trim();

  if (!seed) {
    return null;
  }

  return createHmac("sha256", seed).update("online-market-cart-dev-secret").digest("hex");
}

export function getCartCookieSecret(environment: Environment = process.env): string | null {
  return parseCartSecret(environment) ?? fallbackDevelopmentSecret(environment);
}

export function isCartWritable(environment: Environment = process.env): boolean {
  return getCartCookieSecret(environment) !== null;
}

export function encodeCartCookie(
  payload: CartCookiePayload,
  environment: Environment = process.env,
): string {
  const secret = getCartCookieSecret(environment);

  if (!secret) {
    throw new Error("Cart signing secret is unavailable.");
  }

  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = signPayload(encodedPayload, secret);
  const value = `${encodedPayload}.${signature}`;

  if (value.length > CART_COOKIE_MAX_BYTES) {
    throw new Error("Cart cookie payload exceeds the bounded size limit.");
  }

  return value;
}

export function decodeCartCookie(
  cookieValue: string | undefined,
  environment: Environment = process.env,
): CartCookieItem[] {
  if (!cookieValue || cookieValue.length > CART_COOKIE_MAX_BYTES) {
    return [];
  }

  const secret = getCartCookieSecret(environment);

  if (!secret) {
    return [];
  }

  const [encodedPayload, providedSignature, ...rest] = cookieValue.split(".");

  if (!encodedPayload || !providedSignature || rest.length > 0) {
    return [];
  }

  const expectedSignature = signPayload(encodedPayload, secret);

  if (!signaturesMatch(providedSignature, expectedSignature)) {
    return [];
  }

  const decodedPayload = decodeBase64Url(encodedPayload);

  if (!decodedPayload) {
    return [];
  }

  try {
    const parsed = cartCookiePayloadSchema.parse(JSON.parse(decodedPayload));
    return parsed.items;
  } catch {
    return [];
  }
}

export function createCartCookieValue(
  items: CartCookieItem[],
  environment: Environment = process.env,
): string {
  return encodeCartCookie(
    {
      version: 1,
      items,
    },
    environment,
  );
}

export function createSetCartCookie(
  items: CartCookieItem[],
  environment: Environment = process.env,
) {
  return {
    name: CART_COOKIE_NAME,
    value: createCartCookieValue(items, environment),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: environment.NODE_ENV === "production",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE_SECONDS,
  };
}

export function createClearedCartCookie(environment: Environment = process.env) {
  return {
    name: CART_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax" as const,
    secure: environment.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  };
}

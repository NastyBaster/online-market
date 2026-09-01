import { z } from "zod";
import type { StoreBrandPalette, StoreBrandPreset } from "@/modules/store-config/types";

const supportedColorTokens = [
  "teal",
  "amber",
  "slate",
  "coral",
] as const;

export const storeBrandPresets: Record<StoreBrandPreset, StoreBrandPalette> = {
  teal: {
    accent: "#0f766e",
    accentForeground: "#f8fafc",
    surface: "#f8fafc",
    surfaceForeground: "#172033",
    mutedSurface: "#d9f2ef",
    mutedForeground: "#134e4a",
    border: "#94d2cb",
  },
  amber: {
    accent: "#b45309",
    accentForeground: "#fff7ed",
    surface: "#fffbeb",
    surfaceForeground: "#1f2937",
    mutedSurface: "#fde7c7",
    mutedForeground: "#78350f",
    border: "#f3c98b",
  },
  slate: {
    accent: "#334155",
    accentForeground: "#f8fafc",
    surface: "#f8fafc",
    surfaceForeground: "#0f172a",
    mutedSurface: "#e2e8f0",
    mutedForeground: "#334155",
    border: "#cbd5e1",
  },
  coral: {
    accent: "#c2410c",
    accentForeground: "#fff7ed",
    surface: "#fff7ed",
    surfaceForeground: "#27272a",
    mutedSurface: "#fed7aa",
    mutedForeground: "#9a3412",
    border: "#fdba74",
  },
};

const socialLinkSchema = z
  .string()
  .trim()
  .url()
  .refine((value) => value.startsWith("https://"), "Links must use https.");

const maybeSocialLinkSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  socialLinkSchema.optional(),
);

const maybeSecretSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") {
      return value;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  },
  z.string().trim().min(32).optional(),
);

export const storeConfigInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  shortName: z.string().trim().min(1).max(24),
  description: z.string().trim().min(1).max(160),
  locale: z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  contact: z.object({
    email: z.string().trim().email(),
    phone: z.string().trim().regex(/^\+?[0-9()\-\s]{7,25}$/),
    links: z
      .object({
        support: maybeSocialLinkSchema,
        instagram: maybeSocialLinkSchema,
        facebook: maybeSocialLinkSchema,
      })
      .default({}),
  }),
  brand: z.object({
    preset: z.enum(supportedColorTokens),
  }),
  demoMode: z.boolean(),
});

export const environmentSchema = z.object({
  DEMO_MODE: z.enum(["true", "false"]).default("true"),
  NEXT_PUBLIC_STORE_NAME: z.string().trim().min(1).default("Northstar Goods"),
  NEXT_PUBLIC_STORE_SHORT_NAME: z.string().trim().min(1).default("Northstar"),
  NEXT_PUBLIC_STORE_DESCRIPTION: z
    .string()
    .trim()
    .min(1)
    .default("A reusable storefront shell for showcasing a distinct retail brand."),
  NEXT_PUBLIC_STORE_LOCALE: z.string().trim().default("en-US"),
  NEXT_PUBLIC_STORE_CURRENCY: z.string().trim().default("USD"),
  NEXT_PUBLIC_STORE_CONTACT_EMAIL: z.string().trim().default("hello@northstar-demo.test"),
  NEXT_PUBLIC_STORE_CONTACT_PHONE: z.string().trim().default("+1-555-010-0200"),
  NEXT_PUBLIC_STORE_SUPPORT_URL: z.string().optional(),
  NEXT_PUBLIC_STORE_INSTAGRAM_URL: z.string().optional(),
  NEXT_PUBLIC_STORE_FACEBOOK_URL: z.string().optional(),
  NEXT_PUBLIC_STORE_BRAND_PRESET: z.enum(supportedColorTokens).default("teal"),
  CART_COOKIE_SECRET: maybeSecretSchema,
});

export const cartEnvironmentSchema = environmentSchema.pick({
  CART_COOKIE_SECRET: true,
});

export function expandBrandPreset(preset: StoreBrandPreset): StoreBrandPalette {
  return storeBrandPresets[preset];
}

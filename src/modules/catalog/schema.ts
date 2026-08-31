import { z } from "zod";

export const catalogVariantInputSchema = z.object({
  id: z.string().trim().min(1),
  sku: z.string().trim().min(1),
  optionLabel: z.string().trim().min(1),
  priceMinor: z.number().int().nonnegative(),
  currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
  stockOnHand: z.number().int().nonnegative(),
});

export const catalogProductInputSchema = z.object({
  id: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  shortDescription: z.string().trim().min(1),
  category: z.string().trim().min(1),
  image: z.object({
    src: z.string().trim().startsWith("/images/catalog/"),
    alt: z.string().trim().min(1),
  }),
  variants: z.array(catalogVariantInputSchema).min(1),
});

export const catalogInputSchema = z.object({
  products: z.array(catalogProductInputSchema),
});

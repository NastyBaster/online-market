import { z } from "zod";

const environmentSchema = z.object({
  DEMO_MODE: z.enum(["true", "false"]).default("true"),
  NEXT_PUBLIC_STORE_NAME: z.string().trim().min(1).default("Storefront Foundation"),
});

export type StoreConfig = { name: string; demoMode: boolean };

export function getStoreConfig(environment: Record<string, string | undefined> = process.env): StoreConfig {
  const parsed = environmentSchema.parse(environment);
  return { name: parsed.NEXT_PUBLIC_STORE_NAME, demoMode: parsed.DEMO_MODE === "true" };
}

import { cache } from "react";
import { ZodError } from "zod";
import { createFallbackStoreConfigResult } from "@/modules/store-config/fallback";
import { expandBrandPreset, storeConfigInputSchema } from "@/modules/store-config/schema";
import type {
  StoreConfig,
  StoreConfigProvider,
  StoreConfigResult,
} from "@/modules/store-config/types";
import { createDemoStoreConfigProvider } from "@/providers/store-config";

function definedLinks(
  links: StoreConfig["contact"]["links"],
): StoreConfig["contact"]["links"] {
  return Object.fromEntries(
    Object.entries(links).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
}

function toStoreConfig(payload: unknown): StoreConfig {
  const parsed = storeConfigInputSchema.parse(payload);
  const { brand, ...config } = parsed;

  return {
    identity: {
      name: config.name,
      shortName: config.shortName,
      description: config.description,
    },
    locale: config.locale,
    currency: config.currency,
    contact: {
      ...config.contact,
      links: definedLinks(config.contact.links),
    },
    brand: expandBrandPreset(brand.preset),
    demoMode: config.demoMode,
  };
}

export async function loadStoreConfig(
  provider: StoreConfigProvider = createDemoStoreConfigProvider(),
): Promise<StoreConfigResult> {
  try {
    return {
      config: toStoreConfig(await provider.readStoreConfig()),
      source: provider.source,
      status: "ready",
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return createFallbackStoreConfigResult(provider.source);
    }

    throw error;
  }
}

export const getStoreConfig = cache(async () => loadStoreConfig());

import type { StoreConfig, StoreConfigResult, StoreConfigSource } from "@/modules/store-config/types";

export const fallbackStoreConfig: StoreConfig = {
  identity: {
    name: "Northstar Goods",
    shortName: "Northstar",
    description: "A reusable storefront shell for showcasing a distinct retail brand.",
  },
  locale: "en-US",
  currency: "USD",
  contact: {
    email: "hello@northstar-demo.test",
    phone: "+1-555-010-0200",
    links: {
      support: "https://example.com/support",
    },
  },
  brand: {
    accent: "#0f766e",
    accentForeground: "#f8fafc",
    surface: "#f8fafc",
    surfaceForeground: "#172033",
    mutedSurface: "#d9f2ef",
    mutedForeground: "#134e4a",
    border: "#94d2cb",
  },
  demoMode: true,
};

export function createFallbackStoreConfigResult(
  source: StoreConfigSource = "demo",
): StoreConfigResult {
  return { config: fallbackStoreConfig, source, status: "fallback" };
}

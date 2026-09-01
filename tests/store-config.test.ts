import { describe, expect, it } from "vitest";
import { DemoStoreConfigProvider } from "@/providers/store-config";
import { fallbackStoreConfig, loadStoreConfig } from "@/modules/store-config";

describe("store configuration", () => {
  it("loads typed demo config and exposes the configured short name through the provider boundary", async () => {
    const result = await loadStoreConfig(
      new DemoStoreConfigProvider({
        DEMO_MODE: "false",
        NEXT_PUBLIC_STORE_NAME: "Demo Shop",
        NEXT_PUBLIC_STORE_SHORT_NAME: "Demo",
        NEXT_PUBLIC_STORE_DESCRIPTION: "A reusable branded storefront shell.",
        NEXT_PUBLIC_STORE_LOCALE: "en-US",
        NEXT_PUBLIC_STORE_CURRENCY: "usd",
        NEXT_PUBLIC_STORE_CONTACT_EMAIL: "hello@example.test",
        NEXT_PUBLIC_STORE_CONTACT_PHONE: "+1 555 010 2020",
        NEXT_PUBLIC_STORE_SUPPORT_URL: "https://example.test/support",
        NEXT_PUBLIC_STORE_BRAND_PRESET: "amber",
      }),
    );

    expect(result.config.identity.shortName).toBe("Demo");
    expect(result).toEqual({
      source: "demo",
      status: "ready",
      config: {
        identity: {
          name: "Demo Shop",
          shortName: "Demo",
          description: "A reusable branded storefront shell.",
        },
        locale: "en-US",
        currency: "USD",
        contact: {
          email: "hello@example.test",
          phone: "+1 555 010 2020",
          links: {
            support: "https://example.test/support",
          },
        },
        brand: {
          accent: "#b45309",
          accentForeground: "#fff7ed",
          surface: "#fffbeb",
          surfaceForeground: "#1f2937",
          mutedSurface: "#fde7c7",
          mutedForeground: "#78350f",
          border: "#f3c98b",
        },
        demoMode: false,
      },
    });
  });

  it("falls back without exposing raw invalid config", async () => {
    const provider = {
      source: "demo" as const,
      async readStoreConfig() {
        return {
          name: "",
          shortName: "Broken",
          description: "Broken config",
          locale: "english",
          currency: "usd",
          contact: {
            email: "nope",
            phone: "abc",
            links: {
              support: "javascript:alert(1)",
            },
          },
          brand: {
            preset: "teal",
          },
          demoMode: true,
        };
      },
    };

    const result = await loadStoreConfig(provider);

    expect(result).toEqual({
      source: "demo",
      status: "fallback",
      config: fallbackStoreConfig,
    });
  });

  it("falls back when demo environment parsing fails", async () => {
    const result = await loadStoreConfig(
      new DemoStoreConfigProvider({
        DEMO_MODE: "true",
        NEXT_PUBLIC_STORE_NAME: "Northstar Goods",
        NEXT_PUBLIC_STORE_SHORT_NAME: "Northstar",
        NEXT_PUBLIC_STORE_DESCRIPTION:
          "A reusable storefront shell for showcasing a distinct retail brand.",
        NEXT_PUBLIC_STORE_LOCALE: "en-US",
        NEXT_PUBLIC_STORE_CURRENCY: "USD",
        NEXT_PUBLIC_STORE_CONTACT_EMAIL: "invalid-email",
        NEXT_PUBLIC_STORE_CONTACT_PHONE: "+1-555-010-0200",
        NEXT_PUBLIC_STORE_BRAND_PRESET: "teal",
      }),
    );

    expect(result).toEqual({
      source: "demo",
      status: "fallback",
      config: fallbackStoreConfig,
    });
  });
});

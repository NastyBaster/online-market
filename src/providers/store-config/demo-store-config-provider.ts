import { environmentSchema } from "@/modules/store-config/schema";
import type { StoreConfigProvider } from "@/modules/store-config/types";

type Environment = Record<string, string | undefined>;

export class DemoStoreConfigProvider implements StoreConfigProvider {
  readonly source = "demo" as const;

  constructor(private readonly environment: Environment = process.env) {}

  async readStoreConfig(): Promise<unknown> {
    const parsed = environmentSchema.parse(this.environment);

    return {
      name: parsed.NEXT_PUBLIC_STORE_NAME,
      shortName: parsed.NEXT_PUBLIC_STORE_SHORT_NAME,
      description: parsed.NEXT_PUBLIC_STORE_DESCRIPTION,
      locale: parsed.NEXT_PUBLIC_STORE_LOCALE,
      currency: parsed.NEXT_PUBLIC_STORE_CURRENCY,
      contact: {
        email: parsed.NEXT_PUBLIC_STORE_CONTACT_EMAIL,
        phone: parsed.NEXT_PUBLIC_STORE_CONTACT_PHONE,
        links: {
          support: parsed.NEXT_PUBLIC_STORE_SUPPORT_URL,
          instagram: parsed.NEXT_PUBLIC_STORE_INSTAGRAM_URL,
          facebook: parsed.NEXT_PUBLIC_STORE_FACEBOOK_URL,
        },
      },
      brand: {
        preset: parsed.NEXT_PUBLIC_STORE_BRAND_PRESET,
      },
      demoMode: parsed.DEMO_MODE === "true",
    };
  }
}

export function createDemoStoreConfigProvider(environment?: Environment): StoreConfigProvider {
  return new DemoStoreConfigProvider(environment);
}

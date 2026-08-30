export type StoreBrandPreset = "teal" | "amber" | "slate" | "coral";

export type StoreBrandPalette = {
  accent: string;
  accentForeground: string;
  surface: string;
  surfaceForeground: string;
  mutedSurface: string;
  mutedForeground: string;
  border: string;
};

export type StoreContactLinks = {
  support?: string;
  instagram?: string;
  facebook?: string;
};

export type StoreContactDetails = {
  email: string;
  phone: string;
  links: StoreContactLinks;
};

export type StoreIdentity = {
  name: string;
  shortName: string;
  description: string;
};

export type StoreConfig = {
  identity: StoreIdentity;
  locale: string;
  currency: string;
  contact: StoreContactDetails;
  brand: StoreBrandPalette;
  demoMode: boolean;
};

export type StoreConfigStatus = "ready" | "fallback";
export type StoreConfigSource = "demo";

export type StoreConfigResult = {
  config: StoreConfig;
  source: StoreConfigSource;
  status: StoreConfigStatus;
};

export interface StoreConfigProvider {
  readonly source: StoreConfigSource;
  readStoreConfig(): Promise<unknown>;
}

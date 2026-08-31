export type CatalogSource = "demo";
export type CatalogStatus = "ready" | "empty";

export type ProductAvailability = "inStock" | "lowStock" | "soldOut";

export type ProductImage = {
  src: string;
  alt: string;
};

export type ProductVariant = {
  id: string;
  sku: string;
  optionLabel: string;
  priceMinor: number;
  currency: string;
  stockOnHand: number;
  availability: ProductAvailability;
};

export type ProductPrice = {
  amountMinor: number;
  currency: string;
  display: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  image: ProductImage;
  variants: ProductVariant[];
  price: ProductPrice;
  availability: ProductAvailability;
};

export type Catalog = {
  products: Product[];
};

export type CatalogResult = {
  catalog: Catalog;
  source: CatalogSource;
  status: CatalogStatus;
};

export interface CatalogProvider {
  readonly source: CatalogSource;
  readCatalog(): Promise<unknown>;
}

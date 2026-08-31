import type { CatalogProvider } from "@/modules/catalog";

const demoCatalogPayload = {
  products: [
    {
      id: "prod-field-journal",
      slug: "field-journal",
      name: "Field Journal",
      shortDescription: "A desk-ready notebook for trail notes, packing lists, and sketches.",
      category: "Desk Essentials",
      image: {
        src: "/images/catalog/field-journal.svg",
        alt: "Field Journal notebook with a brass pen on a warm desk.",
      },
      variants: [
        {
          id: "variant-field-journal-clay-cover",
          sku: "NSG-JOURNAL-001",
          optionLabel: "Clay Cover",
          priceMinor: 2800,
          currency: "USD",
          stockOnHand: 12,
        },
      ],
    },
    {
      id: "prod-weekend-thermos",
      slug: "weekend-thermos",
      name: "Weekend Thermos",
      shortDescription: "A steel bottle sized for shared coffee pours at first light.",
      category: "Camp Kitchen",
      image: {
        src: "/images/catalog/weekend-thermos.svg",
        alt: "Weekend Thermos bottle beside enamel cups and mountain shapes.",
      },
      variants: [
        {
          id: "variant-weekend-thermos-evergreen",
          sku: "NSG-THERMOS-001",
          optionLabel: "Evergreen",
          priceMinor: 4600,
          currency: "USD",
          stockOnHand: 4,
        },
      ],
    },
    {
      id: "prod-trail-lantern",
      slug: "trail-lantern",
      name: "Trail Lantern",
      shortDescription: "A warm glow piece for dusk setups and quiet porch dinners.",
      category: "Camp Lighting",
      image: {
        src: "/images/catalog/trail-lantern.svg",
        alt: "Trail Lantern glowing against a twilight sky and ridgeline.",
      },
      variants: [
        {
          id: "variant-trail-lantern-sandstone",
          sku: "NSG-LANTERN-001",
          optionLabel: "Sandstone",
          priceMinor: 5400,
          currency: "USD",
          stockOnHand: 8,
        },
      ],
    },
    {
      id: "prod-ridge-blanket",
      slug: "ridge-blanket",
      name: "Ridge Blanket",
      shortDescription: "A heavyweight woven layer for camp stools, porches, and late nights.",
      category: "Camp Comfort",
      image: {
        src: "/images/catalog/ridge-blanket.svg",
        alt: "Ridge Blanket folded over a camp stool with stitched stripes.",
      },
      variants: [
        {
          id: "variant-ridge-blanket-ochre-stripe",
          sku: "NSG-BLANKET-001",
          optionLabel: "Ochre Stripe",
          priceMinor: 7200,
          currency: "USD",
          stockOnHand: 0,
        },
      ],
    },
    {
      id: "prod-wayfinder-tote",
      slug: "wayfinder-tote",
      name: "Wayfinder Tote",
      shortDescription: "A canvas carryall for market loops, trail maps, and cabin errands.",
      category: "Carry Goods",
      image: {
        src: "/images/catalog/wayfinder-tote.svg",
        alt: "Wayfinder Tote bag with handles and a compass-style badge.",
      },
      variants: [
        {
          id: "variant-wayfinder-tote-canvas",
          sku: "NSG-TOTE-001",
          optionLabel: "Canvas",
          priceMinor: 3900,
          currency: "USD",
          stockOnHand: 15,
        },
      ],
    },
    {
      id: "prod-summit-mug",
      slug: "summit-mug",
      name: "Summit Mug",
      shortDescription: "An enamel cup for sunrise tea, camp coffee, and shelf display.",
      category: "Camp Kitchen",
      image: {
        src: "/images/catalog/summit-mug.svg",
        alt: "Summit Mug enamel cup with steam and a sunrise horizon.",
      },
      variants: [
        {
          id: "variant-summit-mug-dawn-white",
          sku: "NSG-MUG-001",
          optionLabel: "Dawn White",
          priceMinor: 2200,
          currency: "USD",
          stockOnHand: 9,
        },
      ],
    },
  ],
};

export class DemoCatalogProvider implements CatalogProvider {
  readonly source = "demo" as const;

  async readCatalog(): Promise<unknown> {
    return demoCatalogPayload;
  }
}

export function createDemoCatalogProvider(): CatalogProvider {
  return new DemoCatalogProvider();
}

export { demoCatalogPayload };

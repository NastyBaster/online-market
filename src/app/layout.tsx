import type { CSSProperties, ReactNode } from "react";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import "./globals.css";
import { getCatalog } from "@/modules/catalog";
import { resolveCart } from "@/modules/cart";
import { getStoreConfig } from "@/modules/store-config";
import { decodeCartCookie } from "@/providers/cart";

type RootLayoutProps = Readonly<{ children: ReactNode }>;

function createBrandStyle(
  store: Awaited<ReturnType<typeof getStoreConfig>>["config"],
): CSSProperties {
  return {
    "--store-accent": store.brand.accent,
    "--store-accent-foreground": store.brand.accentForeground,
    "--store-surface": store.brand.surface,
    "--store-surface-foreground": store.brand.surfaceForeground,
    "--store-muted-surface": store.brand.mutedSurface,
    "--store-muted-foreground": store.brand.mutedForeground,
    "--store-border": store.brand.border,
  } as CSSProperties;
}

function visibleLinks(store: Awaited<ReturnType<typeof getStoreConfig>>["config"]) {
  return Object.entries(store.contact.links).filter(
    (entry): entry is [string, string] => Boolean(entry[1]),
  );
}

export async function generateMetadata(): Promise<Metadata> {
  const { config } = await getStoreConfig();

  return {
    title: config.identity.name,
    description: config.identity.description,
    applicationName: config.identity.shortName,
  };
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const [storeResult, catalogResult, cookieStore] = await Promise.all([
    getStoreConfig(),
    getCatalog(),
    cookies(),
  ]);
  const store = storeResult.config;
  const links = visibleLinks(store);
  const cart = resolveCart(
    decodeCartCookie(cookieStore.get("cart")?.value),
    catalogResult.catalog,
  );
  const cartLabel = `Cart (${cart.itemCount})`;

  return (
    <html lang={store.locale}>
      <body style={createBrandStyle(store)}>
        <div className="shell">
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <header className="header">
            <div className="brand-lockup">
              <Link className="brand" href="/">
                {store.identity.name}
              </Link>
              <p className="brand-copy">{store.identity.description}</p>
            </div>
            <nav className="nav" aria-label="Primary navigation">
              <a href="#about">Introduction</a>
              <a href="#catalog">Catalog</a>
              <Link aria-label={cartLabel} href="/cart">
                {cartLabel}
              </Link>
              <a href="#contact">Contact</a>
            </nav>
          </header>
          {children}
          <footer className="footer" id="contact">
            <div>
              <p className="footer-title">{store.identity.shortName}</p>
              <p className="footer-copy">{store.identity.description}</p>
            </div>
            <div className="footer-contact">
              <a href={`mailto:${store.contact.email}`}>{store.contact.email}</a>
              <a href={`tel:${store.contact.phone}`}>{store.contact.phone}</a>
              {links.map(([label, href]) => (
                <a key={label} href={href}>
                  {label}
                </a>
              ))}
            </div>
            <p className="footer-meta">
              {store.currency} storefront preview
              {store.demoMode ? " | demo mode only" : ""}
              {storeResult.status === "fallback" ? " | safe fallback config" : ""}
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}

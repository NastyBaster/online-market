import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { getStoreConfig } from "@/modules/store-config";

export const metadata: Metadata = { title: "Storefront Foundation", description: "A reusable storefront foundation." };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const store = getStoreConfig();
  return <html lang="en"><body><div className="shell"><header className="header"><Link className="brand" href="/">{store.name}</Link><nav className="nav" aria-label="Primary navigation"><a href="#about">About</a><a href="#status">Status</a></nav></header>{children}<footer className="footer">Foundation preview · no real transactions</footer></div></body></html>;
}

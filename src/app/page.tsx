import { getStoreConfig } from "@/modules/store-config";

export default function HomePage() {
  const store = getStoreConfig();
  return <main className="main"><section className="hero" id="about" aria-labelledby="page-title"><div className="eyebrow">Storefront Foundation</div><h1 id="page-title">A clear starting point for your storefront.</h1><p>This accessible placeholder establishes the app shell, responsive layout, and configuration boundary for future shopping experiences.</p><div className="status" id="status" role="status">DEMO_MODE: {store.demoMode ? "enabled" : "disabled"}</div></section></main>;
}

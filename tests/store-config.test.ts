import { describe, expect, it } from "vitest";
import { getStoreConfig } from "@/modules/store-config";

describe("store configuration", () => {
  it("parses demo mode and store name from environment", () => {
    expect(getStoreConfig({ DEMO_MODE: "false", NEXT_PUBLIC_STORE_NAME: "Demo Shop" })).toEqual({ name: "Demo Shop", demoMode: false });
    expect(getStoreConfig({ DEMO_MODE: "true", NEXT_PUBLIC_STORE_NAME: "Preview" }).demoMode).toBe(true);
  });
});

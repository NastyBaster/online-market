import { expect, test } from "@playwright/test";

test("home page renders with accessible navigation and demo status", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /clear starting point/i })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("DEMO_MODE: enabled");
  await page.getByRole("link", { name: "About" }).focus();
  await expect(page.getByRole("link", { name: "About" })).toBeFocused();
});

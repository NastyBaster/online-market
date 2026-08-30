import { expect, test } from "@playwright/test";

test("home page renders a branded storefront shell with keyboard navigation", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toContainText("Northstar Goods");
  await expect(page).toHaveTitle("Northstar Goods");
  await expect(page.getByRole("heading", { level: 1, name: "Northstar Goods" })).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Demo mode: enabled");
  await expect(page.getByRole("contentinfo")).toContainText("hello@northstar-demo.test");

  const overflow = await page.evaluate(() => {
    const viewport = document.documentElement.getBoundingClientRect().width;

    return Array.from(document.querySelectorAll("body *"))
      .map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          left: rect.left,
          right: rect.right,
          width: rect.width,
        };
      })
      .filter((rect) => rect.left < -1 || rect.right > viewport + 1 || rect.width > viewport + 1);
  });

  expect(overflow).toEqual([]);

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  await page.getByRole("link", { name: "Northstar Goods" }).focus();
  await expect(page.getByRole("link", { name: "Northstar Goods" })).toBeFocused();
});

import { expect, test } from "@playwright/test";

test("catalog renders six mapped demo products without horizontal overflow", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("banner")).toContainText("Northstar Goods");
  await expect(page).toHaveTitle("Northstar Goods");
  await expect(
    page.getByRole("heading", { level: 1, name: "Demo catalog for everyday camp rituals" }),
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Demo mode: enabled");
  await expect(page.getByRole("contentinfo")).toContainText("hello@northstar-demo.test");
  await expect(page.getByRole("list", { name: "Demo products" })).toBeVisible();
  await expect(page.locator(".catalog-card")).toHaveCount(6);
  await expect(
    page.getByAltText("Field Journal notebook with a brass pen on a warm desk."),
  ).toBeVisible();

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
});

test("catalog grid matches the viewport", async ({ page }) => {
  await page.goto("/");

  const firstCard = page.locator(".catalog-card").nth(0);
  const secondCard = page.locator(".catalog-card").nth(1);
  const thirdCard = page.locator(".catalog-card").nth(2);

  const [firstBox, secondBox, thirdBox] = await Promise.all([
    firstCard.boundingBox(),
    secondCard.boundingBox(),
    thirdCard.boundingBox(),
  ]);

  expect(firstBox).not.toBeNull();
  expect(secondBox).not.toBeNull();
  expect(thirdBox).not.toBeNull();

  const viewport = page.viewportSize();
  expect(viewport).not.toBeNull();

  if ((viewport?.width ?? 0) < 720) {
    expect(Math.abs((firstBox?.x ?? 0) - (secondBox?.x ?? 0))).toBeLessThan(8);
    expect((secondBox?.y ?? 0) - (firstBox?.y ?? 0)).toBeGreaterThan(40);
    return;
  }

  expect(Math.abs((firstBox?.y ?? 0) - (secondBox?.y ?? 0))).toBeLessThan(8);
  expect(Math.abs((secondBox?.y ?? 0) - (thirdBox?.y ?? 0))).toBeLessThan(8);
});

test("catalog supports keyboard navigation", async ({ page }) => {
  await page.goto("/");

  const skipLink = page.getByRole("link", { name: "Skip to content" });
  await skipLink.focus();
  await expect(skipLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#main-content")).toBeFocused();

  const firstCard = page.locator(".catalog-card-link").first();
  await firstCard.focus();
  await expect(firstCard).toBeFocused();
  await expect(firstCard).toContainText("Field Journal");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/products\/field-journal$/);
});

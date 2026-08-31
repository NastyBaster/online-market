import { expect, test } from "@playwright/test";

async function warmProductRoute(
  page: Parameters<typeof test>[0]["page"],
  path: string,
  marker: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await page.request.get(path);
    const body = await response.text();

    if (body.includes(marker)) {
      return;
    }

    await page.waitForTimeout(500);
  }

  throw new Error(`Route ${path} did not render expected marker: ${marker}`);
}

test("catalog cards link to product details pages", async ({ page }) => {
  await page.goto("/");

  const cards = page.locator(".catalog-card-link");
  await expect(cards).toHaveCount(6);

  await expect(
    page.getByRole("link", { name: /Field Journal/i }),
  ).toHaveAttribute("href", "/products/field-journal");
  await expect(
    page.getByRole("link", { name: /Ridge Blanket/i }),
  ).toHaveAttribute("href", "/products/ridge-blanket");

  await warmProductRoute(page, "/products/field-journal", "Field Journal");
  await page.getByRole("link", { name: /Field Journal/i }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Field Journal" })).toBeVisible();
});

test("product details render mapped data and keyboard back navigation", async ({ page }) => {
  await warmProductRoute(page, "/products/field-journal", "Field Journal");
  await page.goto("/products/field-journal");

  await expect(page).toHaveURL(/\/products\/field-journal$/);
  await expect(page).toHaveTitle(/Field Journal \| Northstar Goods/);
  await expect(page.getByRole("heading", { level: 1, name: "Field Journal" })).toBeVisible();
  await expect(
    page.getByText("A desk-ready notebook for trail notes, packing lists, and sketches."),
  ).toBeVisible();
  await expect(page.getByText("$28.00")).toBeVisible();
  await expect(page.getByText("Clay Cover")).toBeVisible();
  await expect(page.getByText("NSG-JOURNAL-001")).toBeVisible();
  await expect(page.locator(".availability-pill")).toHaveText("In stock");

  const backLink = page.getByRole("link", { name: "Back to catalog" });
  await backLink.focus();
  await expect(backLink).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/#catalog$/);
  await expect(page.getByRole("heading", { level: 2, name: /Six demo products/i })).toBeVisible();
});

test("sold-out product details show a non-interactive sold-out state", async ({ page }) => {
  await warmProductRoute(page, "/products/ridge-blanket", "Ridge Blanket");
  await page.goto("/products/ridge-blanket");

  await expect(page.getByRole("heading", { level: 1, name: "Ridge Blanket" })).toBeVisible();
  await expect(page.getByText("$72.00")).toBeVisible();
  await expect(page.locator(".availability-pill")).toHaveText("Sold out");
  await expect(page.getByText("Ochre Stripe")).toBeVisible();
  await expect(page.getByText("NSG-BLANKET-001")).toBeVisible();
  await expect(
    page.getByText("This demo product is currently sold out."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /add to cart/i }),
  ).toHaveCount(0);
});

test("unknown product slug returns the route not-found state", async ({ page }) => {
  await warmProductRoute(page, "/products/not-a-real-product", "Demo product not found");
  await page.goto("/products/not-a-real-product");
  await expect(page.getByRole("heading", { level: 1, name: "Demo product not found" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Return to catalog" })).toBeVisible();
});

test("product details avoid horizontal overflow on mobile", async ({ page }) => {
  await warmProductRoute(page, "/products/weekend-thermos", "Weekend Thermos");
  await page.goto("/products/weekend-thermos");

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

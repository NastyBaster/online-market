import { expect, test } from "@playwright/test";

test("anonymous cart supports the full happy path and persists across reloads", async ({ page }) => {
  await page.goto("/products/field-journal");

  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("status")).toContainText("Added to cart.");
  await expect(page.getByRole("link", { name: "Cart (1)" })).toBeVisible();

  await page.getByRole("link", { name: "Cart (1)" }).click();
  await expect(page).toHaveURL(/\/cart$/);
  await expect(page.getByRole("heading", { level: 1, name: "Cart" })).toBeVisible();
  await expect(page.getByText("Field Journal")).toBeVisible();
  await expect(page.getByText("Clay Cover")).toBeVisible();
  await expect(page.getByText("NSG-JOURNAL-001")).toBeVisible();
  await expect(page.locator(".cart-line-pricing")).toContainText("$28.00");
  await expect(page.locator(".cart-summary")).toContainText("Items");
  await expect(page.locator(".cart-summary")).toContainText("1");
  await expect(page.locator(".cart-summary")).toContainText("$28.00");

  await page.getByRole("button", { name: "Increase Field Journal quantity" }).click();
  await expect(page.getByRole("status")).toContainText("Cart updated.");
  await expect(page.getByRole("link", { name: "Cart (2)" })).toBeVisible();
  await expect(page.locator("#quantity-variant-field-journal-clay-cover")).toHaveValue("2");
  await expect(page.locator(".cart-line-pricing")).toContainText("$56.00");
  await expect(page.locator(".cart-summary")).toContainText("$56.00");

  await page.reload();
  await expect(page.getByRole("link", { name: "Cart (2)" })).toBeVisible();
  await expect(page.locator("#quantity-variant-field-journal-clay-cover")).toHaveValue("2");

  await page.getByRole("button", { name: "Remove" }).click();
  await expect(page.getByRole("heading", { level: 2, name: "Your cart is empty" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Browse catalog" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Cart (0)" })).toBeVisible();
});

test("forged cart mutations reject sold-out, unknown, and invalid quantities", async ({ page }) => {
  const soldOutResponse = await page.request.post("/cart/add", {
    form: {
      variantId: "variant-ridge-blanket-ochre-stripe",
      redirectTo: "/cart",
    },
    maxRedirects: 0,
  });

  expect(soldOutResponse.status()).toBe(303);
  expect(soldOutResponse.headers().location).toContain("cartStatus=sold-out");

  const unknownResponse = await page.request.post("/cart/add", {
    form: {
      variantId: "missing-variant",
      redirectTo: "/cart",
    },
    maxRedirects: 0,
  });

  expect(unknownResponse.status()).toBe(303);
  expect(unknownResponse.headers().location).toContain("cartStatus=unknown-variant");

  for (const quantity of ["0", "-1", "1.5", "NaN", "999"]) {
    const response = await page.request.post("/cart/update", {
      form: {
        variantId: "variant-field-journal-clay-cover",
        quantity,
        redirectTo: "/cart",
      },
      maxRedirects: 0,
    });

    expect(response.status()).toBe(303);
    expect(response.headers().location).toContain("cartStatus=invalid-quantity");
  }
});

test("tampered cookies fail closed and cart pages remain healthy", async ({ page, context }) => {
  await context.addCookies([
    {
      name: "cart",
      value: "malformed.cookie.value",
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);

  await page.goto("/cart");
  await expect(page.getByRole("heading", { level: 2, name: "Your cart is empty" })).toBeVisible();
  await expect(page.getByText("$56.00")).toHaveCount(0);
});

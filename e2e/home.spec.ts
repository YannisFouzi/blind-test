import { test, expect } from "@playwright/test";

test("homepage loads and shows title", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /blind test/i })).toBeVisible();
});

test("admin page shows login button when logged out", async ({ page }) => {
  await page.goto("/admin");
  await expect(
    page.getByRole("button", { name: /se connecter avec google/i })
  ).toBeVisible();
});

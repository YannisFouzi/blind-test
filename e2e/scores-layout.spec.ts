import { expect, test } from "@playwright/test";

const VIEWPORTS = [
  { name: "desktop-1023x911", width: 1023, height: 911 },
  { name: "tablet-900x911", width: 900, height: 911 },
  { name: "mobile-standard-430x932", width: 430, height: 932 },
  { name: "mobile-micro-430x650", width: 430, height: 650 },
];

for (const viewport of VIEWPORTS) {
  test(`scores solo layout remains stable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("/scores/solo?correct=12&incorrect=3");

    const homeButton = page.getByRole("button", { name: /accueil/i });
    const title = page.locator("h1", { hasText: /vos resultats/i });

    await expect(homeButton).toBeVisible();
    await expect(title).toBeVisible();

    const homeBox = await homeButton.boundingBox();
    const titleBox = await title.boundingBox();

    expect(homeBox).not.toBeNull();
    expect(titleBox).not.toBeNull();

    expect((homeBox?.y ?? 0) + (homeBox?.height ?? 0) + 4).toBeLessThan(
      titleBox?.y ?? Number.MAX_SAFE_INTEGER
    );

    await expect(page).toHaveScreenshot(`scores-solo-${viewport.name}.png`, {
      fullPage: true,
      animations: "disabled",
      maxDiffPixels: 80,
    });
  });
}

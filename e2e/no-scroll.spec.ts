import { expect, test, type Page } from "@playwright/test";
import { buildGameplayFixtureUrl } from "./fixtures/gameplay-states";

const expectNoDocumentScroll = async (page: Page, tolerancePx = 1) => {
  const metrics = await page.evaluate(() => {
    const de = document.documentElement;
    const body = document.body;

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      deClientWidth: de.clientWidth,
      deClientHeight: de.clientHeight,
      deScrollWidth: de.scrollWidth,
      deScrollHeight: de.scrollHeight,
      bodyClientWidth: body.clientWidth,
      bodyClientHeight: body.clientHeight,
      bodyScrollWidth: body.scrollWidth,
      bodyScrollHeight: body.scrollHeight,
    };
  });

  expect(metrics.deScrollHeight).toBeLessThanOrEqual(metrics.deClientHeight + tolerancePx);
  expect(metrics.bodyScrollHeight).toBeLessThanOrEqual(metrics.bodyClientHeight + tolerancePx);
  expect(metrics.deScrollWidth).toBeLessThanOrEqual(metrics.deClientWidth + tolerancePx);
  expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.bodyClientWidth + tolerancePx);
};

test.describe("gameplay should fit without scroll", () => {
  const cases = [
    { name: "desktop-large", width: 1660, height: 900 },
    { name: "desktop", width: 1280, height: 900 },
    { name: "tablet", width: 1023, height: 911 },
    { name: "mobile-standard", width: 768, height: 800 },
    { name: "mobile-micro", width: 375, height: 667 },
  ] as const;

  for (const viewport of cases) {
    test(`multi revealed double cards=8 ${viewport.name} ${viewport.width}x${viewport.height}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto(
        buildGameplayFixtureUrl({
          mode: "multi",
          cards: 8,
          variant: "double",
          state: "revealed",
        })
      );

      await expect(page.getByTestId("fixture-root")).toBeVisible();
      await expect(page.getByTestId("player-dome")).toBeVisible();
      await expect(page.getByTestId("fixture-home-button")).toBeVisible();
      await expect(page.getByTestId("fixture-quit-button")).toBeVisible();
      const primaryAction = page.locator('[data-testid="fixture-primary-action"]:visible');
      await expect(primaryAction).toHaveCount(1);
      await expect(primaryAction).toBeVisible();

      await expectNoDocumentScroll(page);
    });
  }
});

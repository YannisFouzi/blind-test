import { expect, test, type Page } from "@playwright/test";
import {
  buildGameplayFixtureUrl,
  GAMEPLAY_CARD_COUNTS,
  GAMEPLAY_REVEALED_VARIANTS,
  GAMEPLAY_STATE_VARIANTS,
  GAMEPLAY_STATES_FOR_COUNT_FIVE,
  GAMEPLAY_VIEWPORTS,
  type FixtureState,
  type FixtureVariant,
} from "./fixtures/gameplay-states";
import {
  expectCenteredWithinSelector,
  getVisibleBoundingBoxes,
  expectNoOverlapBetweenSelectors,
  expectVerticalGapAtLeast,
} from "./fixtures/layout-assertions";

const openFixture = async ({
  page,
  cards,
  variant,
  state,
}: {
  page: Page;
  cards: number;
  variant: FixtureVariant;
  state: FixtureState;
}) => {
  await page.goto(
    buildGameplayFixtureUrl({
      mode: "multi",
      cards,
      variant,
      state,
    })
  );
  await expect(page.getByTestId("fixture-root")).toBeVisible();
  await page.waitForLoadState("networkidle");
};

const assertMultiLayout = async ({
  page,
  cards,
  viewportWidth,
}: {
  page: Page;
  cards: number;
  viewportWidth: number;
}) => {
  await expect(page.getByTestId("fixture-home-button")).toBeVisible();
  await expect(page.getByTestId("fixture-quit-button")).toBeVisible();

  await page.waitForSelector('[data-testid="work-card-item"]', { state: 'attached', timeout: 10000 });
  await page.waitForTimeout(1500);

  await expect(page.getByTestId("player-dome")).toBeVisible();
  const visibleScoreboards = await getVisibleBoundingBoxes(page, '[data-testid="players-scoreboard"]');
  expect(visibleScoreboards.length).toBeGreaterThan(0);

  if (viewportWidth >= 1024) {
    await expectNoOverlapBetweenSelectors(
      page,
      '[data-testid="players-scoreboard"]',
      '[data-testid="work-grid"]'
    );
  }
  await expectVerticalGapAtLeast(page, ".game-action-button", '[data-testid="player-dome"]', 8);

  if (viewportWidth >= 1024 && cards === 7) {
    await expectCenteredWithinSelector(
      page,
      '[data-testid="work-card-item"][data-work-index="6"]',
      '[data-testid="work-grid"]',
      4
    );
  }

  if (viewportWidth >= 1024 && cards === 8) {
    await expectCenteredWithinSelector(
      page,
      '[data-testid="work-card-item"][data-work-index="6"]',
      '[data-testid="work-grid"]',
      4
    );
    await expectCenteredWithinSelector(
      page,
      '[data-testid="work-card-item"][data-work-index="7"]',
      '[data-testid="work-grid"]',
      4
    );
  }
};

for (const viewport of GAMEPLAY_VIEWPORTS) {
  test.describe(`multi gameplay layout ${viewport.name}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    for (const cards of GAMEPLAY_CARD_COUNTS) {
      for (const variant of GAMEPLAY_REVEALED_VARIANTS) {
        test(`reveal layout cards=${cards} variant=${variant}`, async ({ page }) => {
          await openFixture({ page, cards, variant, state: "revealed" });
          await assertMultiLayout({ page, cards, viewportWidth: viewport.width });

          await expect(page).toHaveScreenshot(
            `gameplay-multi-${viewport.name}-cards-${cards}-${variant}-revealed.png`,
            {
              fullPage: true,
              animations: "disabled",
              maxDiffPixels: 15000,
            }
          );
        });
      }
    }

    for (const variant of GAMEPLAY_STATE_VARIANTS) {
      for (const state of GAMEPLAY_STATES_FOR_COUNT_FIVE) {
        test(`state layout cards=5 variant=${variant} state=${state}`, async ({ page }) => {
          await openFixture({ page, cards: 5, variant, state });
          await assertMultiLayout({ page, cards: 5, viewportWidth: viewport.width });

          await expect(page).toHaveScreenshot(
            `gameplay-multi-${viewport.name}-cards-5-${variant}-${state}.png`,
            {
              fullPage: true,
              animations: "disabled",
              maxDiffPixels: 15000,
            }
          );
        });
      }
    }
  });
}

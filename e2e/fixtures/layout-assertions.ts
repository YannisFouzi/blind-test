import { expect, type Page } from "@playwright/test";

type Box = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const boxesOverlap = (a: Box, b: Box) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

const centerX = (box: Box) => box.x + box.width / 2;

export const getVisibleBoundingBoxes = async (
  page: Page,
  selector: string
): Promise<Box[]> => {
  const locator = page.locator(selector);
  const count = await locator.count();
  const boxes: Box[] = [];

  for (let index = 0; index < count; index += 1) {
    const target = locator.nth(index);
    if (!(await target.isVisible())) continue;
    const box = await target.boundingBox();
    if (!box) continue;
    boxes.push(box);
  }

  return boxes;
};

export const getFirstVisibleBoundingBox = async (
  page: Page,
  selector: string
): Promise<Box | null> => {
  const boxes = await getVisibleBoundingBoxes(page, selector);
  return boxes[0] ?? null;
};

export const getBottomMostVisibleBoundingBox = async (
  page: Page,
  selector: string
): Promise<Box | null> => {
  const boxes = await getVisibleBoundingBoxes(page, selector);
  if (boxes.length === 0) return null;

  return boxes.reduce((current, next) =>
    current.y + current.height >= next.y + next.height ? current : next
  );
};

export const expectNoOverlapBetweenSelectors = async (
  page: Page,
  selectorA: string,
  selectorB: string
) => {
  const boxA = await getFirstVisibleBoundingBox(page, selectorA);
  const boxB = await getFirstVisibleBoundingBox(page, selectorB);

  expect(boxA).not.toBeNull();
  expect(boxB).not.toBeNull();
  if (!boxA || !boxB) return;

  expect(boxesOverlap(boxA, boxB)).toBe(false);
};

export const expectVerticalGapAtLeast = async (
  page: Page,
  upperSelector: string,
  lowerSelector: string,
  minGap: number
) => {
  const upperBox = await getBottomMostVisibleBoundingBox(page, upperSelector);
  const lowerBox = await getFirstVisibleBoundingBox(page, lowerSelector);

  if (!upperBox || !lowerBox) return;

  const gap = lowerBox.y - (upperBox.y + upperBox.height);
  expect(gap).toBeGreaterThanOrEqual(minGap);
};

export const expectCenteredWithinSelector = async (
  page: Page,
  targetSelector: string,
  containerSelector: string,
  tolerancePx: number
) => {
  const targetBox = await getFirstVisibleBoundingBox(page, targetSelector);
  const containerBox = await getFirstVisibleBoundingBox(page, containerSelector);

  expect(targetBox).not.toBeNull();
  expect(containerBox).not.toBeNull();
  if (!targetBox || !containerBox) return;

  const delta = Math.abs(centerX(targetBox) - centerX(containerBox));
  expect(delta).toBeLessThanOrEqual(tolerancePx);
};

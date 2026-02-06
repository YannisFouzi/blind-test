import { describe, expect, it } from "vitest";
import { getLayoutPolicy } from "./layoutPolicy";

describe("getLayoutPolicy", () => {
  it("returns no mobile top/scoreboard behavior in solo mode", () => {
    const policy = getLayoutPolicy({ mode: "solo", cardCount: 4 });

    expect(policy).toEqual({
      useInlineTopButtonsMobile: false,
      useFloatingScoreboardMobile: false,
      needsFloatingScoreboardGap: false,
    });
  });

  it("enables inline top buttons and floating scoreboard in multi for 2..6 cards", () => {
    for (const count of [2, 3, 4, 5, 6]) {
      const policy = getLayoutPolicy({ mode: "multi", cardCount: count });

      expect(policy.useInlineTopButtonsMobile).toBe(true);
      expect(policy.useFloatingScoreboardMobile).toBe(true);
    }
  });

  it("adds floating gap only from 3 cards in multi", () => {
    const twoCards = getLayoutPolicy({ mode: "multi", cardCount: 2 });
    const threeCards = getLayoutPolicy({ mode: "multi", cardCount: 3 });
    const sixCards = getLayoutPolicy({ mode: "multi", cardCount: 6 });

    expect(twoCards.needsFloatingScoreboardGap).toBe(false);
    expect(threeCards.needsFloatingScoreboardGap).toBe(true);
    expect(sixCards.needsFloatingScoreboardGap).toBe(true);
  });

  it("disables inline/floating behavior for multi at 7 and 8 cards", () => {
    for (const count of [7, 8]) {
      const policy = getLayoutPolicy({ mode: "multi", cardCount: count });

      expect(policy).toEqual({
        useInlineTopButtonsMobile: false,
        useFloatingScoreboardMobile: false,
        needsFloatingScoreboardGap: false,
      });
    }
  });

  it("keeps default policy for multi card counts outside 0..8 table", () => {
    for (const count of [9, 10, 99]) {
      const policy = getLayoutPolicy({ mode: "multi", cardCount: count });

      expect(policy).toEqual({
        useInlineTopButtonsMobile: false,
        useFloatingScoreboardMobile: false,
        needsFloatingScoreboardGap: false,
      });
    }
  });
});

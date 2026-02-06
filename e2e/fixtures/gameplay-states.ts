export const GAMEPLAY_VIEWPORTS = [
  { name: "desktop-1280x900", width: 1280, height: 900 },
  { name: "tablet-1023x911", width: 1023, height: 911 },
  { name: "mobile-standard-768x800", width: 768, height: 800 },
  { name: "mobile-micro-375x667", width: 375, height: 667 },
] as const;

export const GAMEPLAY_CARD_COUNTS = [2, 3, 4, 5, 6, 7, 8] as const;

export const GAMEPLAY_REVEALED_VARIANTS = ["single", "double"] as const;
export const GAMEPLAY_STATE_VARIANTS = ["single", "double"] as const;
export const GAMEPLAY_STATES_FOR_COUNT_FIVE = ["initial", "selected"] as const;

export type FixtureMode = "solo" | "multi";
export type FixtureVariant = (typeof GAMEPLAY_REVEALED_VARIANTS)[number];
export type FixtureState = "initial" | "selected" | "revealed";

export const buildGameplayFixtureUrl = ({
  mode,
  cards,
  variant,
  state,
}: {
  mode: FixtureMode;
  cards: number;
  variant: FixtureVariant;
  state: FixtureState;
}) => {
  const params = new URLSearchParams({
    mode,
    cards: String(cards),
    variant,
    state,
  });

  return `/test/gameplay-fixture?${params.toString()}`;
};

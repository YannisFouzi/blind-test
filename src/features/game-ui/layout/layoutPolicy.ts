export type GameMode = "solo" | "multi";

export type LayoutPolicy = {
  useInlineTopButtonsMobile: boolean;
  useFloatingScoreboardMobile: boolean;
  needsFloatingScoreboardGap: boolean;
};

const DEFAULT_POLICY: LayoutPolicy = {
  useInlineTopButtonsMobile: false,
  useFloatingScoreboardMobile: false,
  needsFloatingScoreboardGap: false,
};

const MULTI_POLICY_BY_CARD_COUNT: Record<number, LayoutPolicy> = {
  0: DEFAULT_POLICY,
  1: DEFAULT_POLICY,
  2: {
    useInlineTopButtonsMobile: true,
    useFloatingScoreboardMobile: true,
    needsFloatingScoreboardGap: false,
  },
  3: {
    useInlineTopButtonsMobile: true,
    useFloatingScoreboardMobile: true,
    needsFloatingScoreboardGap: true,
  },
  4: {
    useInlineTopButtonsMobile: true,
    useFloatingScoreboardMobile: true,
    needsFloatingScoreboardGap: true,
  },
  5: {
    useInlineTopButtonsMobile: true,
    useFloatingScoreboardMobile: true,
    needsFloatingScoreboardGap: true,
  },
  6: {
    useInlineTopButtonsMobile: true,
    useFloatingScoreboardMobile: true,
    needsFloatingScoreboardGap: true,
  },
  7: DEFAULT_POLICY,
  8: DEFAULT_POLICY,
};

export const getLayoutPolicy = ({
  mode,
  cardCount,
}: {
  mode: GameMode;
  cardCount: number;
}): LayoutPolicy => {
  if (mode !== "multi") {
    return DEFAULT_POLICY;
  }

  return MULTI_POLICY_BY_CARD_COUNT[cardCount] ?? DEFAULT_POLICY;
};

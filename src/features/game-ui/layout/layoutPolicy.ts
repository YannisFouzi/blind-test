/**
 * Layout Policy for Top Chrome & Scoreboard
 *
 * Détermine le comportement du top chrome (buttons ACCUEIL/QUITTER)
 * et du scoreboard selon le mode de jeu et le nombre de cards.
 *
 * Cette policy est complémentaire à workGridPolicy.ts qui gère la grille de cards.
 */

export type GameMode = "solo" | "multi";

export type LayoutPolicy = {
  /** Boutons top en ligne (horizontal) sur mobile au lieu de stacked (vertical) */
  useInlineTopButtonsMobile: boolean;
  /** Scoreboard en floating (position fixed) sur mobile au lieu de inline */
  useFloatingScoreboardMobile: boolean;
  /** Ajouter gap vertical entre scoreboard floating et grille (évite overlap) */
  needsFloatingScoreboardGap: boolean;
};

const DEFAULT_POLICY: LayoutPolicy = {
  useInlineTopButtonsMobile: false,
  useFloatingScoreboardMobile: false,
  needsFloatingScoreboardGap: false,
};

/**
 * Policy top chrome/scoreboard par cardCount en mode multi
 *
 * Stratégie :
 * - 2 cards : floating scoreboard, inline buttons, pas de gap (peu de hauteur utilisée)
 * - 3-6 cards : floating scoreboard, inline buttons, gap nécessaire (grille occupe plus de hauteur)
 * - 7 cards : floating scoreboard, buttons stacked (UI dense), scoreboard docked à côté ACCUEIL
 * - 8 cards : retour DEFAULT (scoreboard inline, pas floating, pas de contraintes spéciales)
 */
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
  7: {
    // For 7 cards the UI is dense: keep top buttons stacked and dock the (floating) scoreboard next to ACCUEIL.
    useInlineTopButtonsMobile: false,
    useFloatingScoreboardMobile: true,
    needsFloatingScoreboardGap: false,
  },
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

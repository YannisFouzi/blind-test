/**
 * Work Grid Layout Policy
 *
 * Source de vérité unique pour le placement des cards dans la grille.
 * Conforme à GRID_LAYOUT_SPEC.md
 */

export type ContainerWidthBucket = "mobile" | "desktop";
export type GridDensity = "normal" | "dense";

export type GridItemPlacement = {
  index: number;
  column: number;
  row: number;
  columnSpan: number;
  centered: boolean;
};

export type GridLayout = {
  columns: number;
  density: GridDensity;
  items: GridItemPlacement[];
};

/**
 * Détermine le bucket de largeur container
 */
export const getContainerWidthBucket = (containerWidth: number): ContainerWidthBucket => {
  return containerWidth >= 1024 ? "desktop" : "mobile";
};

/**
 * Génère le placement pour une grille stacked (1-3 cards)
 */
const getStackedLayout = (cardCount: number): GridLayout => {
  return {
    columns: 1,
    density: "normal",
    items: Array.from({ length: cardCount }, (_, index) => ({
      index,
      column: 1,
      row: index + 1,
      columnSpan: 1,
      centered: false,
    })),
  };
};

/**
 * Génère le placement pour 4 cards
 */
const getFourCardsLayout = (): GridLayout => {
  // Même pattern mobile et desktop : 2x2
  return {
    columns: 2,
    density: "normal",
    items: [
      { index: 0, column: 1, row: 1, columnSpan: 1, centered: false },
      { index: 1, column: 2, row: 1, columnSpan: 1, centered: false },
      { index: 2, column: 1, row: 2, columnSpan: 1, centered: false },
      { index: 3, column: 2, row: 2, columnSpan: 1, centered: false },
    ],
  };
};

/**
 * Génère le placement pour 5 cards (2+2+1 centré)
 */
const getFiveCardsLayout = (): GridLayout => {
  return {
    columns: 2,
    density: "normal",
    items: [
      { index: 0, column: 1, row: 1, columnSpan: 1, centered: false },
      { index: 1, column: 2, row: 1, columnSpan: 1, centered: false },
      { index: 2, column: 1, row: 2, columnSpan: 1, centered: false },
      { index: 3, column: 2, row: 2, columnSpan: 1, centered: false },
      { index: 4, column: 1, row: 3, columnSpan: 2, centered: true },
    ],
  };
};

/**
 * Génère le placement pour 6 cards
 */
const getSixCardsLayout = (bucket: ContainerWidthBucket): GridLayout => {
  if (bucket === "mobile") {
    return {
      columns: 2,
      density: "normal",
      items: [
        { index: 0, column: 1, row: 1, columnSpan: 1, centered: false },
        { index: 1, column: 2, row: 1, columnSpan: 1, centered: false },
        { index: 2, column: 1, row: 2, columnSpan: 1, centered: false },
        { index: 3, column: 2, row: 2, columnSpan: 1, centered: false },
        { index: 4, column: 1, row: 3, columnSpan: 1, centered: false },
        { index: 5, column: 2, row: 3, columnSpan: 1, centered: false },
      ],
    };
  }

  return {
    columns: 3,
    density: "normal",
    items: [
      { index: 0, column: 1, row: 1, columnSpan: 1, centered: false },
      { index: 1, column: 2, row: 1, columnSpan: 1, centered: false },
      { index: 2, column: 3, row: 1, columnSpan: 1, centered: false },
      { index: 3, column: 1, row: 2, columnSpan: 1, centered: false },
      { index: 4, column: 2, row: 2, columnSpan: 1, centered: false },
      { index: 5, column: 3, row: 2, columnSpan: 1, centered: false },
    ],
  };
};

/**
 * Génère le placement pour 7 cards (3+3+1 centré)
 */
const getSevenCardsLayout = (bucket: ContainerWidthBucket): GridLayout => {
  if (bucket === "mobile") {
    return {
      columns: 2,
      density: "normal",
      items: [
        { index: 0, column: 1, row: 1, columnSpan: 1, centered: false },
        { index: 1, column: 2, row: 1, columnSpan: 1, centered: false },
        { index: 2, column: 1, row: 2, columnSpan: 1, centered: false },
        { index: 3, column: 2, row: 2, columnSpan: 1, centered: false },
        { index: 4, column: 1, row: 3, columnSpan: 1, centered: false },
        { index: 5, column: 2, row: 3, columnSpan: 1, centered: false },
        { index: 6, column: 1, row: 4, columnSpan: 2, centered: true },
      ],
    };
  }

  return {
    columns: 3,
    density: "dense",
    items: [
      { index: 0, column: 1, row: 1, columnSpan: 1, centered: false },
      { index: 1, column: 2, row: 1, columnSpan: 1, centered: false },
      { index: 2, column: 3, row: 1, columnSpan: 1, centered: false },
      { index: 3, column: 1, row: 2, columnSpan: 1, centered: false },
      { index: 4, column: 2, row: 2, columnSpan: 1, centered: false },
      { index: 5, column: 3, row: 2, columnSpan: 1, centered: false },
      { index: 6, column: 2, row: 3, columnSpan: 1, centered: true },
    ],
  };
};

/**
 * Génère le placement pour 8 cards (3+3+1+1 centré)
 */
const getEightCardsLayout = (bucket: ContainerWidthBucket): GridLayout => {
  if (bucket === "mobile") {
    return {
      columns: 2,
      density: "normal",
      items: [
        { index: 0, column: 1, row: 1, columnSpan: 1, centered: false },
        { index: 1, column: 2, row: 1, columnSpan: 1, centered: false },
        { index: 2, column: 1, row: 2, columnSpan: 1, centered: false },
        { index: 3, column: 2, row: 2, columnSpan: 1, centered: false },
        { index: 4, column: 1, row: 3, columnSpan: 1, centered: false },
        { index: 5, column: 2, row: 3, columnSpan: 1, centered: false },
        { index: 6, column: 1, row: 4, columnSpan: 1, centered: false },
        { index: 7, column: 2, row: 4, columnSpan: 1, centered: false },
      ],
    };
  }

  return {
    columns: 3,
    density: "dense",
    items: [
      { index: 0, column: 1, row: 1, columnSpan: 1, centered: false },
      { index: 1, column: 2, row: 1, columnSpan: 1, centered: false },
      { index: 2, column: 3, row: 1, columnSpan: 1, centered: false },
      { index: 3, column: 1, row: 2, columnSpan: 1, centered: false },
      { index: 4, column: 2, row: 2, columnSpan: 1, centered: false },
      { index: 5, column: 3, row: 2, columnSpan: 1, centered: false },
      { index: 6, column: 2, row: 3, columnSpan: 1, centered: true },
      { index: 7, column: 2, row: 4, columnSpan: 1, centered: true },
    ],
  };
};

/**
 * API principale : retourne le layout complet pour un nombre de cards et une largeur container
 */
export const getWorkGridLayout = (cardCount: number, containerWidth: number): GridLayout => {
  const bucket = getContainerWidthBucket(containerWidth);

  if (cardCount <= 3) {
    return getStackedLayout(cardCount);
  }

  switch (cardCount) {
    case 4:
      return getFourCardsLayout();
    case 5:
      return getFiveCardsLayout();
    case 6:
      return getSixCardsLayout(bucket);
    case 7:
      return getSevenCardsLayout(bucket);
    case 8:
      return getEightCardsLayout(bucket);
    default:
      // Fallback pour cardCount > 8 (rare)
      return getStackedLayout(cardCount);
  }
};

import type { Universe } from "@/types";

export const CUSTOM_UNIVERSE_ID = "__custom__";
export const RANDOM_UNIVERSE_ID = "__random__";

export const RANDOM_UNIVERSE: Universe = {
  id: RANDOM_UNIVERSE_ID,
  name: "Mode aleatoire",
  description: "Selectionnez des oeuvres ; a chaque manche, un tirage aleatoire en affiche un nombre choisi.",
  color: "#10B981",
  icon: "shuffle",
  createdAt: new Date(),
};

export const MAX_WORKS_CUSTOM_MODE = 8;

export const WORKS_PER_ROUND_MIN = 2;
export const WORKS_PER_ROUND_MAX = 8;
export const WORKS_PER_ROUND_DEFAULT = 5;

export const UNIVERSE_BACKGROUND_IMAGES: Record<string, string> = {
  [CUSTOM_UNIVERSE_ID]: "/image/custom.avif",
  [RANDOM_UNIVERSE_ID]: "/image/custom.avif",
  disney: "/image/disney.webp",
  "star-wars": "/image/star-wars.webp",
  "harry-potter": "/image/harry_potter.webp",
  "seigneur-des-anneaux": "/image/lord-of-the-rings.webp",
  "the-last-of-us": "/image/the-last-of-us.webp",
  "from-software": "/image/from-software.webp",
};

const normalizeUniverseName = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[\u00e0\u00e2\u00e4]/g, "a")
    .replace(/[\u00e9\u00e8\u00ea\u00eb]/g, "e")
    .replace(/[\u00ee\u00ef]/g, "i")
    .replace(/[\u00f4\u00f6]/g, "o")
    .replace(/[\u00f9\u00fb\u00fc]/g, "u")
    .replace(/\u00e7/g, "c");

export const getUniverseBackgroundImage = (
  universeId: string,
  universeName?: string
): string | null =>
  UNIVERSE_BACKGROUND_IMAGES[universeId] ??
  (universeName ? UNIVERSE_BACKGROUND_IMAGES[normalizeUniverseName(universeName)] ?? null : null);

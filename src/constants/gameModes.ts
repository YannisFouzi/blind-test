import type { Universe } from "@/types";

/** ID partagé pour le mode custom (solo + multi) */
export const CUSTOM_UNIVERSE_ID = "__custom__";

/** ID partagé pour le mode aléatoire (solo + multi) */
export const RANDOM_UNIVERSE_ID = "__random__";

/** Univers virtuel pour le mode aléatoire */
export const RANDOM_UNIVERSE: Universe = {
  id: RANDOM_UNIVERSE_ID,
  name: "Mode aléatoire",
  description: "Sélectionnez des œuvres ; à chaque manche, un tirage aléatoire en affiche un nombre choisi.",
  color: "#10B981",
  icon: "shuffle",
  createdAt: new Date(),
};

/** Nombre d'œuvres proposées par manche : min fixe, max = cap ou taille du pool */
export const WORKS_PER_ROUND_MIN = 2;
export const WORKS_PER_ROUND_MAX = 8;
export const WORKS_PER_ROUND_DEFAULT = 5;

/**
 * Mapping ID ou nom normalisé → chemin image de fond (public/image/).
 * Custom et aléatoire utilisent custom.avif (recherche par id).
 * Les univers Firebase ont des id auto-générés ; on fait aussi la recherche par nom normalisé.
 * Pas d'image pour The Last of Us et From Software → fallback couleur.
 */
export const UNIVERSE_BACKGROUND_IMAGES: Record<string, string> = {
  [CUSTOM_UNIVERSE_ID]: "/image/custom.avif",
  [RANDOM_UNIVERSE_ID]: "/image/custom.avif",
  disney: "/image/disney.jpg",
  "star-wars": "/image/star-wars.webp",
  "harry-potter": "/image/harry_potter.jpg",
  "lord-of-the-rings": "/image/lord-of-the-rings.jpg",
  "seigneur-des-anneaux": "/image/lord-of-the-rings.jpg",
};

/** Normalise le nom d'univers pour la recherche d'image (lowercase, espaces → tirets) */
const normalizeUniverseName = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[àâä]/g, "a")
    .replace(/[éèêë]/g, "e")
    .replace(/[îï]/g, "i")
    .replace(/[ôö]/g, "o")
    .replace(/[ùûü]/g, "u")
    .replace(/ç/g, "c");

/**
 * Retourne le chemin de l'image de fond pour un univers.
 * Cherche d'abord par id (pour __custom__, __random__), puis par nom normalisé (Firebase).
 */
export const getUniverseBackgroundImage = (
  universeId: string,
  universeName?: string
): string | null =>
  UNIVERSE_BACKGROUND_IMAGES[universeId] ??
  (universeName ? UNIVERSE_BACKGROUND_IMAGES[normalizeUniverseName(universeName)] ?? null : null);

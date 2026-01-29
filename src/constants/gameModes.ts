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

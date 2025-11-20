import { nanoid } from "nanoid";
import shuffle from "lodash.shuffle";

/**
 * Formate un temps en secondes vers le format MM:SS
 * @param seconds - Temps en secondes
 * @returns Temps formaté (ex: "3:45")
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Mélange un tableau de façon aléatoire avec l'algorithme Fisher-Yates
 * ✅ CORRIGÉ : Utilise lodash.shuffle (implémentation Fisher-Yates)
 * ❌ AVANT : sort(() => Math.random() - 0.5) créait un biais statistique
 *
 * @param array - Tableau à mélanger
 * @returns Nouveau tableau mélangé de manière uniforme
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  return shuffle(array);
};

/**
 * Génère un identifiant unique cryptographiquement sûr
 * ✅ CORRIGÉ : Utilise nanoid (URL-safe, collision-resistant)
 * ❌ AVANT : Date.now() pouvait créer des collisions si appelé rapidement
 *
 * @returns ID unique de 21 caractères (ex: "V1StGXR8_Z5jdHi6B-myT")
 */
export const generateId = (): string => {
  return nanoid();
};

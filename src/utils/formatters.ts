/**
 * Formate un temps en secondes vers le format MM:SS
 */
export const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

/**
 * Mélange un tableau de façon aléatoire
 */
export const shuffleArray = <T>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

/**
 * Génère un identifiant unique basé sur la date
 */
export const generateId = (): string => {
  return Date.now().toString();
};

import type { Song, Work } from "@/types";

/**
 * Solo Game Types
 *
 * Types pour le mode solo du jeu (1 joueur)
 */

/**
 * État du jeu solo
 */
export interface SoloGameState {
  /** Liste des œuvres (albums, artistes, etc.) */
  works: Work[];

  /** Chanson actuellement jouée */
  currentSong: Song | null;

  /** Index de la chanson actuelle */
  currentSongIndex: number;

  /** Score du joueur */
  score: number;

  /** Dernier gain de points */
  lastGain: number | null;

  /** Afficher la réponse (après avoir répondu) */
  showAnswer: boolean;

  /** État du jeu */
  gameState: "idle" | "playing" | "finished";

  /** Chargement en cours */
  loading: boolean;

  /** Erreur éventuelle */
  error: string | null;
}

/**
 * Actions du jeu solo
 */
export interface SoloGameActions {
  /** Démarrer le jeu */
  startGame: () => void;

  /** Répondre à la question */
  handleAnswer: (workId: string) => void;

  /** Passer à la chanson suivante */
  nextSong: () => void;

  /** Recommencer le jeu */
  restartGame: () => void;

  /** Retourner à l'accueil */
  goHome: () => void;
}

/**
 * Hook useSoloGame - État + Actions
 */
export interface UseSoloGameReturn extends SoloGameState, SoloGameActions {}

/**
 * Options pour useSoloGame
 */
export interface UseSoloGameOptions {
  /** ID de l'univers (ex: "disney", "90s") */
  universeId: string;

  /** Callback pour précharger média suivant */
  preloadNextTrack?: (audioUrl: string) => void;

  /** Liste des œuvres autorisées (filtrage) */
  allowedWorks?: string[];

  /** Nombre maximum de chansons */
  maxSongs?: number;
}

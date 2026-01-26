import type { Work } from "@/types";

/**
 * Game UI Types
 *
 * Types pour les composants UI partagés (WorkSelector, PointsCelebration, etc.)
 */

/**
 * Props pour WorkSelector
 */
export interface WorkSelectorProps {
  /** Liste des œuvres à afficher */
  works: Work[];

  /** Réponse sélectionnée (ID de l'œuvre) */
  selectedAnswer?: string | null;

  /** Afficher la réponse correcte */
  showAnswer: boolean;

  /** ID de la réponse correcte */
  correctAnswer?: string | null;

  /** Réponses incorrectes (IDs) */
  wrongAnswers?: string[];

  /** Handler pour la sélection */
  onAnswer: (workId: string) => void;

  /** Désactivé (pendant l'attente) */
  disabled?: boolean;

  /** Chargement en cours */
  loading?: boolean;
}

/**
 * Props pour PointsCelebration
 */
export interface PointsCelebrationProps {
  /** Points gagnés (null si pas de gain récent) */
  points: number | null;

  /** Durée d'affichage en ms */
  duration?: number;

  /** Callback quand l'animation se termine */
  onComplete?: () => void;
}

/**
 * Props pour GameHeader
 */
export interface GameHeaderProps {
  /** Score actuel */
  score: number;

  /** Titre du jeu (optionnel) */
  title?: string;

  /** Afficher le bouton retour */
  showBackButton?: boolean;

  /** Handler pour le retour */
  onBack?: () => void;

  /** Actions additionnelles (boutons) */
  actions?: React.ReactNode;
}

/**
 * Props pour GameProgress
 */
export interface GameProgressProps {
  /** Chanson actuelle (index base 1) */
  current: number;

  /** Total de chansons */
  total: number;

  /** Afficher la barre de progression */
  showBar?: boolean;
}

/**
 * Props pour GameControls (audio)
 */
export interface GameControlsProps {
  /** Lecture en cours */
  isPlaying: boolean;

  /** Volume (0-1) */
  volume: number;

  /** Muet */
  isMuted: boolean;

  /** Progression (0-100) */
  progress: number;

  /** Durée (secondes) */
  duration: number;

  /** Mode no-seek */
  noSeek: boolean;

  /** Handler play/pause */
  onTogglePlay: () => void;

  /** Handler volume */
  onVolumeChange: (volume: number) => void;

  /** Handler mute */
  onToggleMute: () => void;

  /** Handler seek */
  onSeek?: (position: number) => void;

  /** Désactivé */
  disabled?: boolean;
}

/**
 * Store UI (Zustand) - État UI éphémère
 */
export interface GameUIStore {
  /** Afficher les particules */
  showParticles: boolean;

  /** Afficher la célébration de points */
  showPointsCelebration: boolean;

  /** Points de la célébration actuelle */
  celebrationPoints: number | null;

  /** Actions */
  setShowParticles: (show: boolean) => void;
  triggerPointsCelebration: (points: number) => void;
  clearPointsCelebration: () => void;
}

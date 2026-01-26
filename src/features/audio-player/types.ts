/**
 * Audio Player Types
 *
 * Types pour le lecteur audio (utilisé par solo et multi)
 */

/**
 * État du lecteur audio
 */
export interface AudioPlayerState {
  /** Lecture en cours */
  isPlaying: boolean;

  /** Volume (0-1) */
  volume: number;

  /** Muet */
  isMuted: boolean;

  /** Progression actuelle (0-100) */
  progress: number;

  /** Durée totale en secondes */
  duration: number;

  /** Temps actuel en secondes */
  currentTime: number;

  /** Chargement en cours */
  isLoading: boolean;

  /** Erreur éventuelle */
  error: string | null;

  /** URL audio actuelle */
  currentAudioUrl: string | null;

  /** Mode no-seek activé (désactive le contrôle de lecture) */
  noSeek: boolean;
}

/**
 * Actions du lecteur audio
 */
export interface AudioPlayerActions {
  /** Lire */
  play: () => void;

  /** Pause */
  pause: () => void;

  /** Toggle play/pause */
  togglePlay: () => void;

  /** Changer le volume (0-1) */
  setVolume: (volume: number) => void;

  /** Toggle mute */
  toggleMute: () => void;

  /** Seek à une position (0-100) */
  seek: (position: number) => void;

  /** Charger une nouvelle piste */
  loadTrack: (audioUrl: string, startTime?: number) => Promise<void>;

  /** Précharger une piste */
  preloadTrack: (audioUrl: string) => void;

  /** Reset le player */
  reset: () => void;
}

/**
 * Hook useAudioPlayer - État + Actions
 */
export interface UseAudioPlayerReturn extends AudioPlayerState, AudioPlayerActions {
  /** Référence au HTMLAudioElement */
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

/**
 * Options pour useAudioPlayer
 */
export interface UseAudioPlayerOptions {
  /** URL audio initiale (optionnel) */
  initialAudioUrl?: string;

  /** Temps de départ (secondes) */
  startTime?: number;

  /** Lecture automatique (au chargement de piste) */
  autoPlay?: boolean;

  /** Volume initial (0-1) */
  initialVolume?: number;

  /** Mode no-seek */
  noSeek?: boolean;

  /** Callback quand la piste se termine */
  onEnded?: () => void;

  /** Callback quand erreur */
  onError?: (error: string) => void;

  /** Callback quand la piste est prête */
  onReady?: () => void;
}

/**
 * Format d'affichage du temps audio
 */
export interface AudioTimeFormat {
  /** Minutes */
  minutes: number;

  /** Secondes */
  seconds: number;

  /** Format MM:SS */
  formatted: string;
}

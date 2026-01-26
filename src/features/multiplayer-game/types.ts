import type { Song, Work } from "@/types";

/**
 * Multiplayer Game Types
 *
 * Types pour le mode multijoueur (PartyKit WebSocket)
 */

/**
 * Joueur dans une room
 */
export interface RoomPlayer {
  /** ID unique du joueur */
  id: string;

  /** Nom d'affichage */
  displayName: string;

  /** Score actuel */
  score: number;

  /** Dernière réponse correcte/incorrecte */
  lastCorrect?: boolean;

  /** Dernier gain de points */
  lastGain?: number;

  /** Timestamp de connexion */
  connectedAt?: number;
}

/**
 * État de la room multijoueur
 */
export interface MultiplayerGameState {
  /** ID de la room */
  roomId: string;

  /** Liste des joueurs connectés */
  players: RoomPlayer[];

  /** Joueur actuel */
  currentPlayer: RoomPlayer | null;

  /** Est-ce que le joueur actuel est l'hôte */
  isHost: boolean;

  /** Liste des œuvres */
  works: Work[];

  /** Chanson actuellement jouée */
  currentSong: Song | null;

  /** Index de la chanson actuelle */
  currentSongIndex: number;

  /** Afficher la réponse */
  showAnswer: boolean;

  /** État du jeu */
  gameState: "idle" | "lobby" | "playing" | "results";

  /** Chargement en cours */
  loading: boolean;

  /** Erreur éventuelle */
  error: string | null;

  /** État de la connexion WebSocket */
  connectionState: "connecting" | "connected" | "disconnected" | "error";
}

/**
 * Actions du jeu multijoueur
 */
export interface MultiplayerGameActions {
  /** Démarrer le jeu (hôte uniquement) */
  startGame: () => void;

  /** Répondre à la question */
  handleAnswer: (workId: string) => void;

  /** Passer à la chanson suivante (hôte uniquement) */
  nextSong: () => void;

  /** Recommencer le jeu (hôte uniquement) */
  restartGame: () => void;

  /** Quitter la room */
  leaveRoom: () => void;

  /** Envoyer un message WebSocket personnalisé */
  sendMessage: (message: unknown) => void;
}

/**
 * Hook useMultiplayerGame - État + Actions
 */
export interface UseMultiplayerGameReturn extends MultiplayerGameState, MultiplayerGameActions {}

/**
 * Options pour useMultiplayerGame
 */
export interface UseMultiplayerGameOptions {
  /** ID de l'univers */
  universeId: string;

  /** ID de la room */
  roomId: string;

  /** ID du joueur */
  playerId: string;

  /** Nom d'affichage du joueur */
  displayName: string;

  /** Callback pour précharger média suivant */
  preloadNextTrack?: (audioUrl: string) => void;
}

/**
 * Messages WebSocket (types d'événements)
 */
export type WebSocketMessageType =
  | "join"
  | "state_sync"
  | "player_joined"
  | "player_left"
  | "game_started"
  | "answer_submitted"
  | "next_song"
  | "song_answer"
  | "game_ended"
  | "error";

/**
 * Message WebSocket générique
 */
export interface WebSocketMessage<T = unknown> {
  type: WebSocketMessageType;
  payload: T;
}

/**
 * Snapshot de l'état serveur (sync)
 */
export interface ServerStateSnapshot {
  players: RoomPlayer[];
  songs: Song[];
  works: Work[];
  currentSongIndex: number;
  gameState: "idle" | "lobby" | "playing" | "results";
}

/**
 * Features Index
 *
 * Point d'entrée centralisé pour toutes les features.
 * Architecture feature-based pour une meilleure organisation et code splitting.
 *
 * @example
 * ```tsx
 * import { SoloGameClient } from '@/features/solo-game';
 * import { MultiGameClient } from '@/features/multiplayer-game';
 * import { AudioControls } from '@/features/audio-player';
 * ```
 */

// Solo Game
export * from "./solo-game";

// Multiplayer Game
export * from "./multiplayer-game";

// Audio Player
export * from "./audio-player";

// Game UI
export * from "./game-ui";

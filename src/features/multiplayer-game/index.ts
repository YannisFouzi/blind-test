/**
 * Multiplayer Game Feature
 *
 * Mode multijoueur avec PartyKit WebSocket
 *
 * @example
 * ```tsx
 * import { MultiGameClient, useMultiplayerGame } from "@/features/multiplayer-game";
 *
 * // Utilisation du client complet
 * <MultiGameClient
 *   universeId="disney"
 *   roomId="abc123"
 *   playerId="player-1"
 *   displayName="Alice"
 * />
 *
 * // Ou utilisation du hook seul
 * const game = useMultiplayerGame({
 *   universeId: "disney",
 *   roomId: "abc123",
 *   playerId: "player-1",
 *   displayName: "Alice"
 * });
 * ```
 */

// Types
export * from "./types";

// Hooks
export { useMultiplayerGame } from "./hooks/useMultiplayerGame";
export type { UseMultiplayerGameOptions } from "./hooks/useMultiplayerGame";

// Components
export { MultiGameClient } from "./components/MultiGameClient";
export type { MultiGameClientProps } from "./components/MultiGameClient";

export { WaitingRoom } from "./components/WaitingRoom";
export type { WaitingRoomProps } from "./components/WaitingRoom";

export { PlayersScoreboard } from "./components/PlayersScoreboard";

// Machines (XState)
export { roomMachine } from "./machines/roomStateMachine";

/**
 * Multiplayer game feature exports.
 */

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

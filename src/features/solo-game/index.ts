/**
 * Solo Game Feature
 *
 * Mode solo du jeu (1 joueur)
 *
 * @example
 * ```tsx
 * import { SoloGameClient, useSoloGame } from "@/features/solo-game";
 *
 * // Utilisation du client complet
 * <SoloGameClient universeId="disney" maxSongs={10} />
 *
 * // Ou utilisation du hook seul
 * const game = useSoloGame({ universeId: "disney" });
 * ```
 */

// Types
export * from "./types";

// Hooks
export { useSoloGame, CUSTOM_UNIVERSE_ID } from "./hooks/useSoloGame";
export type { UseSoloGameOptions } from "./hooks/useSoloGame";

// Components
export { SoloGameClient } from "./components/SoloGameClient";
export type { SoloGameClientProps } from "./components/SoloGameClient";

export { SoloGameHeader } from "./components/SoloGameHeader";
export type { SoloGameHeaderProps } from "./components/SoloGameHeader";

export { SoloScoreDisplay } from "./components/SoloScoreDisplay";
export type { SoloScoreDisplayProps } from "./components/SoloScoreDisplay";

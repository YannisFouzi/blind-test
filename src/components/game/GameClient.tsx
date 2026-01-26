"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useIdentity } from "@/hooks/useIdentity";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

/**
 * Props du GameClient
 */
interface GameClientProps {
  /** ID de l'univers musical */
  universeId: string;
}

/**
 * Mode de jeu
 */
type Mode = "solo" | "multi";

/**
 * GameClient
 *
 * Composant router qui affiche SoloGameClient ou MultiGameClient
 * selon le mode (query param ?mode=solo|multi).
 *
 * Ce composant a été simplifié de 608 lignes → 100 lignes grâce à
 * l'architecture feature-based (Semaine 2 du refactoring).
 *
 * @example
 * ```tsx
 * // Mode solo
 * <GameClient universeId="disney" />
 * // URL: /game?mode=solo&universe=disney
 *
 * // Mode multiplayer
 * <GameClient universeId="disney" />
 * // URL: /game?mode=multi&room=abc123&player=player-1&name=Alice
 * ```
 */
const SoloGameClient = dynamic(
  () => import("@/features/solo-game").then((mod) => mod.SoloGameClient),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-base)] text-[var(--color-text-primary)]">
        <LoadingSpinner />
      </div>
    ),
  }
);

const MultiGameClient = dynamic(
  () =>
    import("@/features/multiplayer-game").then(
      (mod) => mod.MultiGameClient
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-base)] text-[var(--color-text-primary)]">
        <LoadingSpinner />
      </div>
    ),
  }
);

export function GameClient({ universeId }: GameClientProps) {
  const searchParams = useSearchParams();

  // ============================================================
  // Parse Query Params
  // ============================================================

  const mode = (searchParams?.get("mode") as Mode | null) || "solo";
  const roomId = searchParams?.get("room") || "";
  const queryPlayer = searchParams?.get("player");
  const queryName = searchParams?.get("name") || "";
  const queryNoSeek = searchParams?.get("noseek") === "1";
  const queryWorks = searchParams?.get("works") || "";
  const queryMaxSongs = searchParams?.get("maxsongs");

  // ============================================================
  // Identity Management (pour multiplayer)
  // ============================================================

  const { playerId, displayName: storedDisplayName, ready: identityReady, setIdentity } = useIdentity();

  // Sync query params → identity store
  useEffect(() => {
    if (queryPlayer) {
      setIdentity({ playerId: queryPlayer });
    }
  }, [queryPlayer, setIdentity]);

  useEffect(() => {
    if (queryName) {
      setIdentity({ displayName: queryName });
    }
  }, [queryName, setIdentity]);

  // ============================================================
  // Computed Values
  // ============================================================

  const displayName = useMemo(() => {
    if (queryName) return queryName;
    if (storedDisplayName) return storedDisplayName;
    if (playerId) return `Joueur-${playerId.slice(0, 4)}`;
    return "Joueur";
  }, [queryName, storedDisplayName, playerId]);

  const allowedWorks = useMemo(
    () => (queryWorks ? queryWorks.split(",").filter(Boolean) : undefined),
    [queryWorks]
  );

  const maxSongs = useMemo(
    () => (queryMaxSongs ? parseInt(queryMaxSongs, 10) : undefined),
    [queryMaxSongs]
  );

  // ============================================================
  // Render
  // ============================================================

  // Multiplayer: attendre que l'identity soit prête
  if (mode === "multi" && (!identityReady || !playerId)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-base)] text-[var(--color-text-primary)]">
        <LoadingSpinner />
      </div>
    );
  }

  // ============================================================
  // Mode Router
  // ============================================================

  if (mode === "multi") {
    return (
      <MultiGameClient
        universeId={universeId}
        roomId={roomId}
        playerId={playerId || ""}
        displayName={displayName}
        noSeek={queryNoSeek}
      />
    );
  }

  // Mode Solo (default)
  return (
    <SoloGameClient
      universeId={universeId}
      allowedWorks={allowedWorks}
      maxSongs={maxSongs}
      noSeek={queryNoSeek}
    />
  );
}

export default GameClient;

"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useIdentity } from "@/features/game-ui/hooks/useIdentity";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

interface GameClientProps {
  universeId: string;
}

type Mode = "solo" | "multi";

type MysteryEffect = "double" | "reverse";

const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-base)] text-[var(--color-text-primary)]">
    <LoadingSpinner />
  </div>
);

const parseMode = (value: string | null): Mode => (value === "multi" ? "multi" : "solo");
const parseIntParam = (value: string | null) =>
  value ? Number.parseInt(value, 10) : undefined;
const clampInt = (value: number | undefined, min: number, max: number) => {
  if (value === undefined || Number.isNaN(value)) return undefined;
  return Math.max(min, Math.min(max, value));
};
const parseMysteryEffects = (value: string | null): MysteryEffect[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((effect) => effect.trim())
    .filter((effect): effect is MysteryEffect => effect === "double" || effect === "reverse");
};

const SoloGameClient = dynamic(
  () => import("@/features/solo-game").then((mod) => mod.SoloGameClient),
  {
    ssr: false,
    loading: LoadingFallback,
  }
);

const MultiGameClient = dynamic(
  () =>
    import("@/features/multiplayer-game").then(
      (mod) => mod.MultiGameClient
    ),
  {
    ssr: false,
    loading: LoadingFallback,
  }
);

/**
 * Routes to solo or multiplayer client based on the ?mode query param.
 */
export function GameClient({ universeId }: GameClientProps) {
  const searchParams = useSearchParams();

  const {
    mode,
    roomId,
    queryPlayer,
    queryName,
    noSeek,
    allowedWorks,
    maxSongs,
    worksPerRound,
    mysteryEffectsConfig,
  } = useMemo(() => {
    const getParam = (key: string) => searchParams?.get(key);
    const mode = parseMode(getParam("mode"));
    const roomId = getParam("room") ?? "";
    const queryPlayer = getParam("player");
    const queryName = getParam("name") ?? "";
    const noSeek = getParam("noseek") === "1";
    const worksParam = getParam("works") ?? "";
    const allowedWorks = worksParam ? worksParam.split(",").filter(Boolean) : undefined;
    const maxSongs = parseIntParam(getParam("maxsongs"));
    const worksPerRound = clampInt(parseIntParam(getParam("wpr")), 2, 8);
    const mysteryEnabled = getParam("me") === "1";
    const mysteryFrequency = parseIntParam(getParam("mef")) ?? 0;
    const mysteryEffects = parseMysteryEffects(getParam("mee"));
    const mysteryEffectsConfig =
      mysteryEnabled &&
      mysteryEffects.length > 0 &&
      !Number.isNaN(mysteryFrequency) &&
      mysteryFrequency > 0
        ? {
            enabled: true,
            frequency: mysteryFrequency,
            effects: mysteryEffects,
          }
        : undefined;

    return {
      mode,
      roomId,
      queryPlayer,
      queryName,
      noSeek,
      allowedWorks,
      maxSongs,
      worksPerRound,
      mysteryEffectsConfig,
    };
  }, [searchParams]);

  const { playerId, displayName: storedDisplayName, ready: identityReady, setIdentity } = useIdentity();

  // Sync query params into the identity store.
  useEffect(() => {
    if (!queryPlayer && !queryName) return;
    setIdentity({
      ...(queryPlayer ? { playerId: queryPlayer } : {}),
      ...(queryName ? { displayName: queryName } : {}),
    });
  }, [queryPlayer, queryName, setIdentity]);

  const displayName = useMemo(() => {
    if (queryName) return queryName;
    if (storedDisplayName) return storedDisplayName;
    if (playerId) return `Joueur-${playerId.slice(0, 4)}`;
    return "Joueur";
  }, [queryName, storedDisplayName, playerId]);

  // Multiplayer: wait for identity to be ready.
  if (mode === "multi" && (!identityReady || !playerId)) {
    return <LoadingFallback />;
  }

  if (mode === "multi") {
    return (
      <MultiGameClient
        universeId={universeId}
        roomId={roomId}
        playerId={playerId || ""}
        displayName={displayName}
        noSeek={noSeek}
      />
    );
  }

  return (
    <SoloGameClient
      universeId={universeId}
      allowedWorks={allowedWorks}
      maxSongs={maxSongs}
      worksPerRound={worksPerRound}
      noSeek={noSeek}
      mysteryEffectsConfig={mysteryEffectsConfig}
    />
  );
}

export default GameClient;

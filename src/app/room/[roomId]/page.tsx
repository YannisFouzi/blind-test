"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePartyKitRoom } from "@/hooks/usePartyKitRoom";
import { CUSTOM_UNIVERSE, MAX_WORKS_CUSTOM_MODE } from "@/hooks/useUniverseCustomization";
import { useGameConfiguration } from "@/stores";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { UniverseCustomizeModal } from "@/components/home/UniverseCustomizeModal";
import { useIdentity } from "@/hooks/useIdentity";
import { useUniverses } from "@/hooks/useUniverses";
import { UniverseGrid } from "@/components/home/UniverseGrid";
import { getAllWorks, getSongsByWork, getWorksByUniverse } from "@/services/firebase";
import { shuffleArray } from "@/utils/formatters";
import type { Song, Universe } from "@/types";

export default function WaitingRoomPage() {
  console.log("[WaitingRoomPage] RENDER", { timestamp: Date.now() });
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();

  const roomId = params?.roomId;
  console.log("[WaitingRoomPage] roomId", { roomId });

  const { playerId, displayName: storedName, ready: identityReady, setIdentity } = useIdentity();
  const queryPlayerId = searchParams?.get("player");
  const queryDisplayName = searchParams?.get("name");

  useEffect(() => {
    if (!queryPlayerId) return;
    setIdentity({ playerId: queryPlayerId });
  }, [queryPlayerId, setIdentity]);

  useEffect(() => {
    if (!queryDisplayName) return;
    setIdentity({ displayName: queryDisplayName });
  }, [queryDisplayName, setIdentity]);

  const displayName = useMemo(() => {
    if (queryDisplayName) return queryDisplayName;
    if (storedName) return storedName;
    if (playerId) return `Joueur-${playerId.slice(0, 4)}`;
    return "Joueur";
  }, [queryDisplayName, storedName, playerId]);

  const {
    room,
    players,
    state,
    isConnected,
    isHost,
    allowedWorks,
    options,
    configureRoom,
    startGame,
  } = usePartyKitRoom(
    identityReady && playerId && roomId
      ? {
          roomId,
          playerId,
          displayName,
        }
      : {}
  );

  const { universes, loading: universesLoading } = useUniverses();
  const [isConfiguringRoom, setIsConfiguringRoom] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  // Hook de personnalisation (partagé avec HomeContent)
  const {
    customizingUniverse,
    allowedWorks: customAllowedWorks,
    noSeek: customNoSeek,
    maxSongs: customMaxSongs,
    isCustomMode,
    openCustomize: openCustomizeStore,
    closeCustomize,
  } = useGameConfiguration();

  const openCustomize = useCallback(
    (universe: Universe) => {
      openCustomizeStore(universe);
    },
    [openCustomizeStore]
  );

  const openCustomMode = useCallback(() => {
    openCustomizeStore(CUSTOM_UNIVERSE, {
      isCustomMode: true,
      maxWorksAllowed: MAX_WORKS_CUSTOM_MODE,
    });
  }, [openCustomizeStore]);

  // Appliquer les paramètres et lancer le jeu (logique spécifique multi avec PartyKit)
  const applyCustomizeAndPlay = useCallback(async () => {
    if (!customizingUniverse || !isHost || !configureRoom) return;

    // Déterminer si c'est le mode custom
    const isCustomModeActive = isCustomMode || customizingUniverse.id === CUSTOM_UNIVERSE.id;
    const universeId = isCustomModeActive ? CUSTOM_UNIVERSE.id : customizingUniverse.id;
    
    closeCustomize();
    setIsConfiguringRoom(true);
    setConfigError(null);

    try {
      // En mode custom, on utilise TOUJOURS les works sélectionnés (pas de fallback)
      // En mode normal, si aucune sélection spécifique, on utilise tous les works
      const worksResult = isCustomModeActive
        ? await getAllWorks()
        : await getWorksByUniverse(customizingUniverse.id);

      if (!worksResult.success || !worksResult.data || worksResult.data.length === 0) {
        setConfigError("Aucune oeuvre trouvée");
        setIsConfiguringRoom(false);
        return;
      }

      const availableWorks = worksResult.data;

      const worksToUse = isCustomModeActive
        ? availableWorks.filter((work) => customAllowedWorks.includes(work.id))
        : (customAllowedWorks.length > 0 && customAllowedWorks.length !== availableWorks.length
            ? availableWorks.filter((work) => customAllowedWorks.includes(work.id))
            : availableWorks);

      if (worksToUse.length === 0) {
        setConfigError("Aucune oeuvre sélectionnée");
        setIsConfiguringRoom(false);
        return;
      }

      // Charger les songs des works sélectionnés
      const songPromises = worksToUse.map((work) => getSongsByWork(work.id));
      const songsResults = await Promise.all(songPromises);

      const allSongs: Song[] = [];
      for (const result of songsResults) {
        if (result.success && result.data) {
          allSongs.push(...result.data);
        }
      }

      if (allSongs.length === 0) {
        setConfigError("Aucune chanson trouvée pour les oeuvres sélectionnées");
        setIsConfiguringRoom(false);
        return;
      }

      // Mélanger et limiter selon maxSongs (ou toutes si null)
      const shuffled = shuffleArray([...allSongs]);
      const maxCount = customMaxSongs !== null && customMaxSongs < shuffled.length
        ? customMaxSongs
        : shuffled.length;
      const selectedSongs = shuffled.slice(0, maxCount);

      // En mode custom, on passe TOUJOURS les allowedWorkIds
      const allowedWorkIds = isCustomModeActive
        ? customAllowedWorks
        : (customAllowedWorks.length > 0 && customAllowedWorks.length !== availableWorks.length
            ? customAllowedWorks
            : undefined);

      await configureRoom(universeId, selectedSongs, allowedWorkIds, { noSeek: customNoSeek });

      if (startGame) {
        await startGame();
      }
    } catch (error) {
      console.error("[WaitingRoomPage] Error applying custom settings:", error);
      setConfigError(error instanceof Error ? error.message : "Erreur inconnue");
      setIsConfiguringRoom(false);
    }
  }, [
    customizingUniverse,
    isHost,
    configureRoom,
    startGame,
    customAllowedWorks,
    customNoSeek,
    customMaxSongs,
    closeCustomize,
    isCustomMode,
  ]);

  // Handler pour quand le HOST clique sur un univers (sans personnalisation)
  const handleUniverseClick = useCallback(
    async (universeId: string) => {
      if (!isHost || !configureRoom) {
        console.warn("[WaitingRoomPage] Only host can select universe");
        return;
      }

      setIsConfiguringRoom(true);
      try {
        console.info("[WaitingRoomPage] HOST selected universe, configuring room", { universeId, roomId });

        // 1. Charger les works de l'univers
        const worksResult = await getWorksByUniverse(universeId);
        if (!worksResult.success || !worksResult.data || worksResult.data.length === 0) {
          console.error("[WaitingRoomPage] No works found for universe", universeId);
          return;
        }

        const works = worksResult.data;

        // 2. Charger les songs pour chaque work
        const songPromises = works.map(work => getSongsByWork(work.id));
        const songsResults = await Promise.all(songPromises);

        const allSongs: Song[] = [];
        for (const result of songsResults) {
          if (result.success && result.data) {
            allSongs.push(...result.data);
          }
        }

        if (allSongs.length === 0) {
          console.error("[WaitingRoomPage] No songs found");
          return;
        }

        // 3. Mélanger toutes les musiques (pas de limite par défaut)
        const shuffled = shuffleArray([...allSongs]);
        const selectedSongs = shuffled;

        // 4. Configurer la room via PartyKit
        console.info("[WaitingRoomPage] Configuring room with songs", {
          universeId,
          songsCount: selectedSongs.length,
        });

        await configureRoom(universeId, selectedSongs, undefined, { noSeek: false });

        console.info("[WaitingRoomPage] Room configured, now starting game");

        // ✅ Démarrer le jeu après configuration
        if (startGame) {
          await startGame();
          console.info("[WaitingRoomPage] Game started, waiting for broadcast to redirect");
        }

        // La redirection se fera automatiquement via le useEffect auto-redirect
        // quand room.universeId sera mis à jour suite au broadcast room_configured
      } catch (error) {
        console.error("[WaitingRoomPage] Error configuring room:", error);
        setIsConfiguringRoom(false);
      }
    },
    [isHost, configureRoom, startGame, roomId]
  );

  // Dès que l'univers est connu, on bascule sur la page de jeu
  useEffect(() => {
    console.log("[WaitingRoomPage] auto-redirect effect triggered", {
      identityReady,
      universeId: room?.universeId,
      roomId,
      playerId,
      state,
      isConnected,
    });

    if (!identityReady || !room?.universeId || !roomId || !playerId) {
      console.log("[WaitingRoomPage] auto-redirect SKIP", {
        reason: !identityReady
          ? "identity_not_ready"
          : !room?.universeId
          ? "no_universe"
          : !roomId
          ? "no_room"
          : "no_player",
        identityReady,
        universeId: room?.universeId,
        roomId,
        playerId,
      });
      return;
    }

    const params = new URLSearchParams({
      mode: "multi",
      room: roomId,
      player: playerId,
      name: displayName,
    });

    if (options?.noSeek) params.set("noseek", "1");
    if (allowedWorks && allowedWorks.length) {
      params.set("works", allowedWorks.join(","));
    }

    const targetUrl = `/game/${room.universeId}?${params.toString()}`;
    console.log("[WaitingRoomPage] REDIRECTING to game", { targetUrl });
    router.replace(targetUrl);
  }, [room?.universeId, allowedWorks, options?.noSeek, roomId, playerId, displayName, router, identityReady, state, isConnected]);

  if (!roomId || !identityReady || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        {!identityReady ? <LoadingSpinner /> : <ErrorMessage message="Room introuvable" />}
      </div>
    );
  }

  // Si le HOST : afficher la sélection d'univers
  if (isHost && !room?.universeId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-12 space-y-10">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-4">
              Sélectionne un univers
            </h1>
          </div>

          <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-slate-800/60 rounded-xl p-4">
              <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-2">
                Joueurs connectés
              </p>
              {players.length === 0 ? (
                <p className="text-slate-300 text-sm">En attente de joueurs...</p>
              ) : (
                <ul className="space-y-2">
                  {players.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-sm bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-700"
                    >
                      <span className="font-semibold">{p.displayName}</span>
                      {p.isHost && <span className="text-xs text-yellow-300">Hôte</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {universesLoading ? (
            <div className="flex justify-center">
              <LoadingSpinner />
            </div>
          ) : isConfiguringRoom ? (
            <div className="flex flex-col items-center gap-4">
              <LoadingSpinner />
              <p className="text-white">Configuration de la room...</p>
            </div>
          ) : (
            <UniverseGrid
              universes={universes}
              onSelect={handleUniverseClick}
              onCustomize={openCustomize}
              onCustomMode={openCustomMode}
              error={null}
            />
          )}

          {configError && (
            <div className="max-w-2xl mx-auto text-center text-red-300 text-sm">
              {configError}
            </div>
          )}

          {/* Modal de personnalisation */}
          {customizingUniverse && (
            <UniverseCustomizeModal
              isApplying={isConfiguringRoom}
              onApply={applyCustomizeAndPlay}
            />
          )}
        </div>
      </div>
    );
  }

  // Si INVITÉ : afficher page d'attente
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
      <div className="p-6 max-w-lg w-full text-white space-y-4">
        <div className="text-sm text-slate-200">
          <p className="font-medium">En attente de l&apos;hôte...</p>
        </div>

        <div className="bg-slate-800/60 rounded-xl p-4">
          <p className="text-xs uppercase tracking-[0.15em] text-slate-400 mb-2">
            Joueurs connectés
          </p>
          {players.length === 0 ? (
            <p className="text-slate-300 text-sm">En attente de joueurs...</p>
          ) : (
            <ul className="space-y-2">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between text-sm bg-slate-900/70 px-3 py-2 rounded-lg border border-slate-700"
                >
                  <span className="font-semibold">{p.displayName}</span>
                  {p.isHost && <span className="text-xs text-yellow-300">Hôte</span>}
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>
    </div>
  );
}

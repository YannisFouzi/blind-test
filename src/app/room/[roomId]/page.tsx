"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { usePartyKitRoom } from "@/hooks/usePartyKitRoom";
import { useUniverseCustomization } from "@/hooks/useUniverseCustomization";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { UniverseCustomizeModal } from "@/components/home/UniverseCustomizeModal";
import { useIdentity } from "@/hooks/useIdentity";
import { useUniverses } from "@/hooks/useUniverses";
import { UniverseGrid } from "@/components/home/UniverseGrid";
import { getSongsByWork, getWorksByUniverse } from "@/services/firebase";
import { shuffleArray } from "@/utils/formatters";
import type { Song } from "@/types";

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
    works: customWorks,
    allowedWorks: customAllowedWorks,
    noSeek: customNoSeek,
    maxSongs: customMaxSongs,
    totalSongsAvailable: customTotalSongs,
    songCountByWork: customSongCountByWork,
    loading: customLoadingWorks,
    error: customError,
    openCustomize,
    closeCustomize,
    toggleWork,
    setNoSeek: setCustomNoSeek,
    setMaxSongs: setCustomMaxSongs,
  } = useUniverseCustomization();

  // Appliquer les paramètres et lancer le jeu (logique spécifique multi avec PartyKit)
  const applyCustomizeAndPlay = useCallback(async () => {
    if (!customizingUniverse || !isHost || !configureRoom) return;

    const universeId = customizingUniverse.id;
    closeCustomize();
    setIsConfiguringRoom(true);
    setConfigError(null);

    try {
      // Filtrer les works selon la sélection
      const worksToUse = customAllowedWorks.length > 0 && customAllowedWorks.length !== customWorks.length
        ? customWorks.filter((w) => customAllowedWorks.includes(w.id))
        : customWorks;

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

      // Configurer avec les options personnalisées
      const allowedWorkIds = customAllowedWorks.length > 0 && customAllowedWorks.length !== customWorks.length
        ? customAllowedWorks
        : undefined;

      await configureRoom(universeId, selectedSongs, allowedWorkIds, { noSeek: customNoSeek });

      if (startGame) {
        await startGame();
      }
    } catch (error) {
      console.error("[WaitingRoomPage] Error applying custom settings:", error);
      setConfigError(error instanceof Error ? error.message : "Erreur inconnue");
      setIsConfiguringRoom(false);
    }
  }, [customizingUniverse, isHost, configureRoom, startGame, customAllowedWorks, customWorks, customNoSeek, customMaxSongs, closeCustomize]);

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

        // 3. Mélanger et limiter à 10 morceaux
        const shuffled = shuffleArray([...allSongs]);
        const selectedSongs = shuffled.slice(0, 10);

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
              error={null}
            />
          )}

          {/* Modal de personnalisation */}
          {customizingUniverse && (
            <UniverseCustomizeModal
              universe={customizingUniverse}
              works={customWorks}
              allowedWorks={customAllowedWorks}
              noSeek={customNoSeek}
              maxSongs={customMaxSongs}
              totalSongsAvailable={customTotalSongs}
              songCountByWork={customSongCountByWork}
              loading={customLoadingWorks}
              error={customError || configError}
              isApplying={isConfiguringRoom}
              onToggleWork={toggleWork}
              onSetNoSeek={setCustomNoSeek}
              onSetMaxSongs={setCustomMaxSongs}
              onApply={applyCustomizeAndPlay}
              onClose={closeCustomize}
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

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { UniverseGrid } from "@/components/home/UniverseGrid";
import { HomePageSkeleton } from "@/components/HomePage/HomePageSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUniverses } from "@/hooks/useUniverses";
import {
  configureRoomPlaylist,
  createRoom,
  joinRoom,
  subscribeIdleRooms,
  subscribePlayers,
  subscribeRoom,
} from "@/services/firebase/rooms";
import { getSongsByWork, getWorksByUniverse } from "@/services/firebase";
import { generateId, shuffleArray } from "@/utils/formatters";
import { Room, RoomPlayer, Song, Universe, Work } from "@/types";

type Mode = "solo" | "multi";
type MultiTab = "create" | "join";

export const HomeContent = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { universes, loading: universesLoading, error: universesError } = useUniverses();

  const [mode, setMode] = useState<Mode>("solo");
  const [multiTab, setMultiTab] = useState<MultiTab>("create");
  const playerIdRef = useRef<string>(generateId());
  const [displayName, setDisplayName] = useState<string>(`Joueur-${playerIdRef.current.slice(0, 4)}`);

  const [hostRoomId, setHostRoomId] = useState<string>("");
  const [joinRoomId, setJoinRoomId] = useState<string>("");
  const [roomsList, setRoomsList] = useState<Room[]>([]);
  const [playersInRoom, setPlayersInRoom] = useState<RoomPlayer[]>([]);
  const [hasUsedRoom, setHasUsedRoom] = useState(false);

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [homeInfo, setHomeInfo] = useState<string | null>(null);
  const [remoteRoom, setRemoteRoom] = useState<Room | null>(null);

  // Customization state
  const [customizingUniverse, setCustomizingUniverse] = useState<Universe | null>(null);
  const [customWorks, setCustomWorks] = useState<Work[]>([]);
  const [customAllowedWorks, setCustomAllowedWorks] = useState<string[]>([]);
  const [customNoSeek, setCustomNoSeek] = useState(false);
  const [customLoadingWorks, setCustomLoadingWorks] = useState(false);

  const currentRoomId = useMemo(() => {
    if (mode !== "multi") return "";
    if (hostRoomId) return hostRoomId;
    if (joinRoomId) return joinRoomId;
    return "";
  }, [mode, hostRoomId, joinRoomId]);

  const isHost = useMemo(() => mode === "multi" && Boolean(hostRoomId), [mode, hostRoomId]);
  const isGuest = useMemo(() => mode === "multi" && !hostRoomId && Boolean(joinRoomId), [mode, hostRoomId, joinRoomId]);

  const isAdmin = useMemo(
    () => Boolean(user?.email) && user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL,
    [user?.email]
  );

  const fetchUniverseSongs = useCallback(async (universeId: string, allowed?: string[]) => {
    const worksResult = await getWorksByUniverse(universeId);
    let worksList = worksResult.success && worksResult.data ? worksResult.data : [];
    if (allowed && allowed.length) {
      worksList = worksList.filter((w) => allowed.includes(w.id));
    }
    const songs: Song[] = [];
    for (const work of worksList) {
      const songsResult = await getSongsByWork(work.id);
      if (songsResult.success && songsResult.data) {
        songs.push(...songsResult.data);
      }
    }
    return shuffleArray(songs);
  }, []);

  const handleCreateRoom = useCallback(async () => {
    if (hostRoomId) return;
    console.info("[multi][host] create room start", { playerId: playerIdRef.current, displayName });
    setIsCreatingRoom(true);
    setHomeError(null);
    setHomeInfo(null);
    try {
      const result = await createRoom({
        universeId: "__pending__",
        hostId: playerIdRef.current,
        hostDisplayName: displayName.trim() || "Joueur",
        songs: [],
      });
      console.info("[multi][host] create room result", result);
      if (!result.success || !result.data) {
        setHomeError(result.error || "Impossible de creer la room");
        return;
      }
      setHostRoomId(result.data.id);
      setJoinRoomId("");
      setHomeInfo(`Room cree: ${result.data.id}. Selectionne un univers pour lancer la partie.`);
    } catch (error) {
      console.error("[multi][host] create room error", error);
      setHomeError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsCreatingRoom(false);
    }
  }, [hostRoomId, displayName]);


  const handleJoinRoom = useCallback(
    async (roomId: string) => {
      if (!roomId) return;
      setHomeError(null);
      setHomeInfo(null);
      try {
        console.info("[multi][guest] join room request", { roomId, playerId: playerIdRef.current });
        await joinRoom({
          roomId,
          playerId: playerIdRef.current,
          displayName: displayName.trim() || "Joueur",
        });
        console.info("[multi][guest] join room success", { roomId });
        setJoinRoomId(roomId);
        setHostRoomId("");
        setMultiTab("join");
        setHomeInfo(`Rejoint la room ${roomId}. En attente de l'host.`);
      } catch (error) {
        console.error("[multi][guest] join room error", error);
        setHomeError(error instanceof Error ? error.message : "Impossible de rejoindre la room");
      }
    },
    [displayName]
  );

  const handleUniverseClick = useCallback(
    async (universeId: string) => {
      setHomeError(null);
      setHomeInfo(null);

      if (mode === "multi" && !isHost) {
        setHomeInfo("En attente que l'host lance l'univers...");
        return;
      }
      if (mode === "solo") {
        router.push(`/game/${universeId}`);
        return;
      }

      if (!hostRoomId) {
        setHomeError("Clique sur \"Creer\" pour generer une room, puis selectionne l'univers.");
        return;
      }

      const name = displayName.trim() || "Joueur";
      const baseParams = new URLSearchParams({
        mode: "multi",
        name,
        player: playerIdRef.current,
      });

      setIsCreatingRoom(true);
      try {
        const songs = await fetchUniverseSongs(
          universeId,
          customAllowedWorks.length ? customAllowedWorks : undefined
        );
        if (!songs.length) {
          setHomeError("Aucun morceau disponible pour cet univers");
          return;
        }
        const configured = await configureRoomPlaylist(
          hostRoomId,
          universeId,
          songs,
          customAllowedWorks.length ? customAllowedWorks : undefined,
          { noSeek: customNoSeek }
        );
        if (!configured.success) {
          setHomeError(configured.error || "Impossible de préparer la room");
          return;
        }
        if (customNoSeek) baseParams.set("noseek", "1");
        if (customAllowedWorks.length && customAllowedWorks.length !== customWorks.length) {
          baseParams.set("works", customAllowedWorks.join(","));
        }
        baseParams.set("room", hostRoomId);
        baseParams.set("host", "1");
        setHasUsedRoom(true);
        router.push(`/game/${universeId}?${baseParams.toString()}`);
      } catch (error) {
        setHomeError(error instanceof Error ? error.message : "Erreur inconnue");
      } finally {
        setIsCreatingRoom(false);
      }
    },
    [
      mode,
      isHost,
      hostRoomId,
      displayName,
      fetchUniverseSongs,
      router,
      customAllowedWorks,
      customNoSeek,
      customWorks.length,
    ]
  );

  useEffect(() => {
    if (mode === "solo") {
      setHomeError(null);
      setHostRoomId("");
      setJoinRoomId("");
      setHomeInfo(null);
      setCustomizingUniverse(null);
      setCustomAllowedWorks([]);
      setCustomNoSeek(false);
      setPlayersInRoom([]);
      setHasUsedRoom(false);
    }
  }, [mode]);

  // Subscribe to idle rooms list (join tab)
  useEffect(() => {
    if (mode !== "multi" || multiTab !== "join") {
      setRoomsList([]);
      return;
    }
    const unsubscribe = subscribeIdleRooms((rooms) => {
      console.info("[multi] idle rooms update", rooms.map((r) => ({ id: r.id, host: r.hostName || r.hostId })));
      setRoomsList(rooms);
    });
    return () => unsubscribe?.();
  }, [mode, multiTab]);

  // Subscribe to chosen room (guest) to auto-enter when host starts
  useEffect(() => {
    if (!isGuest || !joinRoomId) {
      setRemoteRoom(null);
      return;
    }
    const unsub = subscribeRoom(joinRoomId, setRemoteRoom);
    return () => unsub?.();
  }, [isGuest, joinRoomId]);

  // Cleanup d'une room idle si l'hôte quitte l'accueil sans l'utiliser
  useEffect(() => {
    const cleanupIdleRoom = () => {
      if (mode !== "multi" || !hostRoomId || hasUsedRoom) return;
      console.info("[home][cleanupIdleRoom] trigger", { mode, hostRoomId, hasUsedRoom });
      void fetch("/api/cleanup-room", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: hostRoomId, force: true }),
      }).catch(() => {});
    };

    window.addEventListener("beforeunload", cleanupIdleRoom);
    window.addEventListener("pagehide", cleanupIdleRoom);
    return () => {
      window.removeEventListener("beforeunload", cleanupIdleRoom);
      window.removeEventListener("pagehide", cleanupIdleRoom);
      cleanupIdleRoom();
    };
  }, [mode, hostRoomId, hasUsedRoom]);

  // Subscribe to players for the active room (host or guest)
  useEffect(() => {
    if (!currentRoomId) {
      setPlayersInRoom([]);
      return;
    }
    const unsub = subscribePlayers(currentRoomId, setPlayersInRoom);
    return () => unsub?.();
  }, [currentRoomId]);

  // Guest navigation when host has configured and started playlist
  useEffect(() => {
    if (!isGuest || !remoteRoom) return;
    if (remoteRoom.universeId && remoteRoom.universeId !== "__pending__" && remoteRoom.songs.length) {
      const params = new URLSearchParams({
        mode: "multi",
        room: joinRoomId,
        player: playerIdRef.current,
        name: displayName.trim() || "Joueur",
      });
      if (remoteRoom.options?.noSeek) params.set("noseek", "1");
      if (remoteRoom.allowedWorks && remoteRoom.allowedWorks.length) {
        params.set("works", remoteRoom.allowedWorks.join(","));
      }
      router.push(`/game/${remoteRoom.universeId}?${params.toString()}`);
    }
  }, [isGuest, remoteRoom, joinRoomId, displayName, router]);

  // Customization modal helpers
  const openCustomize = useCallback(async (universe: Universe) => {
    setCustomizingUniverse(universe);
    setCustomNoSeek(false);
    setCustomAllowedWorks([]);
    setCustomLoadingWorks(true);
    setHomeError(null);
    try {
      const worksResult = await getWorksByUniverse(universe.id);
      if (worksResult.success && worksResult.data) {
        setCustomWorks(worksResult.data);
        setCustomAllowedWorks(worksResult.data.map((w) => w.id));
      } else {
        setCustomWorks([]);
      }
    } catch (error) {
      setCustomWorks([]);
      setHomeError(error instanceof Error ? error.message : "Erreur chargement oeuvres");
    } finally {
      setCustomLoadingWorks(false);
    }
  }, []);

  const toggleWork = (workId: string) => {
    setCustomAllowedWorks((prev) => (prev.includes(workId) ? prev.filter((id) => id !== workId) : [...prev, workId]));
  };

  const applyCustomizeAndPlay = useCallback(async () => {
    if (!customizingUniverse) return;
    const universeId = customizingUniverse.id;
    setCustomizingUniverse(null);

    if (mode === "solo") {
      const params = new URLSearchParams();
      if (customNoSeek) params.set("noseek", "1");
      if (customAllowedWorks.length && customAllowedWorks.length !== customWorks.length) {
        params.set("works", customAllowedWorks.join(","));
      }
      router.push(`/game/${universeId}?${params.toString()}`);
      return;
    }

    if (!isHost || !hostRoomId) {
      setHomeError("Seul l'host peut appliquer les paramètres personnalisés.");
      return;
    }

    setIsCreatingRoom(true);
    try {
      const songs = await fetchUniverseSongs(universeId, customAllowedWorks);
      if (!songs.length) {
        setHomeError("Aucun morceau disponible pour cet univers");
        return;
      }
      const configured = await configureRoomPlaylist(hostRoomId, universeId, songs, customAllowedWorks, {
        noSeek: customNoSeek,
      });
      if (!configured.success) {
        setHomeError(configured.error || "Impossible de préparer la room");
        return;
      }
      const params = new URLSearchParams({
        mode: "multi",
        name: displayName.trim() || "Joueur",
        player: playerIdRef.current,
        room: hostRoomId,
        host: "1",
      });
      if (customNoSeek) params.set("noseek", "1");
      if (customAllowedWorks.length && customAllowedWorks.length !== customWorks.length) {
        params.set("works", customAllowedWorks.join(","));
      }
      setHasUsedRoom(true);
      router.push(`/game/${universeId}?${params.toString()}`);
    } catch (error) {
      setHomeError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsCreatingRoom(false);
    }
  }, [
    customizingUniverse,
    mode,
    isHost,
    hostRoomId,
    customAllowedWorks,
    customWorks.length,
    customNoSeek,
    fetchUniverseSongs,
    router,
    displayName,
  ]);

  if (universesLoading) {
    return <HomePageSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-12 space-y-8">
      <HeroSection isAdmin={isAdmin} onAdminClick={() => router.push("/admin")} />

      <div className="bg-slate-900/40 border border-purple-500/30 rounded-2xl p-4 backdrop-blur space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMode("solo")}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                mode === "solo" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-300"
              }`}
            >
              Solo
            </button>
            <button
              onClick={() => setMode("multi")}
              className={`px-3 py-2 rounded-lg text-sm font-semibold ${
                mode === "multi" ? "bg-purple-600 text-white" : "bg-slate-800 text-slate-300"
              }`}
            >
              Multi
            </button>
          </div>

          {mode === "multi" && (
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Votre pseudo"
                className="bg-slate-800/60 text-white text-sm px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-purple-400"
              />

              <div className="flex items-center gap-1 bg-slate-800/60 rounded-lg p-1">
                <button
                  onClick={() => setMultiTab("create")}
                  className={`px-3 py-2 rounded-md text-sm font-semibold ${
                    multiTab === "create" ? "bg-purple-600 text-white" : "text-slate-200"
                  }`}
                >
                  Créer
                </button>
                <button
                  onClick={() => setMultiTab("join")}
                  className={`px-3 py-2 rounded-md text-sm font-semibold ${
                    multiTab === "join" ? "bg-purple-600 text-white" : "text-slate-200"
                  }`}
                >
                  Rejoindre
                </button>
              </div>
            </div>
          )}
        </div>

        {mode === "multi" && (
          <div className="space-y-3">
            {multiTab === "create" && (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreatingRoom || Boolean(hostRoomId)}
                  className="px-3 py-2 rounded-lg text-sm font-semibold bg-purple-600 hover:bg-purple-500 text-white disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {hostRoomId ? "Room créée" : isCreatingRoom ? "Création..." : "Créer une room"}
                </button>
                {hostRoomId && (
                  <span className="text-xs text-green-300">
                    Room ID : <span className="font-semibold">{hostRoomId}</span>
                  </span>
                )}
              </div>
            )}

            {multiTab === "join" && (
              <div className="space-y-2">
                {roomsList.length === 0 && (
                  <div className="text-sm text-slate-200">Aucune room disponible pour le moment.</div>
                )}
                {roomsList.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {roomsList.map((room) => (
                      <div
                        key={room.id}
                        className="flex items-center justify-between bg-slate-800/60 px-3 py-2 rounded-lg border border-slate-700"
                      >
                        <div className="text-sm text-white">
                          <div className="font-semibold">Room {room.id}</div>
                          <div className="text-xs text-slate-300">Hôte: {room.hostName || room.hostId}</div>
                        </div>
                        <button
                          onClick={() => handleJoinRoom(room.id)}
                          className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white"
                        >
                          Rejoindre
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {homeError && <div className="text-xs text-red-300">{homeError}</div>}
            {homeInfo && <div className="text-xs text-green-300">{homeInfo}</div>}

            {currentRoomId && (
              <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3">
                <div className="text-xs text-slate-200 mb-2">
                  Room active : <span className="font-semibold text-white">{currentRoomId}</span>
                </div>
                <div className="text-sm text-white font-semibold mb-1">Joueurs connectés</div>
                {playersInRoom.length === 0 ? (
                  <div className="text-xs text-slate-300">En attente de joueurs...</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {playersInRoom.map((p) => (
                      <span
                        key={p.id}
                        className={`px-2 py-1 rounded-md text-xs ${
                          p.isHost ? "bg-purple-700 text-white" : "bg-slate-700 text-slate-100"
                        }`}
                      >
                        {p.displayName || "Joueur"} {p.isHost ? "(Hôte)" : ""}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <UniverseGrid
        universes={universes}
        error={universesError}
        onSelect={handleUniverseClick}
        onCustomize={openCustomize}
      />

      {customizingUniverse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur">
          <div className="w-full max-w-3xl bg-slate-900/90 border border-purple-500/40 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-white">Paramètres avancés – {customizingUniverse.name}</h3>
              <button onClick={() => setCustomizingUniverse(null)} className="text-slate-300 hover:text-white text-sm">
                Fermer
              </button>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white text-sm">
                <input type="checkbox" checked={customNoSeek} onChange={(e) => setCustomNoSeek(e.target.checked)} />
                Activer le mode sans avance (timeline non cliquable)
              </label>
              <div className="text-white text-sm font-semibold">Oeuvres incluses</div>
              {customLoadingWorks ? (
                <div className="text-slate-200 text-sm">Chargement des oeuvres...</div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                  {customWorks.map((work) => (
                    <label
                      key={work.id}
                      className="flex items-center gap-2 text-white text-sm bg-slate-800/60 px-2 py-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={customAllowedWorks.includes(work.id)}
                        onChange={() => toggleWork(work.id)}
                      />
                      {work.title}
                    </label>
                  ))}
                </div>
              )}
              {homeError && <div className="text-xs text-red-300">{homeError}</div>}
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => setCustomizingUniverse(null)} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm">
                Annuler
              </button>
              <button
                onClick={applyCustomizeAndPlay}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm"
                disabled={isCreatingRoom}
              >
                {isCreatingRoom ? "Patiente..." : "Appliquer et jouer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};







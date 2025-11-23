"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { UniverseGrid } from "@/components/home/UniverseGrid";
import { HomePageSkeleton } from "@/components/HomePage/HomePageSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUniverses } from "@/hooks/useUniverses";
import { configureRoomPlaylist, createRoom, subscribeRoom } from "@/services/firebase/rooms";
import { getSongsByWork, getWorksByUniverse } from "@/services/firebase";
import { generateId, shuffleArray } from "@/utils/formatters";
import { Room, Song, Universe, Work } from "@/types";

type Mode = "solo" | "multi";

export const HomeContent = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { universes, loading: universesLoading, error: universesError } = useUniverses();

  const [mode, setMode] = useState<Mode>("solo");
  const playerIdRef = useRef<string>(generateId());
  const [displayName, setDisplayName] = useState<string>(`Joueur-${playerIdRef.current.slice(0, 4)}`);
  const [roomIdInput, setRoomIdInput] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [hostRoomId, setHostRoomId] = useState<string>("");
  const [homeInfo, setHomeInfo] = useState<string | null>(null);
  const [remoteRoom, setRemoteRoom] = useState<Room | null>(null);

  // Customization state
  const [customizingUniverse, setCustomizingUniverse] = useState<Universe | null>(null);
  const [customWorks, setCustomWorks] = useState<Work[]>([]);
  const [customAllowedWorks, setCustomAllowedWorks] = useState<string[]>([]);
  const [customNoSeek, setCustomNoSeek] = useState(false);
  const [customLoadingWorks, setCustomLoadingWorks] = useState(false);

  const currentRoomId = useMemo(() => {
    const guestRoom = roomIdInput.trim();
    if (guestRoom) return guestRoom;
    if (hostRoomId) return hostRoomId;
    return "";
  }, [roomIdInput, hostRoomId]);

  const isHost = useMemo(() => mode === "multi" && !!hostRoomId && currentRoomId === hostRoomId, [mode, hostRoomId, currentRoomId]);
  const isGuest = useMemo(
    () => mode === "multi" && !!roomIdInput.trim() && roomIdInput.trim() !== hostRoomId,
    [mode, roomIdInput, hostRoomId]
  );

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

  const handleUniverseClick = useCallback(
    async (universeId: string) => {
      setHomeError(null);
      setHomeInfo(null);

      if (mode === "multi" && !isHost) {
        setHomeInfo("En attente que l'host lance l'univers…");
        return;
      }

      if (mode === "solo") {
        router.push(`/game/${universeId}`);
        return;
      }

      const name = displayName.trim() || "Joueur";
      const baseParams = new URLSearchParams({
        mode: "multi",
        name,
        player: playerIdRef.current,
      });

      const roomFromInput = roomIdInput.trim();
      const roomToUse = roomFromInput || hostRoomId;

      if (!roomToUse) {
        setHomeError("Crée une room (switch Multi) ou saisis un room ID pour rejoindre");
        return;
      }

      if (roomToUse === hostRoomId) {
        setIsCreatingRoom(true);
        try {
          const songs = await fetchUniverseSongs(universeId, customAllowedWorks.length ? customAllowedWorks : undefined);
          if (!songs.length) {
            setHomeError("Aucun morceau disponible pour cet univers");
            return;
          }
          const configured = await configureRoomPlaylist(
            roomToUse,
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
          baseParams.set("room", roomToUse);
          baseParams.set("host", "1");
          router.push(`/game/${universeId}?${baseParams.toString()}`);
        } catch (error) {
          setHomeError(error instanceof Error ? error.message : "Erreur inconnue");
        } finally {
          setIsCreatingRoom(false);
        }
      } else {
        baseParams.set("room", roomToUse);
        router.push(`/game/${universeId}?${baseParams.toString()}`);
      }
    },
    [
      mode,
      roomIdInput,
      displayName,
      fetchUniverseSongs,
      router,
      hostRoomId,
      isHost,
      customAllowedWorks,
      customNoSeek,
      customWorks.length,
    ]
  );

  const handleConfirmRoom = useCallback(() => {
    const trimmed = roomIdInput.trim();
    if (!trimmed) {
      setHomeError("Room ID requis pour rejoindre");
      setHomeInfo(null);
      return;
    }
    setHomeError(null);
    setHomeInfo(`Room prête: ${trimmed}. En attente que l'host lance l'univers.`);
  }, [roomIdInput]);

  useEffect(() => {
    if (mode === "solo") {
      setHomeError(null);
      setHostRoomId("");
      setHomeInfo(null);
      setCustomizingUniverse(null);
      setCustomAllowedWorks([]);
      setCustomNoSeek(false);
    }
  }, [mode]);

  useEffect(() => {
    if (!isGuest || !currentRoomId) {
      setRemoteRoom(null);
      return;
    }
    const unsub = subscribeRoom(currentRoomId, setRemoteRoom);
    return () => unsub?.();
  }, [isGuest, currentRoomId]);

  useEffect(() => {
    if (!isGuest || !remoteRoom) return;
    if (remoteRoom.universeId && remoteRoom.universeId !== "__pending__" && remoteRoom.songs.length) {
      const params = new URLSearchParams({
        mode: "multi",
        room: currentRoomId,
        player: playerIdRef.current,
        name: displayName.trim() || "Joueur",
      });
      if (remoteRoom.options?.noSeek) params.set("noseek", "1");
      if (remoteRoom.allowedWorks && remoteRoom.allowedWorks.length) {
        params.set("works", remoteRoom.allowedWorks.join(","));
      }
      router.push(`/game/${remoteRoom.universeId}?${params.toString()}`);
    }
  }, [isGuest, remoteRoom, currentRoomId, displayName, router]);

  useEffect(() => {
    const createHostRoom = async () => {
      if (mode !== "multi" || hostRoomId || roomIdInput.trim()) return;
      setHomeError(null);
      setHomeInfo(null);
      setIsCreatingRoom(true);
      try {
        const result = await createRoom({
          universeId: "__pending__",
          hostId: playerIdRef.current,
          hostDisplayName: displayName.trim() || "Joueur",
          songs: [],
        });
        if (!result.success || !result.data) {
          setHomeError(result.error || "Impossible de créer la room");
          return;
        }
        setHostRoomId(result.data.id);
        setHomeInfo(`Room prête: ${result.data.id}. Sélectionne l'univers pour lancer la partie.`);
      } catch (error) {
        setHomeError(error instanceof Error ? error.message : "Erreur inconnue");
      } finally {
        setIsCreatingRoom(false);
      }
    };
    void createHostRoom();
  }, [mode, hostRoomId, roomIdInput, displayName]);

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

      <div className="bg-slate-900/40 border border-purple-500/30 rounded-2xl p-4 backdrop-blur">
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
              <input
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="Room ID (si vous rejoignez)"
                className="bg-slate-800/60 text-white text-sm px-3 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-purple-400"
              />
              <button
                onClick={handleConfirmRoom}
                className="px-3 py-2 rounded-lg text-sm font-semibold bg-slate-700 hover:bg-slate-600 text-white"
              >
                Valider room
              </button>
              {isCreatingRoom && <span className="text-xs text-slate-200">Préparation de la room...</span>}
              {hostRoomId && (
                <span className="text-xs text-green-300">
                  Room ID (host) : <span className="font-semibold">{hostRoomId}</span>
                </span>
              )}
              {homeError && <span className="text-xs text-red-300">{homeError}</span>}
              {homeInfo && <span className="text-xs text-green-300">{homeInfo}</span>}
            </div>
          )}
        </div>
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
              <h3 className="text-xl font-semibold text-white">Paramètres avancés — {customizingUniverse.name}</h3>
              <button
                onClick={() => setCustomizingUniverse(null)}
                className="text-slate-300 hover:text-white text-sm"
              >
                Fermer
              </button>
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-2 text-white text-sm">
                <input
                  type="checkbox"
                  checked={customNoSeek}
                  onChange={(e) => setCustomNoSeek(e.target.checked)}
                />
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
              <button
                onClick={() => setCustomizingUniverse(null)}
                className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm"
              >
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

"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { UniverseGrid } from "@/components/home/UniverseGrid";
import { HomePageSkeleton } from "@/components/HomePage/HomePageSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUniverses } from "@/hooks/useUniverses";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePartyKitLobby } from "@/hooks/usePartyKitLobby";
import { getWorksByUniverse } from "@/services/firebase";
import { Room, Universe, Work } from "@/types";
import { useIdentity } from "@/hooks/useIdentity";

type Mode = "solo" | "multi";
type MultiTab = "create" | "join";

const displayNameSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Choisis un pseudo avant de continuer")
    .max(50, "Pseudo trop long"),
});

export const HomeContent = () => {
  const router = useRouter();
  const { user } = useAuth();
  const { universes, loading: universesLoading, error: universesError } = useUniverses();

  // Hook PartyKit Lobby pour les rooms en temps réel
  const {
    rooms: partyKitRooms,
    isConnected: lobbyConnected,
    createRoom: createPartyKitRoom,
    error: lobbyError,
  } = usePartyKitLobby();

  const [mode, setMode] = useState<Mode>("solo");
  const [multiTab, setMultiTab] = useState<MultiTab>("create");
  const { playerId, displayName: storedDisplayName, ready: identityReady, setIdentity } = useIdentity();
  const playerIdRef = useRef<string>("");

  const [hostRoomId, setHostRoomId] = useState<string>("");
  const [joinRoomId, setJoinRoomId] = useState<string>("");
  const [modeConfirmed, setModeConfirmed] = useState(false);
  const hasUsedRoomRef = useRef(false);

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [homeInfo, setHomeInfo] = useState<string | null>(null);

  // Customization state
  const [customizingUniverse, setCustomizingUniverse] = useState<Universe | null>(null);
  const [customWorks, setCustomWorks] = useState<Work[]>([]);
  const [customAllowedWorks, setCustomAllowedWorks] = useState<string[]>([]);
  const [customNoSeek, setCustomNoSeek] = useState(false);
  const [customLoadingWorks, setCustomLoadingWorks] = useState(false);

  const isHost = useMemo(() => mode === "multi" && Boolean(hostRoomId), [mode, hostRoomId]);
  const canContinueMulti = isHost && Boolean(hostRoomId);

  // Adapter PartyKit RoomMetadata vers le type Room pour compatibilité JSX
  const adaptedRooms = useMemo<Room[]>(() => {
    if (mode !== "multi" || multiTab !== "join") return [];

    return partyKitRooms.map((partyRoom) => ({
      id: partyRoom.id,
      hostId: partyRoom.id,
      hostName: partyRoom.hostName,
      hostDisplayName: partyRoom.hostName,
      state: partyRoom.state,
      universeId: partyRoom.universeId || "",
      songs: [],
      currentSongIndex: 0,
      createdAt: new Date(partyRoom.createdAt),
      options: undefined,
      allowedWorks: undefined,
    } as Room));
  }, [partyKitRooms, mode, multiTab]);

  const form = useForm<z.infer<typeof displayNameSchema>>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: { displayName: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const displayName = form.watch("displayName");

  // Charger/initialiser l'identité persistée (playerId + pseudo)
  useEffect(() => {
    if (!identityReady || !playerId) return;
    if (!playerIdRef.current) {
      playerIdRef.current = playerId;
    }
  }, [identityReady, playerId]);

  useEffect(() => {
    if (!identityReady) return;
    if (storedDisplayName && !form.getValues("displayName")) {
      form.setValue("displayName", storedDisplayName);
    }
  }, [identityReady, storedDisplayName, form]);

  const ensurePlayerId = useCallback(() => {
    if (!identityReady) return null;
    if (!playerIdRef.current && playerId) {
      playerIdRef.current = playerId;
    }
    return playerIdRef.current || playerId || null;
  }, [identityReady, playerId]);

  const ensureDisplayName = useCallback(async () => {
    if (!identityReady) return null;
    const valid = await form.trigger("displayName");
    if (!valid) {
      form.setFocus("displayName");
      return null;
    }
    const value = form.getValues("displayName").trim();
    setIdentity({ displayName: value });
    return value;
  }, [form, identityReady, setIdentity]);

  const resetModeChoice = useCallback(() => {
    setMode((prev) => (prev === "solo" ? "multi" : "solo"));
    setModeConfirmed(false);
    setHomeError(null);
    setHomeInfo(null);
    setHostRoomId("");
    setJoinRoomId("");
    setCustomizingUniverse(null);
    setCustomAllowedWorks([]);
    setCustomNoSeek(false);
    hasUsedRoomRef.current = false;
    setMultiTab("create");
    form.reset({ displayName: "" });
  }, [form]);

  const isAdmin = useMemo(
    () => Boolean(user?.email) && user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL,
    [user?.email]
  );

  const handleCreateRoom = useCallback(async () => {
    const ensuredPlayerId = ensurePlayerId();
    if (!identityReady || !ensuredPlayerId) return;
    playerIdRef.current = ensuredPlayerId;
    if (hostRoomId) return;
    const name = await ensureDisplayName();
    if (!name) return;
    hasUsedRoomRef.current = false;
    setIsCreatingRoom(true);
    setHomeError(null);
    setHomeInfo(null);
    try {
      // PartyKit : Génération d'ID locale (instantané)
      const roomId = await createPartyKitRoom(name, "__pending__");

      console.info("[HomeContent] Room created, redirecting HOST to waiting room", {
        roomId,
        playerId: playerIdRef.current,
        displayName: name,
      });

      // Rediriger le HOST vers la page d'attente pour qu'il se connecte EN PREMIER
      router.push(
        `/room/${roomId}?name=${encodeURIComponent(name)}&player=${playerIdRef.current}&host=1`
      );
      setHomeInfo(`Room créée: ${roomId}. Sélectionne un univers pour lancer la partie.`);
      setModeConfirmed(true);
    } catch (error) {
      console.error("[multi][host][PartyKit] create room error", error);
      setHomeError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsCreatingRoom(false);
    }
  }, [hostRoomId, ensureDisplayName, createPartyKitRoom, ensurePlayerId, identityReady, router]);

  const handleJoinRoom = useCallback(
    async (roomId: string) => {
      const ensuredPlayerId = ensurePlayerId();
      if (!identityReady || !ensuredPlayerId) return;
      playerIdRef.current = ensuredPlayerId;
      if (!roomId) return;
      const name = await ensureDisplayName();
      if (!name) return;
      setHomeError(null);
      setHomeInfo(null);

      // Connexion directe à la room via la page d'attente
      setJoinRoomId(roomId);
      setHostRoomId("");
      setMultiTab("join");
      router.push(
        `/room/${roomId}?name=${encodeURIComponent(name)}&player=${playerIdRef.current}`
      );
    },
    [ensureDisplayName, ensurePlayerId, identityReady, router]
  );

  const handleUniverseClick = useCallback(
    async (universeId: string) => {
      setHomeError(null);
      setHomeInfo(null);

      const ensuredPlayerId = ensurePlayerId();
      if (!identityReady || !ensuredPlayerId) return;
      playerIdRef.current = ensuredPlayerId;

      if (mode === "multi" && !isHost) {
        setHomeInfo("En attente que l'host lance l'univers...");
        return;
      }
      if (mode === "solo") {
        router.push(`/game/${universeId}`);
        return;
      }

      if (!hostRoomId) {
        setHomeError("Clique sur \"Créer\" pour générer une room, puis sélectionne l'univers.");
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
        // PartyKit gère la configuration via WebSocket dans GameClient
        if (customNoSeek) baseParams.set("noseek", "1");
        if (customAllowedWorks.length && customAllowedWorks.length !== customWorks.length) {
          baseParams.set("works", customAllowedWorks.join(","));
        }
        baseParams.set("room", hostRoomId);
        hasUsedRoomRef.current = true;

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
      router,
      customAllowedWorks,
      customNoSeek,
      customWorks.length,
      ensurePlayerId,
      identityReady,
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
      hasUsedRoomRef.current = false;
    }
    setModeConfirmed(false);
  }, [mode]);

  // Cleanup d'une room idle si l'hôte quitte l'accueil sans l'utiliser
  useEffect(() => {
    const cleanupIdleRoom = () => {
      if (mode !== "multi" || !hostRoomId || hasUsedRoomRef.current) return;
      console.info("[home][cleanupIdleRoom] trigger", { mode, hostRoomId, hasUsedRoom: hasUsedRoomRef.current });
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
  }, [mode, hostRoomId]);

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

    const ensuredPlayerId = ensurePlayerId();
    if (!identityReady || !ensuredPlayerId) return;
    playerIdRef.current = ensuredPlayerId;

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
      // PartyKit gère la configuration via WebSocket dans GameClient
      const params = new URLSearchParams({
        mode: "multi",
        name: displayName.trim() || "Joueur",
        player: playerIdRef.current,
        room: hostRoomId,
      });
      if (customNoSeek) params.set("noseek", "1");
      if (customAllowedWorks.length && customAllowedWorks.length !== customWorks.length) {
        params.set("works", customAllowedWorks.join(","));
      }
      hasUsedRoomRef.current = true;

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
    router,
    displayName,
    ensurePlayerId,
    identityReady,
  ]);

  if (universesLoading) {
    return <HomePageSkeleton />;
  }

  const containerClass = modeConfirmed
    ? "space-y-6"
    : "bg-slate-900/60 border border-purple-500/30 rounded-3xl p-6 md:p-8 backdrop-blur space-y-6 shadow-2xl shadow-purple-900/20";

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
      <HeroSection
        isAdmin={isAdmin}
        onAdminClick={() => router.push("/admin")}
        showSubtitle={!modeConfirmed}
      />

      <div className={containerClass}>
        {!modeConfirmed && (
          <div className="flex justify-center">
            <div className="inline-flex rounded-3xl bg-slate-800/80 p-1.5 shadow-inner shadow-black/30">
              <button
                onClick={() => setMode("solo")}
                className={`px-8 py-3 rounded-2xl text-base font-bold tracking-wide transition-all ${
                  mode === "solo"
                    ? "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-xl shadow-purple-500/50"
                    : "text-slate-200 hover:text-white hover:bg-slate-700/60"
                }`}
              >
                Solo
              </button>
              <button
                onClick={() => setMode("multi")}
                className={`px-8 py-3 rounded-2xl text-base font-bold tracking-wide transition-all ${
                  mode === "multi"
                    ? "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-xl shadow-purple-500/50"
                    : "text-slate-200 hover:text-white hover:bg-slate-700/60"
                }`}
              >
                Multi
              </button>
            </div>
          </div>
        )}

        {modeConfirmed && (
          <div className="max-w-md mx-auto flex flex-col items-center gap-3 text-center">
            <p className="text-sm text-slate-200 m-0">
              Mode actuel : <span className="font-semibold text-white">{mode === "solo" ? "Solo" : "Multi"}</span>
            </p>
            <button
              onClick={resetModeChoice}
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl text-sm font-semibold bg-slate-800/80 text-white hover:bg-slate-700 transition-all"
            >
              Changer de mode de jeu
            </button>
          </div>
        )}

        {mode === "solo" && !modeConfirmed && (
          <div className="flex justify-center">
            <button
              onClick={() => setModeConfirmed(true)}
              className="inline-flex items-center justify-center px-8 py-3 rounded-2xl text-base font-bold tracking-wide bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-xl shadow-purple-500/40 hover:shadow-purple-500/60 transition-all"
            >
              Continuer
            </button>
          </div>
        )}

        {mode === "multi" && !modeConfirmed && (
          <div className="space-y-5">
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-2 items-center text-center">
                <div className="w-full flex justify-center">
                  <input
                    {...form.register("displayName")}
                    placeholder="Votre pseudo"
                    className="w-full max-w-md bg-slate-800/80 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-purple-400 shadow-inner shadow-black/30"
                  />
                </div>
                {form.formState.errors.displayName && (
                  <p className="text-xs text-red-300">{form.formState.errors.displayName.message}</p>
                )}
              </div>
              <div className="inline-flex rounded-3xl bg-slate-800/80 p-1 shadow-inner shadow-black/30 self-center">
                <button
                  onClick={() => setMultiTab("create")}
                  className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
                    multiTab === "create"
                      ? "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-lg shadow-purple-500/40"
                      : "text-slate-200 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  Créer
                </button>
                <button
                  onClick={() => setMultiTab("join")}
                  className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${
                    multiTab === "join"
                      ? "bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 text-white shadow-lg shadow-purple-500/40"
                      : "text-slate-200 hover:text-white hover:bg-slate-700/60"
                  }`}
                >
                  Rejoindre
                </button>
              </div>
            </div>

            {multiTab === "create" && (
              <div className="flex justify-center">
                <button
                  onClick={handleCreateRoom}
                  disabled={isCreatingRoom || Boolean(hostRoomId)}
                  className="w-full max-w-md px-4 py-3 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/40 hover:shadow-purple-500/50 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {hostRoomId ? "Room créée" : isCreatingRoom ? "Création..." : "Créer une room"}
                </button>
              </div>
            )}

            {multiTab === "join" && (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 space-y-3 shadow-lg shadow-purple-900/20">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-300">Rooms disponibles</div>
                {adaptedRooms.length === 0 && (
                  <div className="text-sm text-slate-200">
                    {lobbyError ? `Erreur lobby: ${lobbyError}` : "Aucune room disponible pour le moment."}
                  </div>
                )}
                {adaptedRooms.length > 0 && (
                  <div className="grid grid-cols-1 gap-2">
                    {adaptedRooms.map((room) => (
                      <button
                        key={room.id}
                        onClick={() => handleJoinRoom(room.id)}
                        className="w-full text-left rounded-xl border border-slate-800 bg-slate-800/70 hover:bg-slate-800/90 transition-all px-4 py-3 shadow-inner shadow-black/30"
                      >
                        <div className="flex items-center justify-between text-sm text-white">
                          <div>
                            <div className="font-semibold">Room {room.id}</div>
                            <div className="text-xs text-slate-300">Hôte: {room.hostName || room.hostId}</div>
                          </div>
                          <span className="text-xs text-purple-200">Rejoindre</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {homeError && <div className="text-xs text-red-300">{homeError}</div>}
            {homeInfo && <div className="text-xs text-green-300">{homeInfo}</div>}
            {!lobbyConnected && <div className="text-xs text-yellow-300">Connexion au lobby...</div>}
          </div>
        )}
      </div>

      {((mode === "solo" && modeConfirmed) || (mode === "multi" && modeConfirmed && canContinueMulti)) && (
        <UniverseGrid
          universes={universes}
          error={universesError}
          onSelect={handleUniverseClick}
          onCustomize={openCustomize}
        />
      )}

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

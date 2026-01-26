"use client";

import { useRouter } from "next/navigation";
import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { HeroSection } from "@/components/home/HeroSection";
import { UniverseGrid } from "@/components/home/UniverseGrid";
import { UniverseCustomizeModal } from "@/components/home/UniverseCustomizeModal";
import { HomePageSkeleton } from "@/components/home/HomePageSkeleton";
import { useAuth } from "@/hooks/useAuth";
import { useUniverses } from "@/hooks/useUniverses";
import { CUSTOM_UNIVERSE, MAX_WORKS_CUSTOM_MODE } from "@/hooks/useUniverseCustomization";
import { useGameConfiguration, useRoomAuthStore } from "@/stores";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePartyKitLobby } from "@/hooks/usePartyKitLobby";
import { Room, Universe } from "@/types";
import { useIdentity } from "@/hooks/useIdentity";
import { Lock } from "lucide-react";

type Mode = "solo" | "multi";
type LobbyRoom = Room & { hasPassword?: boolean };

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

  // Hook PartyKit Lobby pour les rooms en temps rÃ©el
  const {
    rooms: partyKitRooms,
    isConnected: lobbyConnected,
    createRoom: createPartyKitRoom,
    error: lobbyError,
  } = usePartyKitLobby();

  const [mode, setMode] = useState<Mode>("solo");
  const { playerId, displayName: storedDisplayName, ready: identityReady, setIdentity } = useIdentity();
  const playerIdRef = useRef<string>("");
  const setPendingPassword = useRoomAuthStore((state) => state.setPendingPassword);

  const [hostRoomId, setHostRoomId] = useState<string>("");
  const hasUsedRoomRef = useRef(false);

  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [homeError, setHomeError] = useState<string | null>(null);
  const [homeInfo, setHomeInfo] = useState<string | null>(null);
  const [createPassword, setCreatePassword] = useState("");
  const [joinPasswords, setJoinPasswords] = useState<Record<string, string>>({});

  // Hook de configuration du jeu (Zustand store)
  const {
    customizingUniverse,
    allowedWorks: customAllowedWorks,
    noSeek: customNoSeek,
    maxSongs: customMaxSongs,
    openCustomize: openCustomizeStore,
    closeCustomize,
    reset: resetCustomization,
  } = useGameConfiguration();

  // Wrapper pour openCustomize (compatible avec l'ancien hook)
  const openCustomize = useCallback(async (universe: Universe) => {
    openCustomizeStore(universe);
  }, [openCustomizeStore]);

  // Mode custom : toutes les Å“uvres de tous les univers
  const openCustomMode = useCallback(async () => {
    openCustomizeStore(CUSTOM_UNIVERSE, {
      isCustomMode: true,
      maxWorksAllowed: MAX_WORKS_CUSTOM_MODE,
    });
  }, [openCustomizeStore]);

  const isHost = useMemo(() => mode === "multi" && Boolean(hostRoomId), [mode, hostRoomId]);
  const handleToggleMode = useCallback(() => {
    setMode((prev) => (prev === "solo" ? "multi" : "solo"));
  }, []);
  const handleToggleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        handleToggleMode();
      }
    },
    [handleToggleMode]
  );

  // Adapter PartyKit RoomMetadata vers le type Room pour compatibilitÃ© JSX
  const adaptedRooms = useMemo<LobbyRoom[]>(() => {
    if (mode !== "multi") return [];

    return partyKitRooms.map((partyRoom) => ({
      id: partyRoom.id,
      hostId: partyRoom.id,
      hostName: partyRoom.hostName,
      hostDisplayName: partyRoom.hostName,
      state: partyRoom.state,
      universeId: partyRoom.universeId || "",
      hasPassword: partyRoom.hasPassword,
      songs: [],
      currentSongIndex: 0,
      createdAt: new Date(partyRoom.createdAt),
      options: undefined,
      allowedWorks: undefined,
    } as LobbyRoom));
  }, [partyKitRooms, mode]);

  const form = useForm<z.infer<typeof displayNameSchema>>({
    resolver: zodResolver(displayNameSchema),
    defaultValues: { displayName: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const displayName = form.watch("displayName");

  // Charger/initialiser l'identitÃ© persistÃ©e (playerId + pseudo)
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
      const trimmedPassword = createPassword.trim();
      const hasPassword = Boolean(trimmedPassword);
      // PartyKit : GÃ©nÃ©ration d'ID locale (instantanÃ©)
      const roomId = await createPartyKitRoom(name, "__pending__", hasPassword);

      if (hasPassword) {
        setPendingPassword(roomId, trimmedPassword);
      }

      console.info("[HomeContent] Room created, redirecting HOST to waiting room", {
        roomId,
        playerId: playerIdRef.current,
        displayName: name,
      });

      // Rediriger le HOST vers la page d'attente pour qu'il se connecte EN PREMIER
      router.push(
        `/room/${roomId}?name=${encodeURIComponent(name)}&player=${playerIdRef.current}&host=1`
      );
      setHomeInfo(`Room crÃ©Ã©e: ${roomId}. SÃ©lectionne un univers pour lancer la partie.`);
    } catch (error) {
      console.error("[multi][host][PartyKit] create room error", error);
      setHomeError(error instanceof Error ? error.message : "Erreur inconnue");
    } finally {
      setIsCreatingRoom(false);
    }
  }, [hostRoomId, ensureDisplayName, createPartyKitRoom, ensurePlayerId, identityReady, router, createPassword, setPendingPassword]);

  const handleJoinRoom = useCallback(
    async (roomId: string, password?: string) => {
      const ensuredPlayerId = ensurePlayerId();
      if (!identityReady || !ensuredPlayerId) return;
      playerIdRef.current = ensuredPlayerId;
      if (!roomId) return;
      const name = await ensureDisplayName();
      if (!name) return;
      setHomeError(null);
      setHomeInfo(null);
      const trimmedPassword = password?.trim();
      if (trimmedPassword) {
        setPendingPassword(roomId, trimmedPassword);
      }
      // Connexion directe Ã  la room via la page d'attente
      setHostRoomId("");
      router.push(
        `/room/${roomId}?name=${encodeURIComponent(name)}&player=${playerIdRef.current}`
      );
    },
    [ensureDisplayName, ensurePlayerId, identityReady, router, setPendingPassword]
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
        setHomeError("Clique sur \"CrÃ©er\" pour gÃ©nÃ©rer une room, puis sÃ©lectionne l'univers.");
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
        // PartyKit gÃ¨re la configuration via WebSocket dans GameClient
        if (customNoSeek) baseParams.set("noseek", "1");
        if (customAllowedWorks.length > 0) {
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
      ensurePlayerId,
      identityReady,
    ]
  );

  useEffect(() => {
    setHomeError(null);
    setHostRoomId("");
    setHomeInfo(null);
    resetCustomization();
    hasUsedRoomRef.current = false;
  }, [mode, resetCustomization]);

  const applyCustomizeAndPlay = useCallback(async () => {
    if (!customizingUniverse) return;
    
    // DÃ©terminer si c'est le mode custom (toutes les Å“uvres)
    const isCustomModeActive = customizingUniverse.id === CUSTOM_UNIVERSE.id;
    // En mode custom, on utilise "__custom__" comme universeId
    const universeId = isCustomModeActive ? "__custom__" : customizingUniverse.id;
    
    closeCustomize();

    const ensuredPlayerId = ensurePlayerId();
    if (!identityReady || !ensuredPlayerId) return;
    playerIdRef.current = ensuredPlayerId;

    if (mode === "solo") {
      const params = new URLSearchParams();
      if (customNoSeek) params.set("noseek", "1");

      // Passer les works sÃ©lectionnÃ©s si nÃ©cessaire
      if (customAllowedWorks.length > 0) {
        params.set("works", customAllowedWorks.join(","));
      }

      // Passer le nombre max de songs si spÃ©cifiÃ©
      if (customMaxSongs !== null) {
        params.set("maxsongs", String(customMaxSongs));
      }
      router.push(`/game/${universeId}?${params.toString()}`);
      return;
    }

    if (!isHost || !hostRoomId) {
      setHomeError("Seul l'host peut appliquer les paramÃ¨tres personnalisÃ©s.");
      return;
    }

    setIsCreatingRoom(true);
    try {
      // PartyKit gÃ¨re la configuration via WebSocket dans GameClient
      const params = new URLSearchParams({
        mode: "multi",
        name: displayName.trim() || "Joueur",
        player: playerIdRef.current,
        room: hostRoomId,
      });
      if (customNoSeek) params.set("noseek", "1");

      // Passer les works sÃ©lectionnÃ©s si nÃ©cessaire
      if (customAllowedWorks.length > 0) {
        params.set("works", customAllowedWorks.join(","));
      }

      // Passer le nombre max de songs si spÃ©cifiÃ©
      if (customMaxSongs !== null) {
        params.set("maxsongs", String(customMaxSongs));
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
    customNoSeek,
    customMaxSongs,
    router,
    displayName,
    ensurePlayerId,
    identityReady,
    closeCustomize,
  ]);

  if (universesLoading) {
    return <HomePageSkeleton />;
  }

  const modeToggle = (
    <div
      role="switch"
      aria-checked={mode === "multi"}
      aria-label="Mode de jeu"
      tabIndex={0}
      onClick={handleToggleMode}
      onKeyDown={handleToggleKeyDown}
      className="relative inline-flex items-center w-44 sm:w-52 h-12 rounded-full border-[3px] border-black bg-white shadow-[6px_6px_0_#0A0B0E] cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
    >
      <span
        aria-hidden="true"
        className={`absolute top-1 bottom-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-[var(--color-brand-primary)] border-2 border-black transition-transform duration-300 ease-out ${
          mode === "multi" ? "translate-x-full" : "translate-x-0"
        }`}
      />
      <span
        className={`relative z-10 flex-1 text-center text-xs sm:text-sm font-extrabold tracking-wide ${
          mode === "solo" ? "text-black" : "text-black/60"
        }`}
      >
        Solo
      </span>
      <span
        className={`relative z-10 flex-1 text-center text-xs sm:text-sm font-extrabold tracking-wide ${
          mode === "multi" ? "text-black" : "text-black/60"
        }`}
      >
        Multi
      </span>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 space-y-10">
      <HeroSection
        isAdmin={isAdmin}
        onAdminClick={() => router.push("/admin")}
        showSubtitle
      />
      
      <div>
        <div className="flex justify-center">{modeToggle}</div>
        <div
          aria-hidden={mode !== "multi"}
          className={`overflow-hidden transition-[max-height,opacity,transform,margin] duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)] origin-top ${
            mode === "multi"
              ? "max-h-[1600px] opacity-100 translate-y-0 mt-6"
              : "max-h-0 opacity-0 -translate-y-6 mt-0 pointer-events-none"
          }`}
        >
          <div className="pr-2 pb-2">
            <div className="magic-card p-6 md:p-8 space-y-6">
              <div className="flex flex-col gap-2 items-center text-center">
                <div className="w-full flex justify-center">
                  <input
                    {...form.register("displayName")}
                    placeholder="Votre pseudo"
                    className="w-full max-w-md bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] text-sm px-4 py-3 rounded-xl border-2 border-black focus:outline-none focus:border-black shadow-[3px_3px_0_#1B1B1B]"
                  />
                </div>
                {form.formState.errors.displayName && (
                  <p className="text-xs text-red-300">{form.formState.errors.displayName.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)] md:items-center">
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={handleCreateRoom}
                    disabled={isCreatingRoom || Boolean(hostRoomId)}
                    className="magic-button px-6 py-2 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {hostRoomId ? "Room créée" : isCreatingRoom ? "Création..." : "Créer une room"}
                  </button>
                  <input
                    type="password"
                    value={createPassword}
                    onChange={(event) => setCreatePassword(event.target.value)}
                    placeholder="Mot de passe (optionnel)"
                    className="w-full max-w-xs bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] text-xs px-4 py-2 rounded-xl border-2 border-black focus:outline-none focus:border-black shadow-[3px_3px_0_#1B1B1B]"
                  />
                </div>

                <div className="hidden md:block w-px self-stretch bg-black/15" aria-hidden="true" />

                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-[var(--color-text-secondary)]">Rooms disponibles</div>
                  {adaptedRooms.length === 0 && (
                    <div className="text-sm text-[var(--color-text-secondary)]">
                      {lobbyError ? `Erreur lobby: ${lobbyError}` : "Aucune room disponible pour le moment."}
                    </div>
                  )}
                  {adaptedRooms.length > 0 && (
                    <div className="grid grid-cols-1 gap-3">
                      {adaptedRooms.map((room) => (
                        <div
                          key={room.id}
                          className="flex flex-wrap items-center gap-3 rounded-xl border-2 border-black bg-[var(--color-surface-elevated)] px-4 py-3 shadow-[3px_3px_0_#1B1B1B]"
                        >
                          <div className="flex flex-col gap-1 min-w-[140px]">
                            <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                              {room.hasPassword && <Lock className="h-4 w-4" />}
                              <span>Hôte: {room.hostName || "Inconnu"}</span>
                              {room.hasPassword && (
                                <span className="text-[10px] uppercase tracking-[0.2em] text-[#B45309]">Protégée</span>
                              )}
                            </div>
                          </div>
                          {room.hasPassword && (
                            <input
                              type="password"
                              value={joinPasswords[room.id] ?? ""}
                              onChange={(event) =>
                                setJoinPasswords((prev) => ({
                                  ...prev,
                                  [room.id]: event.target.value,
                                }))
                              }
                              placeholder="Mot de passe"
                              className="flex-1 min-w-[160px] bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] text-xs px-3 py-2 rounded-xl border-2 border-black focus:outline-none focus:border-black shadow-[2px_2px_0_#1B1B1B]"
                            />
                          )}
                          <button
                            onClick={() => handleJoinRoom(room.id, joinPasswords[room.id])}
                            disabled={Boolean(room.hasPassword) && !(joinPasswords[room.id]?.trim())}
                            className="magic-button px-4 py-2 text-xs font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            Rejoindre
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {homeError && <div className="text-xs text-red-600">{homeError}</div>}
              {homeInfo && <div className="text-xs text-green-700">{homeInfo}</div>}
              {!lobbyConnected && <div className="text-xs text-amber-700">Connexion au lobby...</div>}
            </div>
          </div>
        </div>
      </div>
      {mode === "solo" && (
        <UniverseGrid
          universes={universes}
          error={universesError}
          onSelect={handleUniverseClick}
          onCustomize={openCustomize}
          onCustomMode={openCustomMode}
        />
      )}

      {customizingUniverse && (
        <UniverseCustomizeModal
          onApply={applyCustomizeAndPlay}
          isApplying={isCreatingRoom}
        />
      )}
    </div>
  );
};















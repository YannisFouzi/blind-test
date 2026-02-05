"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { usePartyKitRoom } from "@/features/multiplayer-game/hooks/usePartyKitRoom";
import { CUSTOM_UNIVERSE, MAX_WORKS_CUSTOM_MODE } from "@/features/home/hooks/useUniverseCustomization";
import { RANDOM_UNIVERSE_ID, WORKS_PER_ROUND_DEFAULT } from "@/constants/gameModes";
import { useGameConfiguration, useRoomAuthStore } from "@/stores";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { QuitRoomButton } from "@/components/ui/QuitRoomButton";
import { UniverseCustomizeModal } from "@/features/home/components/UniverseCustomizeModal";
import { useIdentity } from "@/features/game-ui/hooks/useIdentity";
import { useUniverses } from "@/features/home/hooks/useUniverses";
import { UniverseGrid } from "@/features/home/components/UniverseGrid";
import { getAllWorks, getSongsByWork, getWorksByUniverse } from "@/services/firebase";
import { shuffleArray } from "@/utils/formatters";
import type { Song, Universe } from "@/types";
import { useGameNavigation } from "@/features/game-ui/hooks/useGameNavigation";

export default function WaitingRoomPage() {
  const { navigate } = useGameNavigation();
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();

  const roomId = params?.roomId;

  const { playerId, displayName: storedName, ready: identityReady, setIdentity } = useIdentity();
  const queryPlayerId = searchParams?.get("player");
  const queryDisplayName = searchParams?.get("name");
  const pendingPassword = useRoomAuthStore((state) =>
    roomId ? state.pendingPasswords[roomId] : ""
  );
  const clearPendingPassword = useRoomAuthStore((state) => state.clearPendingPassword);

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
    isHost,
    allowedWorks,
    options,
    configureRoom,
    startGame,
    leaveRoom,
    authRequired,
    authError,
    submitPassword,
    isAuthenticated,
    hostPreview,
    sendHostPreviewStart,
    sendHostPreviewOptions,
    sendHostPreviewClear,
  } = usePartyKitRoom(
    identityReady && playerId && roomId
      ? {
          roomId,
          playerId,
          displayName,
          password: pendingPassword,
          navigate,
        }
      : {}
  );

  /** Hote effectif : serveur (join_success) ou URL (createur redirige avec host=1). Evite d'afficher "En attente de l'hote..." au createur avant la premiere synchro. Utilise l'URL des le premier rendu pour afficher la vue hote sans ecran de chargement. */
  const isHostEffective = useMemo(
    () =>
      isHost ||
      (searchParams.get("host") === "1" &&
        (Boolean(playerId) || Boolean(searchParams.get("player")))),
    [isHost, searchParams, playerId]
  );

  useEffect(() => {
    if (roomId && isAuthenticated) {
      clearPendingPassword(roomId);
    }
  }, [roomId, isAuthenticated, clearPendingPassword]);

  useEffect(() => {
    if (authRequired && pendingPassword) {
      setPasswordInput(pendingPassword);
    }
  }, [authRequired, pendingPassword]);

  const { universes, loading: universesLoading } = useUniverses();
  const [isConfiguringRoom, setIsConfiguringRoom] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");

  // Hook de personnalisation (partage avec HomeContent)
  const {
    customizingUniverse,
    allowedWorks: customAllowedWorks,
    allowedWorkNames: customAllowedWorkNames,
    noSeek: customNoSeek,
    maxSongs: customMaxSongs,
    worksPerRound: customWorksPerRound,
    effectiveSongsForPreview,
    totalWorksInUniverse,
    isCustomMode,
    isRandomMode,
    mysteryEffects,
    openCustomize: openCustomizeStore,
    closeCustomize,
  } = useGameConfiguration();

  const openCustomize = useCallback(
    (universe: Universe) => {
      openCustomizeStore(universe);
    },
    [openCustomizeStore]
  );

  // Envoyer la previsualisation aux invites quand l'hote ouvre/ferme le modal Personnaliser
  useEffect(() => {
    if (!isHostEffective || !sendHostPreviewStart || !sendHostPreviewClear) return;
    if (customizingUniverse) {
      sendHostPreviewStart(customizingUniverse.id, customizingUniverse.name);
      return () => sendHostPreviewClear();
    }
    sendHostPreviewClear();
  }, [isHostEffective, customizingUniverse, sendHostPreviewStart, sendHostPreviewClear]);

  // Envoyer les options en temps reel quand l'hote modifie la personnalisation
  useEffect(() => {
    if (!isHostEffective || !customizingUniverse || !sendHostPreviewOptions) return;
    const allWorksSelected =
      totalWorksInUniverse != null &&
      totalWorksInUniverse > 0 &&
      customAllowedWorks.length === totalWorksInUniverse;
    // Envoyer exactement ce que l'hote voit : effectiveSongsForPreview (0 si 0 oeuvres, sinon maxSongs ?? total selection)
    const totalSongsValue =
      effectiveSongsForPreview !== null &&
      effectiveSongsForPreview !== undefined &&
      Number.isInteger(effectiveSongsForPreview) &&
      effectiveSongsForPreview >= 0
        ? effectiveSongsForPreview
        : undefined;
    const maxSongsValue =
      customMaxSongs !== undefined && customMaxSongs !== null
        ? typeof customMaxSongs === "number" && Number.isInteger(customMaxSongs)
          ? customMaxSongs
          : undefined
        : undefined;
    sendHostPreviewOptions({
      noSeek: customNoSeek,
      mysteryEffects:
        mysteryEffects.enabled && mysteryEffects.selectedEffects.length > 0
          ? {
              enabled: true,
              frequency: mysteryEffects.frequency,
              effects: mysteryEffects.selectedEffects,
            }
          : undefined,
      allowedWorks: customAllowedWorks.length > 0 ? customAllowedWorks : undefined,
      allowedWorkNames: customAllowedWorkNames.length > 0 ? customAllowedWorkNames : undefined,
      allWorksSelected: allWorksSelected || undefined,
      maxSongs: maxSongsValue,
      totalSongs: totalSongsValue,
      worksPerRound: isRandomMode && customWorksPerRound != null ? customWorksPerRound : undefined,
    });
  }, [
    isHostEffective,
    customizingUniverse,
    sendHostPreviewOptions,
    customNoSeek,
    mysteryEffects.enabled,
    mysteryEffects.frequency,
    mysteryEffects.selectedEffects,
    customAllowedWorks,
    customAllowedWorkNames,
    totalWorksInUniverse,
    effectiveSongsForPreview,
    customMaxSongs,
    isRandomMode,
    customWorksPerRound,
  ]);

  const openCustomMode = useCallback(() => {
    openCustomizeStore(CUSTOM_UNIVERSE, {
      isCustomMode: true,
      maxWorksAllowed: MAX_WORKS_CUSTOM_MODE,
    });
  }, [openCustomizeStore]);

  const handlePasswordSubmit = useCallback(() => {
    const trimmed = passwordInput.trim();
    if (!trimmed) return;
    submitPassword(trimmed);
  }, [passwordInput, submitPassword]);

  // Appliquer les parametres et lancer le jeu (logique specifique multi avec PartyKit)
  const applyCustomizeAndPlay = useCallback(async () => {
    if (!customizingUniverse || !isHostEffective || !configureRoom) return;

    // FIX: sauvegarder avant closeCustomize() (qui reset le store)
    const savedMysteryEffects = { ...mysteryEffects };
    const savedAllowedWorks = [...customAllowedWorks];
    const savedNoSeek = customNoSeek;
    const savedMaxSongs = customMaxSongs;
    const savedIsCustomMode = isCustomMode;
    const savedIsRandomMode = isRandomMode || customizingUniverse.id === RANDOM_UNIVERSE_ID;
    const savedWorksPerRound = customWorksPerRound ?? (savedIsRandomMode ? WORKS_PER_ROUND_DEFAULT : undefined);

    const isCustomModeActive = savedIsCustomMode || customizingUniverse.id === CUSTOM_UNIVERSE.id;
    const isRandomModeActive = savedIsRandomMode;
    const universeId = isRandomModeActive
      ? RANDOM_UNIVERSE_ID
      : isCustomModeActive
        ? CUSTOM_UNIVERSE.id
        : customizingUniverse.id;

    closeCustomize();
    setIsConfiguringRoom(true);
    setConfigError(null);

    try {
      const worksResult =
        isCustomModeActive || isRandomModeActive
          ? await getAllWorks()
          : await getWorksByUniverse(customizingUniverse.id);

      if (!worksResult.success || !worksResult.data || worksResult.data.length === 0) {
        setConfigError("Aucune oeuvre trouvee");
        setIsConfiguringRoom(false);
        return;
      }

      const availableWorks = worksResult.data;

      const worksToUse = isCustomModeActive
        ? availableWorks.filter((work) => savedAllowedWorks.includes(work.id))
        : (savedAllowedWorks.length > 0 && savedAllowedWorks.length !== availableWorks.length
            ? availableWorks.filter((work) => savedAllowedWorks.includes(work.id))
            : availableWorks);

      if (worksToUse.length === 0) {
        setConfigError("Aucune oeuvre selectionnee");
        setIsConfiguringRoom(false);
        return;
      }

      // Charger les songs des works selectionnes
      const songPromises = worksToUse.map((work) => getSongsByWork(work.id));
      const songsResults = await Promise.all(songPromises);

      const allSongs: Song[] = [];
      for (const result of songsResults) {
        if (result.success && result.data) {
          allSongs.push(...result.data);
        }
      }

      if (allSongs.length === 0) {
        setConfigError("Aucune chanson trouvee pour les oeuvres selectionnees");
        setIsConfiguringRoom(false);
        return;
      }

      // Melanger et limiter selon maxSongs (ou toutes si null)
      const shuffled = shuffleArray([...allSongs]);
      const maxCount = savedMaxSongs !== null && savedMaxSongs < shuffled.length
        ? savedMaxSongs
        : shuffled.length;
      const selectedSongs = shuffled.slice(0, maxCount);

      const allowedWorkIds =
        isCustomModeActive || isRandomModeActive
          ? savedAllowedWorks
          : savedAllowedWorks.length > 0 && savedAllowedWorks.length !== availableWorks.length
            ? savedAllowedWorks
            : undefined;

      // Effets mysteres pour mode multi
      const mysteryEffectsConfig =
        savedMysteryEffects.enabled && savedMysteryEffects.selectedEffects.length > 0
          ? {
              enabled: true,
              frequency: savedMysteryEffects.frequency,
              effects: savedMysteryEffects.selectedEffects,
            }
          : undefined;

      // Validation : 100 % double + nombre impair de musiques = impossible
      if (
        mysteryEffectsConfig &&
        mysteryEffectsConfig.frequency === 100 &&
        mysteryEffectsConfig.effects.includes("double") &&
        selectedSongs.length % 2 !== 0
      ) {
        setConfigError(
          "Avec le mode \"Deux musiques en meme temps\" a 100 %, le nombre de musiques doit etre pair. Changez la frequence ou le nombre de musiques."
        );
        setIsConfiguringRoom(false);
        return;
      }

      await configureRoom(
        universeId,
        selectedSongs,
        allowedWorkIds,
        { noSeek: savedNoSeek },
        mysteryEffectsConfig,
        savedWorksPerRound ?? undefined
      );

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
    isHostEffective,
    configureRoom,
    startGame,
    customAllowedWorks,
    customNoSeek,
    customMaxSongs,
    customWorksPerRound,
    mysteryEffects,
    closeCustomize,
    isCustomMode,
    isRandomMode,
  ]);

  // Handler pour quand le HOST clique sur un univers (sans personnalisation)
  const handleUniverseClick = useCallback(
    async (universeId: string) => {
      if (!isHostEffective || !configureRoom) {
        console.warn("[WaitingRoomPage] Only host can select universe");
        return;
      }

      setIsConfiguringRoom(true);
      setConfigError(null);
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

        // 3. Melanger toutes les musiques (pas de limite par defaut)
        const shuffled = shuffleArray([...allSongs]);
        const selectedSongs = shuffled;

        // 4. Configurer la room via PartyKit
        console.info("[WaitingRoomPage] Configuring room with songs", {
          universeId,
          songsCount: selectedSongs.length,
        });

        const mysteryEffectsConfig =
          mysteryEffects.enabled && mysteryEffects.selectedEffects.length > 0
            ? {
                enabled: true,
                frequency: mysteryEffects.frequency,
                effects: mysteryEffects.selectedEffects,
              }
            : undefined;

        // Validation : 100 % double + nombre impair de musiques = impossible (derniere manche ne peut pas etre double)
        if (
          mysteryEffectsConfig &&
          mysteryEffectsConfig.frequency === 100 &&
          mysteryEffectsConfig.effects.includes("double") &&
          selectedSongs.length % 2 !== 0
        ) {
          setConfigError(
            "Avec le mode \"Deux musiques en meme temps\" a 100 %, le nombre de musiques doit etre pair. Changez la frequence ou choisissez un nombre de musiques pair."
          );
          setIsConfiguringRoom(false);
          return;
        }

        await configureRoom(universeId, selectedSongs, undefined, { noSeek: false }, mysteryEffectsConfig);

        console.info("[WaitingRoomPage] Room configured, now starting game");

        // Demarrer le jeu apres configuration
        if (startGame) {
          await startGame();
          console.info("[WaitingRoomPage] Game started, waiting for broadcast to redirect");
        }

        // La redirection se fera automatiquement via le useEffect auto-redirect
        // quand room.universeId sera mis a jour suite au broadcast room_configured
      } catch (error) {
        console.error("[WaitingRoomPage] Error configuring room:", error);
        setIsConfiguringRoom(false);
      }
    },
    [isHostEffective, configureRoom, startGame, roomId, mysteryEffects.enabled, mysteryEffects.frequency, mysteryEffects.selectedEffects]
  );

  const passwordGate = authRequired ? (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
      <div className="w-full max-w-sm magic-card p-6 space-y-4">
        <div className="text-center">
          <p className="text-lg font-bold text-[var(--color-text-primary)]">
            Room protegee
          </p>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Entrez le mot de passe pour rejoindre la room.
          </p>
        </div>
        <input
          type="password"
          value={passwordInput}
          onChange={(event) => setPasswordInput(event.target.value)}
          placeholder="Mot de passe"
          className="w-full bg-[var(--color-surface-overlay)] text-[var(--color-text-primary)] text-sm px-4 py-3 rounded-xl border-2 border-black focus:outline-none focus:border-black shadow-[3px_3px_0_#1B1B1B]"
        />
        {authError && (
          <div className="text-xs text-red-600 text-center">{authError}</div>
        )}
        <button
          onClick={handlePasswordSubmit}
          disabled={!passwordInput.trim()}
          className="magic-button w-full px-4 py-2 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
        >
          Valider
        </button>
      </div>
    </div>
  ) : null;

  // Des que l'univers est connu, on bascule sur la page de jeu
  useEffect(() => {
    // Protection : ne pas rediriger si universeId est vide (apres reset) ou si state est "idle"
    if (
      !identityReady ||
      !room?.universeId ||
      room.universeId === "" ||
      room.state === "idle" ||
      !roomId ||
      !playerId
    ) {
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
    navigate(targetUrl);
  }, [room?.universeId, room?.state, allowedWorks, options?.noSeek, roomId, playerId, displayName, identityReady, navigate]);

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-base)] text-[var(--color-text-primary)]">
        <ErrorMessage message="Room introuvable" />
      </div>
    );
  }

  // Si le HOST (serveur ou URL host=1) : afficher la selection d'univers
  if (isHostEffective && !room?.universeId) {
    return (
      <div className="h-screen min-h-0 overflow-y-auto scrollbar-hide bg-[var(--color-surface-base)]">
        {/* Quitter la room (hote) - en haut a gauche, meme composant qu'en jeu */}
        <QuitRoomButton
          onConfirm={() => {
            leaveRoom?.();
            navigate("/");
          }}
          title="Quitter la salle ?"
          className="fixed top-4 left-4 z-50"
        />
        <div className="container mx-auto px-4 py-12 space-y-10">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] mb-4">
              Selectionne un univers
            </h1>
          </div>

          <div className="p-6 max-w-2xl mx-auto">
            <div className="bg-white border-[3px] border-[#1B1B1B] rounded-2xl p-4 shadow-[3px_3px_0_#1B1B1B]">
              <p className="text-xs uppercase tracking-[0.15em] text-[var(--color-text-secondary)] mb-2">
                Joueurs connectes
              </p>
              {players.length === 0 ? (
                <p className="text-[var(--color-text-secondary)] text-sm">En attente de joueurs...</p>
              ) : (
                <ul className="space-y-2">
                  {players.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-xl border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]"
                    >
                      <span className="font-semibold">{p.displayName}</span>
                      <span className="flex items-center gap-2">
                        {p.isHost && p.id !== playerId && <span className="text-xs text-[#B45309]">Hote</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {universesLoading ? null : isConfiguringRoom ? (
            <div className="flex flex-col items-center gap-4">
              <LoadingSpinner />
              <p className="text-[var(--color-text-primary)]">Configuration de la room...</p>
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
            <div className="max-w-2xl mx-auto text-center text-red-600 text-sm">
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
        {passwordGate}
      </div>
    );
  }

  // Si INVITE : afficher page d'attente
  const mysteryEffectLabels: Record<string, string> = {
    double: "Deux musiques en meme temps",
    reverse: "Musique a l'envers",
  };

  const songsCount = hostPreview?.maxSongs ?? hostPreview?.totalSongs ?? null;

  return (
    <div className="h-screen min-h-0 overflow-y-auto scrollbar-hide bg-[var(--color-surface-base)]">
      {/* Quitter la room (invite) - fixe en haut a gauche, hors du flex pour ne pas etre centre */}
      <QuitRoomButton
        onConfirm={() => {
          leaveRoom?.();
          navigate("/");
        }}
        title="Quitter la salle ?"
        className="fixed top-4 left-4 z-50"
      />
      <div className="min-h-full flex items-center justify-center p-6">
        <div className="max-w-lg w-full text-[var(--color-text-primary)] space-y-4">
        <div className="text-sm text-[var(--color-text-secondary)] text-center">
          <p className="font-medium">En attente de l&apos;hote...</p>
        </div>

        {/* Joueurs connectes - meme DA que Personnalisation */}
        <div className="bg-white border-[3px] border-[#1B1B1B] rounded-2xl p-4 shadow-[3px_3px_0_#1B1B1B]">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-1 h-6 rounded-full bg-[var(--color-brand-primary)] border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]" aria-hidden />
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-text-primary)]">
              Joueurs connectes
            </p>
          </div>
          {players.length === 0 ? (
            <p className="text-[var(--color-text-secondary)] text-sm">En attente de joueurs...</p>
          ) : (
            <ul className="space-y-2">
              {players.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between text-sm bg-white px-3 py-2 rounded-xl border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]"
                >
                  <span className="font-semibold">{p.displayName}</span>
                  <span className="flex items-center gap-2">
                    {p.isHost && p.id !== playerId && <span className="text-xs text-[#B45309]">Hote</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Personnalisation en cours - design align DA (neo-brutaliste, badges, cartes) */}
        {hostPreview &&
          (hostPreview.universeId ||
            hostPreview.noSeek ||
            hostPreview.mysteryEffects?.enabled ||
            (hostPreview.allowedWorks?.length ?? 0) > 0 ||
            (hostPreview.allowedWorkNames?.length ?? 0) > 0 ||
            hostPreview.maxSongs != null ||
            hostPreview.totalSongs != null ||
            hostPreview.worksPerRound != null) && (
          <div className="max-w-lg mx-auto bg-white border-[3px] border-[#1B1B1B] rounded-2xl p-4 shadow-[3px_3px_0_#1B1B1B]">
            {/* Titre avec barre d'accent brand */}
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1 h-6 rounded-full bg-[var(--color-brand-primary)] border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]" aria-hidden />
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--color-text-primary)]">
                Personnalisation en cours
              </p>
            </div>

            <div className="space-y-2 text-left">
              {/* Univers */}
              {hostPreview.universeId && (
                <div className="flex items-center justify-between gap-2 flex-wrap bg-[var(--color-surface-overlay)] px-3 py-2 rounded-xl border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Univers
                  </span>
                  <span className="px-2 py-0.5 text-sm font-bold bg-[var(--color-brand-primary)] border-2 border-[#1B1B1B] rounded-lg shadow-[2px_2px_0_#1B1B1B] text-[var(--color-text-primary)]">
                    {hostPreview.universeName || hostPreview.universeId}
                  </span>
                </div>
              )}

              {/* Mode sans avance rapide */}
              {hostPreview.noSeek && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 border-[#1B1B1B] bg-white shadow-[2px_2px_0_#1B1B1B]">
                  <span className="text-sm font-semibold text-[var(--color-text-primary)]">
                    Mode sans avance rapide
                  </span>
                  <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-amber-100 text-[var(--color-text-primary)] rounded border-2 border-[#1B1B1B] shadow-[1px_1px_0_#1B1B1B]">
                    Active
                  </span>
                </div>
              )}

              {/* Effets mysteres */}
              {hostPreview.mysteryEffects?.enabled && hostPreview.mysteryEffects.effects?.length > 0 && (
                <div className="px-3 py-2 rounded-xl border-2 border-[#1B1B1B] bg-white shadow-[2px_2px_0_#1B1B1B] space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Effets mysteres
                    </span>
                    <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-purple-100 text-[var(--color-text-primary)] rounded border-2 border-[#1B1B1B] shadow-[1px_1px_0_#1B1B1B]">
                      {hostPreview.mysteryEffects.frequency} %
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {hostPreview.mysteryEffects.effects.map((e) => (
                      <span
                        key={e}
                        className="px-2 py-1 text-xs font-semibold bg-white border-2 border-[#1B1B1B] rounded-lg shadow-[2px_2px_0_#1B1B1B] text-[var(--color-text-primary)]"
                      >
                        {mysteryEffectLabels[e] || e}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Oeuvres par manche (mode aleatoire) */}
              {hostPreview.worksPerRound != null && (
                <div className="flex items-center justify-between gap-2 flex-wrap bg-[var(--color-surface-overlay)] px-3 py-2 rounded-xl border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Oeuvres par manche
                  </span>
                  <span className="px-2 py-0.5 text-sm font-bold bg-emerald-100 border-2 border-[#1B1B1B] rounded-lg shadow-[2px_2px_0_#1B1B1B] text-[var(--color-text-primary)]">
                    {hostPreview.worksPerRound} choix
                  </span>
                </div>
              )}

              {/* Oeuvres incluses */}
              {((hostPreview.allowedWorkNames?.length ?? 0) > 0 || (hostPreview.allowedWorks?.length ?? 0) > 0) && (
                <div className="px-3 py-2 rounded-xl border-2 border-[#1B1B1B] bg-white shadow-[2px_2px_0_#1B1B1B] space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                      Oeuvres incluses
                    </span>
                    {hostPreview.allWorksSelected && (
                      <span className="px-2 py-0.5 text-xs font-bold uppercase tracking-wider bg-yellow-200 text-[var(--color-text-primary)] rounded border-2 border-[#1B1B1B] shadow-[1px_1px_0_#1B1B1B]">
                        Toutes
                      </span>
                    )}
                  </div>
                  {hostPreview.allowedWorkNames && hostPreview.allowedWorkNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {hostPreview.allowedWorkNames.map((name, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-sm font-semibold bg-yellow-100 border-2 border-[#1B1B1B] rounded-lg shadow-[2px_2px_0_#1B1B1B] text-[var(--color-text-primary)]"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm font-semibold text-[var(--color-text-primary)]">
                      {hostPreview.allowedWorks?.length ?? 0} oeuvre{(hostPreview.allowedWorks?.length ?? 0) > 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              )}

              {/* Nombre de chansons */}
              {songsCount != null && songsCount > 0 && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border-2 border-[#1B1B1B] bg-[var(--color-surface-overlay)] shadow-[2px_2px_0_#1B1B1B]">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Nombre de musiques
                  </span>
                  <span className="px-3 py-1 text-base font-extrabold bg-[var(--color-brand-primary)] border-2 border-[#1B1B1B] rounded-xl shadow-[2px_2px_0_#1B1B1B] text-[var(--color-text-primary)]">
                    {songsCount} chanson{songsCount > 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
        </div>
      </div>
      {passwordGate}
    </div>
  );
}

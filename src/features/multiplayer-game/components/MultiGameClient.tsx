"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
import {
  Check,
  Home as HomeIcon,
  LogOut,
  Pause,
  Play as PlayIcon,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { RoomPlayer } from "@/types";

import { useMultiplayerGame } from "../hooks/useMultiplayerGame";
import { PlayersScoreboard } from "./PlayersScoreboard";
import { useAudioPlayer, useDoubleAudioPlayer } from "@/features/audio-player";
import { WorkSelector, DoubleWorkSelector } from "@/components/game";
import { PointsCelebration } from "@/components/game/PointsCelebration";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { QuitRoomButton } from "@/components/ui/QuitRoomButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { cn } from "@/lib/utils";
import { pressable } from "@/styles/ui";

/** Joueur avec champ ready (phase starting) */
type PlayerWithReady = RoomPlayer & { ready?: boolean };

interface StartingPhaseUIProps {
  players: PlayerWithReady[];
  readyCount: number;
  totalCount: number;
  startAt?: number;
  playerId: string;
  onLeave: () => void;
  isHost: boolean;
  resetToWaiting?: () => void;
}

function StartingPhaseUI({
  players,
  readyCount,
  totalCount,
  startAt,
  playerId,
  onLeave,
  isHost,
  resetToWaiting,
}: StartingPhaseUIProps) {
  const [countdown, setCountdown] = useState<number | null>(null);
  useEffect(() => {
    if (startAt == null) {
      setCountdown(null);
      return;
    }
    const tick = () => {
      const remaining = startAt - Date.now();
      if (remaining <= 0) {
        setCountdown(null);
        return;
      }
      if (remaining > 2000) setCountdown(3);
      else if (remaining > 1000) setCountdown(2);
      else if (remaining > 0) setCountdown(1);
      else setCountdown(null);
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startAt]);

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] flex flex-col items-center justify-center p-6">
      <div className="fixed top-3 left-2 sm:top-6 sm:left-6 z-50 flex flex-col items-start gap-2">
        {isHost && resetToWaiting && (
          <ConfirmActionButton
            buttonLabel="Accueil"
            title="Retour à la salle d'attente ?"
            message="Vous allez revenir à la salle d'attente. La partie restera configurée."
            confirmText="Oui, retour"
            cancelText="Annuler"
            onConfirm={() => void resetToWaiting()}
            variant="warning"
            className="magic-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <HomeIcon className="text-base sm:text-lg" />
            <span className="hidden sm:inline">Accueil</span>
          </ConfirmActionButton>
        )}
        <QuitRoomButton onConfirm={onLeave} title="Quitter la partie ?" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--color-text-primary)] mb-6 text-center">
        Démarrage de la partie...
      </h1>

      <p className="text-lg text-[var(--color-text-secondary)] mb-8">
        {readyCount} / {totalCount} joueurs prêts
      </p>

      <ul className="space-y-2 w-full max-w-xs mb-10">
        {players.map((p) => (
          <li
            key={p.id}
            className={cn(
              "flex items-center justify-between gap-3 px-4 py-2 rounded-lg",
              "bg-[var(--color-surface-elevated)] border-2",
              p.id === playerId ? "border-[var(--color-accent)]" : "border-transparent"
            )}
          >
            <span className="font-medium text-[var(--color-text-primary)] truncate">
              {p.displayName}
              {p.id === playerId && (
                <span className="ml-2 text-xs text-[var(--color-text-secondary)]">(toi)</span>
              )}
            </span>
            {(p as PlayerWithReady).ready ? (
              <Check className="shrink-0 w-5 h-5 text-green-600" aria-hidden />
            ) : (
              <span className="text-sm text-[var(--color-text-secondary)]">En attente...</span>
            )}
          </li>
        ))}
      </ul>

      {countdown != null && (
        <div className="text-6xl sm:text-8xl font-display font-bold text-[var(--color-accent)] animate-pulse">
          {countdown}
        </div>
      )}
      {startAt != null && countdown === null && Date.now() >= startAt - 200 && (
        <p className="text-xl font-display font-bold text-[var(--color-accent)]">C&apos;est parti !</p>
      )}
    </div>
  );
}

export interface MultiGameClientProps {
  universeId: string;
  roomId: string;
  playerId: string;
  displayName: string;
  noSeek?: boolean;
}

export const MultiGameClient = ({
  universeId,
  roomId,
  playerId,
  displayName,
  noSeek = false,
}: MultiGameClientProps) => {
  const router = useRouter();

  const particlePositions = useMemo(
    () => [
      { top: 15, left: 20 },
      { top: 35, left: 75 },
      { top: 55, left: 25 },
      { top: 70, left: 85 },
      { top: 85, left: 15 },
      { top: 20, left: 60 },
      { top: 45, left: 90 },
      { top: 65, left: 40 },
      { top: 90, left: 70 },
      { top: 25, left: 35 },
      { top: 50, left: 80 },
      { top: 75, left: 10 },
      { top: 30, left: 55 },
      { top: 60, left: 30 },
      { top: 80, left: 65 },
      { top: 40, left: 45 },
      { top: 12, left: 85 },
      { top: 67, left: 12 },
      { top: 82, left: 92 },
      { top: 38, left: 68 },
    ],
    []
  );
  const [passwordInput, setPasswordInput] = useState("");

  // Refs pour déléguer à des callbacks définis après les hooks audio (évite dépendance circulaire)
  const preloadTrackRef = useRef<(url: string) => void>(() => {});
  const redirectRef = useRef<() => void>(() => {});

  const game = useMultiplayerGame({
    universeId,
    roomId,
    playerId,
    displayName,
    preloadNextTrack: (song) => {
      if (song?.audioUrl) preloadTrackRef.current(song.audioUrl);
    },
    onRedirect: () => redirectRef.current?.(),
    navigate: (url) => router.push(url),
  });

  const {
    works,
    currentSong,
    selectedWork,
    showAnswer,
    canGoNext,
    isCurrentSongAnswered,
    handleAnswer,
    validateAnswer,
    nextSong,
    showScores,
    room,
    players,
    state,
    isConnected,
    lastGain,
    authRequired,
    authError,
    submitPassword,
    allPlayersAnswered,
    isHost,
    isLoadingWorks,
    isReverseMode,
    isDoubleMode,
    currentRoundSongs,
    displayedSongIndex,
    displayedTotalSongs,
    roundCount,
    currentRoundIndex,
    doubleSelectedWorkSlot1,
    doubleSelectedWorkSlot2,
    handleDoubleSelection,
    clearDoubleSelectionForWork,
    sendPlayerReady,
    startAt,
  } = game;

  // autoPlay : false pour le premier slot affiché (toujours lancé par le timer à startAt).
  // Avec les rounds, currentSongIndex peut être > 0 pour le premier slot (ex. 28), donc on utilise displayedSongIndex.
  const currentSongIndex = room?.currentSongIndex ?? 0;
  const displayedIdx = room?.displayedSongIndex ?? currentSongIndex + 1;
  const shouldAutoPlay = displayedIdx > 1;

  const {
    isPlaying: audioIsPlaying,
    volume: audioVolume,
    currentTime: audioCurrentTime,
    duration: audioDuration,
    isMuted: audioIsMuted,
    error: audioError,
    play: audioPlay,
    togglePlay: audioTogglePlay,
    setVolume: audioSetVolume,
    toggleMute: audioToggleMute,
    seek: audioSeek,
    loadTrack: audioLoadTrack,
    preloadTrack: audioPreloadTrack,
    reset: audioReset,
  } = useAudioPlayer({
    noSeek,
    autoPlay: shouldAutoPlay,
  });

  const {
    isPlaying: doubleIsPlaying,
    volume: doubleVolume,
    currentTime: doubleCurrentTime,
    duration: doubleDuration,
    isMuted: doubleIsMuted,
    error: doubleError,
    play: doublePlay,
    togglePlay: doubleTogglePlay,
    setVolume: doubleSetVolume,
    toggleMute: doubleToggleMute,
    seek: doubleSeek,
    loadTracks: doubleLoadTracks,
    reset: doubleReset,
  } = useDoubleAudioPlayer({
    noSeek,
    autoPlay: shouldAutoPlay,
  });

  redirectRef.current = () => {
    audioReset();
    doubleReset();
  };
  preloadTrackRef.current = audioPreloadTrack;

  // ⭐ Refs stables pour les fonctions play (évite re-run des useEffect de sync)
  const audioPlayRef = useRef(audioPlay);
  const doublePlayRef = useRef(doublePlay);

  /** Refs pour les timers startAt : survivent au re-render quand game_started efface startAt (cleanup ne doit pas annuler le timer). */
  const audioStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doubleAudioStartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    audioPlayRef.current = audioPlay;
  }, [audioPlay]);

  useEffect(() => {
    doublePlayRef.current = doublePlay;
  }, [doublePlay]);

  useEffect(() => {
    if (authRequired) {
      setPasswordInput("");
    }
  }, [authRequired]);

  // Ready Check : envoyer player_ready une seule fois quand on est en phase "starting" et connecté
  const playerReadySentRef = useRef(false);
  useEffect(() => {
    if (state !== "starting" || !isConnected) return;
    if (playerReadySentRef.current) return;
    playerReadySentRef.current = true;
    sendPlayerReady?.();
  }, [state, isConnected, sendPlayerReady]);

  // Déterminer l'URL audio à utiliser (normal ou reverse) pour le mode simple
  const audioUrlToUse = useMemo(() => {
    if (!currentSong) return null;
    if (isReverseMode && currentSong.audioUrlReversed) {
      return currentSong.audioUrlReversed;
    }
    return currentSong.audioUrl || null;
  }, [currentSong, isReverseMode]);

  // URLs pour le mode double (2 morceaux normaux, pas de reverse)
  const doubleUrls = useMemo(() => {
    if (!isDoubleMode || !currentRoundSongs || currentRoundSongs.length === 0) {
      return { primary: null as string | null, secondary: null as string | null };
    }
    const first = currentRoundSongs[0];
    const second = currentRoundSongs[1];
    const primary = first?.audioUrl || null;
    const secondary = second?.audioUrl || null;
    return { primary, secondary };
  }, [isDoubleMode, currentRoundSongs]);

  // Chargement audio en phase "starting" ou "playing" (préchargement pendant countdown)
  useEffect(() => {
    // En mode double, on reset l'audio simple et on laisse le hook dédié gérer le chargement
    if (isDoubleMode) {
      audioReset();
      return;
    }

    // Ne charger que si on est en phase "starting" (préchargement) ou "playing" (partie lancée)
    if (state !== "starting" && state !== "playing") {
      audioReset();
      return;
    }

    if (audioUrlToUse) {
      void audioLoadTrack(audioUrlToUse);
    } else {
      audioReset();
    }
  }, [audioUrlToUse, audioLoadTrack, audioReset, isDoubleMode, state]);

  // Chargement des deux pistes en mode double (préchargement pendant countdown)
  useEffect(() => {
    if (!isDoubleMode) {
      doubleReset();
      return;
    }

    // Ne charger que si on est en phase "starting" (préchargement) ou "playing" (partie lancée)
    if (state !== "starting" && state !== "playing") {
      doubleReset();
      return;
    }

    const { primary, secondary } = doubleUrls;

    if (!primary && !secondary) {
      doubleReset();
      return;
    }

    console.log("[AUDIO-DEBUG] Double load effect: calling loadTracks", {
      state,
      isDoubleMode,
      currentSongIndex,
      shouldAutoPlay,
    });
    void doubleLoadTracks(primary, secondary);
  }, [isDoubleMode, doubleUrls, doubleLoadTracks, doubleReset, state, currentSongIndex, shouldAutoPlay]);

  // ⭐ SYNCHRONISATION AUDIO : Lancer exactement à startAt (mode normal/reverse)
  // Timer stocké dans une ref pour survivre au re-render quand game_started efface startAt (sinon le cleanup annulerait le timer avant qu'il ne se déclenche).
  useEffect(() => {
    if (isDoubleMode) return;
    if (!startAt) return;

    const delay = startAt - Date.now();

    if (delay <= 0) {
      audioPlayRef.current();
      return;
    }

    if (audioStartTimerRef.current) {
      clearTimeout(audioStartTimerRef.current);
      audioStartTimerRef.current = null;
    }

    const timerId = setTimeout(() => {
      audioStartTimerRef.current = null;
      audioPlayRef.current();
    }, delay);
    audioStartTimerRef.current = timerId;

    // Ne pas annuler le timer dans le cleanup : quand game_started arrive, startAt devient undefined, l'effet re-run et le cleanup tuerait le timer. On nettoie uniquement au démontage (voir useEffect ci-dessous).
    return () => {};
  }, [startAt, isDoubleMode]);

  // ⭐ SYNCHRONISATION AUDIO : Lancer exactement à startAt (mode double)
  // Même principe : timer dans une ref pour survivre au re-render quand game_started efface startAt.
  useEffect(() => {
    if (!isDoubleMode) return;
    if (!startAt) return;

    const delay = startAt - Date.now();

    console.log("[AUDIO-DEBUG] Double timer effect", {
      startAt,
      isDoubleMode,
      delayMs: Math.round(delay),
      delayNegative: delay <= 0,
    });

    if (delay <= 0) {
      console.log("[AUDIO-DEBUG] Double timer: startAt déjà passé → play immédiat");
      doublePlayRef.current();
      return;
    }

    if (doubleAudioStartTimerRef.current) {
      clearTimeout(doubleAudioStartTimerRef.current);
      doubleAudioStartTimerRef.current = null;
    }

    const timerId = setTimeout(() => {
      doubleAudioStartTimerRef.current = null;
      console.log("[AUDIO-DEBUG] Double timer FIRED → play()");
      doublePlayRef.current();
    }, delay);
    doubleAudioStartTimerRef.current = timerId;

    return () => {};
  }, [startAt, isDoubleMode]);

  // Nettoyage des timers startAt uniquement au démontage du composant (évite les fuites).
  useEffect(() => {
    return () => {
      if (audioStartTimerRef.current) {
        clearTimeout(audioStartTimerRef.current);
        audioStartTimerRef.current = null;
      }
      if (doubleAudioStartTimerRef.current) {
        clearTimeout(doubleAudioStartTimerRef.current);
        doubleAudioStartTimerRef.current = null;
      }
    };
  }, []);

  const isDoubleRound = isDoubleMode;

  const effectiveIsPlaying = isDoubleRound ? doubleIsPlaying : audioIsPlaying;
  const effectiveCurrentTime = isDoubleRound ? doubleCurrentTime : audioCurrentTime;
  const effectiveDuration = isDoubleRound ? doubleDuration : audioDuration;
  const effectiveVolume = isDoubleRound ? doubleVolume : audioVolume;
  const effectiveIsMuted = isDoubleRound ? doubleIsMuted : audioIsMuted;
  const effectiveError = isDoubleRound ? doubleError : audioError;

  const handlePlayToggle = useCallback(() => {
    if (isDoubleRound) {
      if (!doubleUrls.primary && !doubleUrls.secondary) return;
      doubleTogglePlay();
      return;
    }

    if (!audioUrlToUse) return;
    audioTogglePlay();
  }, [isDoubleRound, doubleUrls, doubleTogglePlay, audioUrlToUse, audioTogglePlay]);

  const handleVolumeChange = useCallback(
    (value: number) => {
      if (isDoubleRound) {
        doubleSetVolume(value);
      } else {
        audioSetVolume(value);
      }
    },
    [audioSetVolume, doubleSetVolume, isDoubleRound]
  );

  const handleTimelineClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (noSeek) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = (clickX / rect.width) * 100;
      const newProgress = Math.max(0, Math.min(100, percentage));
      if (isDoubleRound) {
        doubleSeek(newProgress);
      } else {
        audioSeek(newProgress);
      }
    },
    [audioSeek, doubleSeek, noSeek, isDoubleRound]
  );

  const handleWorkSelection = useCallback(
    (workId: string) => {
      handleAnswer(workId);
    },
    [handleAnswer]
  );

  const handleValidateAnswer = useCallback(() => {
    validateAnswer();
  }, [validateAnswer]);

  const handleNextSong = useCallback(() => {
    nextSong();
  }, [nextSong]);

  const handleShowScores = useCallback(() => {
    showScores();
  }, [showScores]);

  const handleLeaveRoom = useCallback(() => {
    game.leaveRoom?.();
    router.push("/");
  }, [router, game]);

  const formatTime = useCallback((seconds: number): string => {
    if (!isFinite(seconds) || isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const playbackUnavailable = useMemo(() => {
    if (isDoubleRound) {
      return !doubleUrls.primary && !doubleUrls.secondary;
    }
    return !audioUrlToUse;
  }, [audioUrlToUse, doubleUrls, isDoubleRound]);

  const progress = useMemo(
    () => (effectiveDuration ? (effectiveCurrentTime / effectiveDuration) * 100 : 0),
    [effectiveDuration, effectiveCurrentTime]
  );
  const currentPlayer = useMemo(
    () => players.find((player) => player.id === playerId),
    [players, playerId]
  );
  const currentPlayerScore = useMemo(
    () => ({
      correct: currentPlayer?.correct ?? 0,
      incorrect: currentPlayer?.incorrect ?? 0,
    }),
    [currentPlayer]
  );

  // Vérifier si on est au dernier morceau : priorité roundCount (rounds), sinon displayedSongIndex
  const isLastSong = useMemo(() => {
    if (roundCount != null && roundCount > 0) {
      return (currentRoundIndex ?? 0) >= roundCount - 1;
    }
    return displayedSongIndex >= displayedTotalSongs;
  }, [roundCount, currentRoundIndex, displayedSongIndex, displayedTotalSongs]);

  // Déterminer si on doit afficher "Voir les scores" ou "Morceau suivant"
  // Garde: ne pas afficher si pas de morceaux (évite envoi show_scores avec état vide)
  const shouldShowScoresButton = useMemo(
    () =>
      isHost &&
      displayedTotalSongs >= 1 &&
      isLastSong &&
      allPlayersAnswered &&
      showAnswer,
    [isHost, displayedTotalSongs, isLastSong, allPlayersAnswered, showAnswer]
  );

  const answerFooter = useMemo(() => {
    if (!showAnswer) return null;

    if (isDoubleMode && currentRoundSongs.length > 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="px-5 py-3 rounded-2xl bg-white border-[3px] border-[#1B1B1B] text-center shadow-[4px_4px_0_#1B1B1B] space-y-1.5">
            {currentRoundSongs.map((song) => {
              const work = works.find((w) => w.id === song.workId);
              return (
                <p
                  key={song.id}
                  className="text-xs sm:text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide"
                >
                  {song.artist} &mdash;{" "}
                  <span className="text-[#B45309]">{song.title}</span>
                  {work && (
                    <span className="ml-2 text-[0.75rem] sm:text-xs text-[var(--color-text-secondary)]">
                      ({work.title})
                    </span>
                  )}
                </p>
              );
            })}
          </div>
          {shouldShowScoresButton ? (
            <button
              onClick={handleShowScores}
              className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
            >
              <span className="relative z-10 flex items-center gap-2">
                Voir les scores
              </span>
            </button>
          ) : (
            canGoNext && isHost && (
              <button
                onClick={handleNextSong}
                className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Morceau suivant
                </span>
              </button>
            )
          )}
        </div>
      );
    }

    // Mode normal/reverse : toujours afficher le footer quand showAnswer (boutons + titre si dispo)
    return (
      <div className="flex flex-col items-center justify-center gap-3">
        {(currentSong?.artist ?? currentSong?.title) && (
          <div className="px-5 py-3 rounded-2xl bg-white border-[3px] border-[#1B1B1B] text-center shadow-[4px_4px_0_#1B1B1B]">
            <p className="text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide">
              {currentSong?.artist} {currentSong?.artist && currentSong?.title ? "&mdash; " : ""}
              <span className="text-[#B45309]">{currentSong?.title ?? ""}</span>
            </p>
          </div>
        )}
        {shouldShowScoresButton ? (
          <button
            onClick={handleShowScores}
            className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
          >
            <span className="relative z-10 flex items-center gap-2">
              Voir les scores
            </span>
          </button>
        ) : (
          canGoNext && isHost && (
            <button
              onClick={handleNextSong}
              className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
            >
              <span className="relative z-10 flex items-center gap-2">
                Morceau suivant
              </span>
            </button>
          )
        )}
      </div>
    );
  }, [showAnswer, isDoubleMode, currentRoundSongs, works, shouldShowScoresButton, canGoNext, isHost, handleShowScores, handleNextSong, currentSong]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-[var(--color-text-primary)] mt-4 font-semibold">
            Connexion au serveur...
          </p>
        </div>
      </div>
    );
  }

  // Phase Ready Check (starting) : X/Y prêts + countdown 3-2-1
  if (state === "starting") {
    const readyCount = players.filter((p) => (p as RoomPlayer & { ready?: boolean }).ready).length;
    const totalCount = players.length;
    return (
      <StartingPhaseUI
        players={players}
        readyCount={readyCount}
        totalCount={totalCount}
        startAt={startAt}
        playerId={playerId}
        onLeave={handleLeaveRoom}
        isHost={isHost}
        resetToWaiting={game.resetToWaiting}
      />
    );
  }

  if (!currentSong) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-[var(--color-text-primary)] mt-4 font-semibold">
            En attente de la playlist de la room...
          </p>
          {room?.hostId && playerId !== room.hostId && (
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              L&apos;hote doit demarrer la partie. (Hote: {room.hostId.slice(0, 8)})
            </p>
          )}
        </div>
      </div>
    );
  }

  // Attendre que les works soient chargés avant de vérifier s'ils sont vides
  if (!isLoadingWorks && works.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage message="Aucune oeuvre trouvee pour cet univers" />
          <button onClick={handleLeaveRoom} className="magic-button mt-6 px-6 py-3">
            <LogOut className="inline mr-2" />
            Quitter
          </button>
        </div>
      </div>
    );
  }

  // Si les works sont en cours de chargement, afficher un loader
  if (isLoadingWorks) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-[var(--color-text-primary)] mt-4 font-semibold">
            Chargement des oeuvres...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] relative overflow-hidden">
      <PointsCelebration points={lastGain?.points ?? null} triggerKey={lastGain?.key} />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particlePositions.map((position) => (
          <div
            key={`${position.top}-${position.left}`}
            className="particle"
            style={{
              top: `${position.top}%`,
              left: `${position.left}%`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/40 via-transparent to-blue-200/40 pointer-events-none" />

      <div className="fixed top-3 left-2 sm:top-6 sm:left-6 z-50 flex flex-col items-start gap-2">
        {isHost && (
          <ConfirmActionButton
            buttonLabel="Accueil"
            title="Retour à la salle d'attente ?"
            message="Vous allez revenir à la salle d'attente. La partie restera configurée."
            confirmText="Oui, retour"
            cancelText="Annuler"
            onConfirm={() => void game.resetToWaiting?.()}
            variant="warning"
            className="magic-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <HomeIcon className="text-base sm:text-lg" />
            <span className="hidden sm:inline">Accueil</span>
          </ConfirmActionButton>
        )}
        <QuitRoomButton
          onConfirm={handleLeaveRoom}
          title="Quitter la partie ?"
        />
      </div>

      <div className="fixed top-6 right-6 z-40 hidden lg:block">
        <PlayersScoreboard players={players} currentPlayerId={playerId} />
      </div>

      <div className="container mx-auto px-4 py-8 pb-24 relative z-10">
        <div className="lg:hidden flex justify-center mb-6">
          <PlayersScoreboard players={players} currentPlayerId={playerId} />
        </div>

        <div className="flex flex-col items-center justify-center gap-4 min-h-[calc(100svh-220px)] sm:min-h-[calc(100svh-240px)] md:min-h-[calc(100svh-280px)]">
          <div className="w-full flex justify-center">
            {isDoubleMode && currentRoundSongs.length >= 1 ? (
              <DoubleWorkSelector
                works={works}
                roundSongs={currentRoundSongs}
                selectedWorkSlot1={doubleSelectedWorkSlot1}
                selectedWorkSlot2={doubleSelectedWorkSlot2}
                showAnswer={showAnswer}
                canValidate={
                  !!doubleSelectedWorkSlot1 &&
                  !!doubleSelectedWorkSlot2 &&
                  !showAnswer &&
                  state === "playing"
                }
                isCurrentSongAnswered={isCurrentSongAnswered}
                onSelectSlotWork={handleDoubleSelection}
                onValidateAnswer={handleValidateAnswer}
                onClearWorkSelection={clearDoubleSelectionForWork}
                footer={answerFooter}
              />
            ) : (
              <WorkSelector
                works={works}
                currentSongWorkId={currentSong?.workId}
                selectedWork={selectedWork}
                showAnswer={showAnswer}
                canValidate={!!selectedWork && !showAnswer && state === "playing"}
                isCurrentSongAnswered={isCurrentSongAnswered}
                onWorkSelection={handleWorkSelection}
                onValidateAnswer={handleValidateAnswer}
                footer={answerFooter}
              />
            )}
          </div>
          {game.submitError && (
            <div className="px-4 py-2 rounded-xl bg-[#FFE5E5] border-2 border-[#1B1B1B] text-center text-xs text-red-700 shadow-[2px_2px_0_#1B1B1B]">
              {game.submitError}
            </div>
          )}
        </div>

      </div>


      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FDE68A]/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#BFDBFE]/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FBCFE8]/40 rounded-full blur-3xl" />
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="player-dome mx-auto w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-6xl bg-white border-[3px] border-b-0 border-[#1B1B1B] shadow-[0_-6px_0_#1B1B1B] pointer-events-auto overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center gap-4 sm:gap-5">
                <button
                  onClick={handlePlayToggle}
                  disabled={playbackUnavailable}
                  className={`magic-button rounded-full p-4 ${playbackUnavailable ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {effectiveIsPlaying ? (
                    <Pause className="w-5 h-5 text-[#1B1B1B]" />
                  ) : (
                    <PlayIcon className="w-5 h-5 text-[#1B1B1B]" />
                  )}
                </button>

                {game.isHost && (
                  <button
                    onClick={handleNextSong}
                    disabled={!game.canGoNext}
                    className={cn(
                      "magic-button p-2 rounded-full bg-white hover:bg-[var(--color-surface-overlay)]",
                      !game.canGoNext && "opacity-60"
                    )}
                  >
                    <SkipForward className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="w-full max-w-4xl flex flex-col items-center gap-2 sm:gap-3">
                <div className="flex items-center justify-between w-full text-[var(--color-text-primary)] text-xs font-semibold">
                  <span>{formatTime(effectiveCurrentTime)}</span>
                  <div className="flex items-center gap-2">
                    {isReverseMode && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f97316] px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-[#1B1B1B] border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] whitespace-nowrap">
                        <span className="inline-block rotate-180">
                          <PlayIcon className="w-3 h-3" />
                        </span>
                        <span>Reverse</span>
                      </span>
                    )}
                    {isDoubleMode && !isReverseMode && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e] px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide text-[#1B1B1B] border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] whitespace-nowrap">
                        <span className="text-xs font-black leading-none">×2</span>
                        <span>Double</span>
                      </span>
                    )}
                  </div>
                  <span>{formatTime(effectiveDuration)}</span>
                </div>

                <div
                  className="w-full magic-progress-bar h-3 cursor-pointer"
                  onClick={handleTimelineClick}
                >
                  <div className="magic-progress-fill h-full" style={{ width: `${progress}%` }} />
                </div>

                <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center text-sm gap-3 pt-1">
                  <span className="text-[#B45309] font-semibold">
                    {isDoubleMode && currentRoundSongs.length === 2
                      ? `Morceau ${displayedSongIndex}+${displayedSongIndex + 1} / ${displayedTotalSongs}`
                      : `Morceau ${displayedSongIndex} / ${displayedTotalSongs}`}
                  </span>

                  <div className="flex items-center justify-center gap-3 text-xs">
                    <span className="px-3 py-1 rounded-full bg-[#86efac] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {currentPlayerScore.correct}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#fca5a5] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {currentPlayerScore.incorrect}
                    </span>
                  </div>

                  <div className="hidden md:flex items-center justify-end gap-3 text-[var(--color-text-primary)] text-xs">
                    <button
                      onClick={isDoubleRound ? doubleToggleMute : audioToggleMute}
                      className={cn(
                        "p-2 rounded-full bg-white hover:bg-[var(--color-surface-overlay)]",
                        pressable
                      )}
                    >
                      {effectiveIsMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-28 magic-progress-bar h-2 cursor-pointer"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const percentage = (clickX / rect.width) * 100;
                          const newVolume = Math.max(0, Math.min(100, percentage));
                          handleVolumeChange(newVolume);
                        }}
                      >
                        <div
                          className="magic-progress-fill h-full"
                          style={{ width: `${effectiveVolume}%` }}
                        />
                      </div>
                      <span className="text-[var(--color-text-primary)] text-xs w-10 text-center">
                        {Math.round(effectiveVolume)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {effectiveError && (
        <div className="mt-4 text-center text-sm text-red-600">{effectiveError}</div>
      )}

      {playbackUnavailable && (
        <div className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          Aucun extrait audio n&apos;est disponible pour ce morceau.
        </div>
      )}

      {authRequired && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="w-full max-w-sm magic-card p-6 space-y-4">
            <div className="text-center">
              <p className="text-lg font-bold text-[var(--color-text-primary)]">
              Room protegée
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
              onClick={() => submitPassword(passwordInput)}
              disabled={!passwordInput.trim()}
              className="magic-button w-full px-4 py-2 text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Valider
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

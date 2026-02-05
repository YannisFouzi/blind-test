"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";
  import {
    Check,
    Home as HomeIcon,
    LogOut,
    Pause,
    Play as PlayIcon,
    Volume2,
    VolumeX,
    X,
  } from "lucide-react";
import type { RoomPlayer } from "@/types";

import { useAudioPlayer, useDoubleAudioPlayer } from "@/features/audio-player";
import { DoubleWorkSelector, WorkSelector } from "@/features/game-ui/components";
import { PointsCelebration } from "@/features/game-ui/components/PointsCelebration";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { QuitRoomButton } from "@/components/ui/QuitRoomButton";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { cn } from "@/lib/utils";
import { pressable } from "@/styles/ui";
import { useMultiplayerGame } from "../hooks/useMultiplayerGame";
import { PlayersScoreboard } from "./PlayersScoreboard";

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

const PARTICLE_POSITIONS = [
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
] as const;

const START_MESSAGE_WINDOW_MS = 200;

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const getCountdownValue = (startAt: number) => {
  const remaining = startAt - Date.now();
  if (remaining <= 0) return null;
  if (remaining > 2000) return 3;
  if (remaining > 1000) return 2;
  return 1;
};

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
      setCountdown(getCountdownValue(startAt));
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [startAt]);

  const showStartMessage =
    startAt != null &&
    countdown === null &&
    Date.now() >= startAt - START_MESSAGE_WINDOW_MS;

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] flex flex-col items-center justify-center p-6">
      <div className="fixed top-3 left-2 sm:top-6 sm:left-6 z-50 flex flex-col items-start gap-2">
        {isHost && resetToWaiting && (
          <ConfirmActionButton
            buttonLabel="Accueil"
            title="Retour a la salle d'attente ?"
            message="Vous allez revenir a la salle d'attente. La partie restera configuree."
            confirmText="Oui, retour"
            cancelText="Annuler"
            onConfirm={() => void resetToWaiting()}
            variant="warning"
            className="magic-button home-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <HomeIcon className="text-base sm:text-lg" />
            <span className="home-button-label hidden sm:inline">Accueil</span>
          </ConfirmActionButton>
        )}
        <QuitRoomButton onConfirm={onLeave} title="Quitter la partie ?" />
      </div>

      <h1 className="text-2xl sm:text-3xl font-display font-bold text-[var(--color-text-primary)] mb-6 text-center">
        Demarrage de la partie...
      </h1>

      <p className="text-lg text-[var(--color-text-secondary)] mb-8">
        {readyCount} / {totalCount} joueurs prets
      </p>

      <ul className="space-y-2 w-full max-w-xs mb-10">
        {players.map((player) => {
          const isCurrentPlayer = player.id === playerId;
          const isReady = Boolean(player.ready);

          return (
            <li
              key={player.id}
              className={cn(
                "flex items-center justify-between gap-3 px-4 py-2 rounded-lg",
                "bg-[var(--color-surface-elevated)] border-2",
                isCurrentPlayer ? "border-[var(--color-accent)]" : "border-transparent"
              )}
            >
              <span className="font-medium text-[var(--color-text-primary)] truncate">
                {player.displayName}
                {isCurrentPlayer && (
                  <span className="ml-2 text-xs text-[var(--color-text-secondary)]">
                    (toi)
                  </span>
                )}
              </span>
              {isReady ? (
                <Check className="shrink-0 w-5 h-5 text-green-600" aria-hidden />
              ) : (
                <span className="text-sm text-[var(--color-text-secondary)]">
                  En attente...
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {countdown != null && (
        <div className="text-6xl sm:text-8xl font-display font-bold text-[var(--color-accent)] animate-pulse">
          {countdown}
        </div>
      )}
      {showStartMessage && (
        <p className="text-xl font-display font-bold text-[var(--color-accent)]">
          C&apos;est parti !
        </p>
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
  const [passwordInput, setPasswordInput] = useState("");

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
      currentRoundSongs = [],
      displayedRoundIndex,
      displayedRoundCount,
      doubleSelectedWorkSlot1,
    doubleSelectedWorkSlot2,
    handleDoubleSelection,
    clearDoubleSelectionForWork,
    sendPlayerReady,
    startAt,
    submitError,
    resetToWaiting,
    leaveRoom,
  } = game;

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

  const audioPlayRef = useRef(audioPlay);
  const doublePlayRef = useRef(doublePlay);
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

  const playerReadySentRef = useRef(false);
  useEffect(() => {
    if (state !== "starting" || !isConnected) return;
    if (playerReadySentRef.current) return;
    playerReadySentRef.current = true;
    sendPlayerReady?.();
  }, [state, isConnected, sendPlayerReady]);

  const audioUrlToUse = useMemo(() => {
    if (!currentSong) return null;
    if (isReverseMode && currentSong.audioUrlReversed) {
      return currentSong.audioUrlReversed;
    }
    return currentSong.audioUrl || null;
  }, [currentSong, isReverseMode]);

  const doubleUrls = useMemo(() => {
    if (!isDoubleMode || currentRoundSongs.length === 0) {
      return { primary: null as string | null, secondary: null as string | null };
    }
    const first = currentRoundSongs[0];
    const second = currentRoundSongs[1];
    return {
      primary: first?.audioUrl || null,
      secondary: second?.audioUrl || null,
    };
  }, [isDoubleMode, currentRoundSongs]);

  useEffect(() => {
    if (isDoubleMode) {
      audioReset();
      return;
    }

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

  useEffect(() => {
    if (!isDoubleMode) {
      doubleReset();
      return;
    }

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
  }, [
    isDoubleMode,
    doubleUrls,
    doubleLoadTracks,
    doubleReset,
    state,
    currentSongIndex,
    shouldAutoPlay,
  ]);

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

    return () => {};
  }, [startAt, isDoubleMode]);

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
      console.log("[AUDIO-DEBUG] Double timer: startAt already passed -> play now");
      doublePlayRef.current();
      return;
    }

    if (doubleAudioStartTimerRef.current) {
      clearTimeout(doubleAudioStartTimerRef.current);
      doubleAudioStartTimerRef.current = null;
    }

    const timerId = setTimeout(() => {
      doubleAudioStartTimerRef.current = null;
      console.log("[AUDIO-DEBUG] Double timer fired -> play()");
      doublePlayRef.current();
    }, delay);
    doubleAudioStartTimerRef.current = timerId;

    return () => {};
  }, [startAt, isDoubleMode]);

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
      const clamped = clampPercentage(value);
      if (isDoubleRound) {
        doubleSetVolume(clamped);
      } else {
        audioSetVolume(clamped);
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
      const newProgress = clampPercentage(percentage);
      if (isDoubleRound) {
        doubleSeek(newProgress);
      } else {
        audioSeek(newProgress);
      }
    },
    [audioSeek, doubleSeek, noSeek, isDoubleRound]
  );

  const handleVolumeBarClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = (clickX / rect.width) * 100;
      handleVolumeChange(percentage);
    },
    [handleVolumeChange]
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
    leaveRoom?.();
    router.push("/");
  }, [router, leaveRoom]);

  const playbackUnavailable = useMemo(() => {
    if (isDoubleRound) {
      return !doubleUrls.primary && !doubleUrls.secondary;
    }
    return !audioUrlToUse;
  }, [audioUrlToUse, doubleUrls, isDoubleRound]);

  const progress = useMemo(
    () =>
      effectiveDuration
        ? clampPercentage((effectiveCurrentTime / effectiveDuration) * 100)
        : 0,
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

  const isLastRound = useMemo(() => {
    if (displayedRoundCount <= 0) return false;
    return displayedRoundIndex >= displayedRoundCount;
  }, [displayedRoundIndex, displayedRoundCount]);

  const shouldShowScoresButton = useMemo(
    () =>
      isHost &&
      displayedRoundCount >= 1 &&
      isLastRound &&
      allPlayersAnswered,
    [isHost, displayedRoundCount, isLastRound, allPlayersAnswered]
  );

  const answerFooter = useMemo(() => {
    const primaryAction = shouldShowScoresButton ? (
      <button
        onClick={handleShowScores}
        className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
      >
        <span className="relative z-10 flex items-center gap-2">Voir les scores</span>
      </button>
    ) : canGoNext && isHost ? (
      <button
        onClick={handleNextSong}
        className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
      >
        <span className="relative z-10 flex items-center gap-2">Manche suivante</span>
      </button>
    ) : null;

    if (isDoubleMode && currentRoundSongs.length > 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 sm:gap-3">
          <div className="px-3 py-1.5 sm:px-5 sm:py-3 rounded-2xl bg-white border-[3px] border-[#1B1B1B] text-center shadow-[4px_4px_0_#1B1B1B] space-y-0.5 sm:space-y-1.5">
            {currentRoundSongs.map((song) => {
              const work = works.find((candidate) => candidate.id === song.workId);
              return (
                <p
                  key={song.id}
                  className="text-[0.65rem] sm:text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide leading-tight"
                >
                  {song.artist} &mdash; <span className="text-[#B45309]">{song.title}</span>
                  {work && (
                    <span className="ml-2 text-[0.65rem] sm:text-xs text-[var(--color-text-secondary)]">
                      ({work.title})
                    </span>
                  )}
                </p>
              );
            })}
          </div>
          {primaryAction}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center gap-2 sm:gap-3">
        {(currentSong?.artist ?? currentSong?.title) && (
          <div className="px-3 py-2 sm:px-5 sm:py-3 rounded-2xl bg-white border-[3px] border-[#1B1B1B] text-center shadow-[4px_4px_0_#1B1B1B]">
            <p className="text-[0.7rem] sm:text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide">
              {currentSong?.artist}{" "}
              {currentSong?.artist && currentSong?.title ? "&mdash; " : ""}
              <span className="text-[#B45309]">{currentSong?.title ?? ""}</span>
            </p>
          </div>
        )}
        {primaryAction}
      </div>
    );
  }, [
    shouldShowScoresButton,
    canGoNext,
    isHost,
    isDoubleMode,
    currentRoundSongs,
    works,
    currentSong,
    handleShowScores,
    handleNextSong,
  ]);

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

  if (state === "starting") {
    const readyCount = players.filter((player) => (player as PlayerWithReady).ready).length;
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
        resetToWaiting={resetToWaiting}
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
        {PARTICLE_POSITIONS.map((position) => (
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
            title="Retour a la salle d'attente ?"
            message="Vous allez revenir a la salle d'attente. La partie restera configuree."
            confirmText="Oui, retour"
            cancelText="Annuler"
            onConfirm={() => void resetToWaiting?.()}
            variant="warning"
            className="magic-button home-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <HomeIcon className="text-base sm:text-lg" />
            <span className="home-button-label hidden sm:inline">Accueil</span>
          </ConfirmActionButton>
        )}
        <QuitRoomButton onConfirm={handleLeaveRoom} title="Quitter la partie ?" />
      </div>

      <div className="fixed top-6 right-6 z-40 hidden lg:block">
        <PlayersScoreboard players={players} currentPlayerId={playerId} />
      </div>

      <div className="container mx-auto px-4 py-6 sm:py-8 player-safe-area relative z-10">
        <div className="lg:hidden flex justify-center mb-4 sm:mb-6">
          <PlayersScoreboard players={players} currentPlayerId={playerId} />
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:gap-4 min-h-[calc(100svh-180px)] sm:min-h-[calc(100svh-240px)] md:min-h-[calc(100svh-280px)]">
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
          {submitError && (
            <div className="px-4 py-2 rounded-xl bg-[#FFE5E5] border-2 border-[#1B1B1B] text-center text-xs text-red-700 shadow-[2px_2px_0_#1B1B1B]">
              {submitError}
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
          <div className="px-3 py-2 sm:px-6 sm:py-4">
            <div className="flex flex-col items-center gap-1.5 sm:gap-3">
              {/* MOBILE: Ligne fusionnée durées + boutons */}
              <div className="player-controls-compact w-full max-w-4xl">
                <div className="flex items-center justify-between w-full text-[var(--color-text-primary)] text-[0.7rem] font-semibold mb-1.5">
                  <span className="min-w-[2rem]">{formatTime(effectiveCurrentTime)}</span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePlayToggle}
                      disabled={playbackUnavailable}
                      className={cn(
                        "magic-button player-compact-button rounded-full p-2",
                        playbackUnavailable && "opacity-60 cursor-not-allowed"
                      )}
                    >
                      {effectiveIsPlaying ? (
                        <Pause className="w-3.5 h-3.5 text-[#1B1B1B]" />
                      ) : (
                        <PlayIcon className="w-3.5 h-3.5 text-[#1B1B1B]" />
                      )}
                    </button>

                  </div>

                  <span className="min-w-[2rem] text-right">{formatTime(effectiveDuration)}</span>
                </div>
              </div>

              {/* STANDARD: Layout original avec boutons séparés */}
              <div className="player-controls-standard items-center justify-center gap-4">
                <button
                  onClick={handlePlayToggle}
                  disabled={playbackUnavailable}
                  className={cn(
                    "magic-button rounded-full p-4",
                    playbackUnavailable && "opacity-60 cursor-not-allowed"
                  )}
                >
                  {effectiveIsPlaying ? (
                    <Pause className="w-5 h-5 text-[#1B1B1B]" />
                  ) : (
                    <PlayIcon className="w-5 h-5 text-[#1B1B1B]" />
                  )}
                </button>

              </div>

              <div className="w-full max-w-4xl flex flex-col items-center gap-1.5 sm:gap-3">
                {/* Durées (standard uniquement) */}
                <div className="player-durations-standard items-center justify-between w-full text-[var(--color-text-primary)] text-xs font-semibold">
                  <span>{formatTime(effectiveCurrentTime)}</span>
                  <div className="flex items-center gap-2">
                    {isReverseMode && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#f97316] px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide leading-none text-[#1B1B1B] border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] whitespace-nowrap">
                        <span className="inline-block rotate-180">
                          <PlayIcon className="w-3 h-3" />
                        </span>
                        <span>Reverse</span>
                      </span>
                    )}
                    {isDoubleMode && !isReverseMode && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#22c55e] px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide leading-none text-[#1B1B1B] border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] whitespace-nowrap">
                        <span>x2</span>
                        <span>Double</span>
                      </span>
                    )}
                  </div>
                  <span>{formatTime(effectiveDuration)}</span>
                </div>

                <div
                  className="w-full magic-progress-bar h-2 sm:h-3 cursor-pointer"
                  onClick={handleTimelineClick}
                >
                  <div className="magic-progress-fill h-full" style={{ width: `${progress}%` }} />
                </div>

                <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center text-xs sm:text-sm gap-2 sm:gap-3 pt-0.5 sm:pt-1">
                    <span className="text-[#B45309] font-semibold">
                      Manche {displayedRoundIndex} / {displayedRoundCount}
                    </span>

                    <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs">
                      <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#86efac] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        {currentPlayerScore.correct}
                      </span>
                      <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#fca5a5] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1">
                        <X className="w-3 h-3" />
                        {currentPlayerScore.incorrect}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 text-[var(--color-text-primary)] text-xs">
                      <div className="flex items-center gap-2 md:hidden">
                        {isReverseMode && (
                          <span className="player-reverse-compact px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#f97316] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1 text-xs whitespace-nowrap">
                            <span className="inline-block rotate-180">
                              <PlayIcon className="w-3 h-3" />
                            </span>
                            <span>Reverse</span>
                          </span>
                        )}
                        {isDoubleMode && !isReverseMode && (
                          <span className="player-x2-compact px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#22c55e] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1 text-xs whitespace-nowrap">
                            <span>x2</span>
                            <span>Double</span>
                          </span>
                        )}
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
                            onClick={handleVolumeBarClick}
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
            {authError && <div className="text-xs text-red-600 text-center">{authError}</div>}
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

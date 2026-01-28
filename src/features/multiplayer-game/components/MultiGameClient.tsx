"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Check,
  Home as HomeIcon,
  Pause,
  Play as PlayIcon,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { useMultiplayerGame } from "../hooks/useMultiplayerGame";
import { PlayersScoreboard } from "./PlayersScoreboard";
import { useAudioPlayer, useDoubleAudioPlayer } from "@/features/audio-player";
import { WorkSelector, DoubleWorkSelector } from "@/components/game";
import { PointsCelebration } from "@/components/game/PointsCelebration";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { cn } from "@/lib/utils";
import { pressable } from "@/styles/ui";

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

  const {
    isPlaying: audioIsPlaying,
    volume: audioVolume,
    currentTime: audioCurrentTime,
    duration: audioDuration,
    isMuted: audioIsMuted,
    error: audioError,
    togglePlay: audioTogglePlay,
    setVolume: audioSetVolume,
    toggleMute: audioToggleMute,
    seek: audioSeek,
    loadTrack: audioLoadTrack,
    preloadTrack: audioPreloadTrack,
    reset: audioReset,
  } = useAudioPlayer({
    noSeek,
    autoPlay: true,
  });

  const {
    isPlaying: doubleIsPlaying,
    volume: doubleVolume,
    currentTime: doubleCurrentTime,
    duration: doubleDuration,
    isMuted: doubleIsMuted,
    error: doubleError,
    togglePlay: doubleTogglePlay,
    setVolume: doubleSetVolume,
    toggleMute: doubleToggleMute,
    seek: doubleSeek,
    loadTracks: doubleLoadTracks,
    reset: doubleReset,
  } = useDoubleAudioPlayer({
    noSeek,
    autoPlay: true,
  });

  // Callback stable pour cleanup audio avant redirection
  const handleRedirect = useCallback(() => {
    // Cleanup audio avant redirection vers waiting room
    audioReset();
    doubleReset();
  }, [audioReset, doubleReset]);

  const game = useMultiplayerGame({
    universeId,
    roomId,
    playerId,
    displayName,
    preloadNextTrack: (song) => {
      if (song.audioUrl) {
        audioPreloadTrack(song.audioUrl);
      }
    },
    onRedirect: handleRedirect,
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
    allowedWorks,
    isLoadingWorks,
    isReverseMode,
    isDoubleMode,
    currentRoundSongs,
    displayedSongIndex,
    displayedTotalSongs,
    doubleSelectedWorkSlot1,
    doubleSelectedWorkSlot2,
    handleDoubleSelection,
    clearDoubleSelectionForWork,
  } = game;

  useEffect(() => {
    if (authRequired) {
      setPasswordInput("");
    }
  }, [authRequired]);

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

  useEffect(() => {
    // En mode double, on reset l'audio simple et on laisse le hook dédié gérer le chargement
    if (isDoubleMode) {
      audioReset();
      return;
    }

    if (audioUrlToUse) {
      void audioLoadTrack(audioUrlToUse);
    } else {
      audioReset();
    }
  }, [audioUrlToUse, audioLoadTrack, audioReset, isDoubleMode]);

  // Chargement des deux pistes en mode double
  useEffect(() => {
    if (!isDoubleMode) {
      doubleReset();
      return;
    }

    const { primary, secondary } = doubleUrls;

    if (!primary && !secondary) {
      doubleReset();
      return;
    }

    void doubleLoadTracks(primary, secondary);
  }, [isDoubleMode, doubleUrls, doubleLoadTracks, doubleReset]);

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

  const handleGoHome = useCallback(() => {
    // Si c'est l'hôte : reset la room et retourner au lobby (sans quitter la room)
    // Si c'est un invité : quitter la room et retourner à l'accueil
    if (game.isHost && game.resetToWaiting) {
      void game.resetToWaiting();
    } else {
      router.push("/");
    }
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

  // Vérifier si on est au dernier morceau (basé sur displayedSongIndex)
  const isLastSong = useMemo(
    () => displayedSongIndex >= displayedTotalSongs,
    [displayedSongIndex, displayedTotalSongs]
  );

  // Déterminer si on doit afficher "Voir les scores" ou "Morceau suivant"
  const shouldShowScoresButton = useMemo(
    () => isHost && isLastSong && allPlayersAnswered && showAnswer,
    [isHost, isLastSong, allPlayersAnswered, showAnswer]
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

    // Mode normal/reverse
    if (game.currentSongAnswer && currentSong?.artist && currentSong?.title) {
      return (
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="px-5 py-3 rounded-2xl bg-white border-[3px] border-[#1B1B1B] text-center shadow-[4px_4px_0_#1B1B1B]">
            <p className="text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide">
              {currentSong.artist} &mdash;{" "}
              <span className="text-[#B45309]">{currentSong.title}</span>
            </p>
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

    return null;
  }, [showAnswer, isDoubleMode, currentRoundSongs, works, shouldShowScoresButton, canGoNext, isHost, handleShowScores, handleNextSong, game.currentSongAnswer, currentSong]);

  // Log render state pour debug
  useEffect(() => {
    console.log("[MultiGameClient] 🎨 RENDER STATE", {
      isConnected,
      hasCurrentSong: !!currentSong,
      currentSongId: currentSong?.id,
      worksCount: works.length,
      isLoadingWorks,
      state,
      roomSongsCount: room?.songs?.length ?? 0,
      allowedWorksCount: allowedWorks?.length ?? 0,
      timestamp: Date.now(),
    });
  }, [isConnected, currentSong, works.length, isLoadingWorks, state, room?.songs?.length, allowedWorks?.length]);

  if (!isConnected) {
    console.log("[MultiGameClient] ⚠️ RENDERING: Connexion au serveur...");
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

  if (!currentSong) {
    console.log("[MultiGameClient] ⚠️ RENDERING: En attente de la playlist...", {
      roomSongsCount: room?.songs?.length ?? 0,
      state,
      isHost: playerId === room?.hostId,
    });
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
    console.log("[MultiGameClient] ⚠️ RENDERING: Aucune oeuvre trouvée", {
      isLoadingWorks,
      filteredWorksCount: works.length,
      allowedWorks: allowedWorks?.length ?? 0,
    });
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage message="Aucune oeuvre trouvee pour cet univers" />
          <button onClick={handleGoHome} className="magic-button mt-6 px-6 py-3">
            <HomeIcon className="inline mr-2" />
            Retour a l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  // Si les works sont en cours de chargement, afficher un loader
  if (isLoadingWorks) {
    console.log("[MultiGameClient] ⚠️ RENDERING: Chargement des oeuvres...", {
      isLoadingWorks,
      hasCurrentSong: !!currentSong,
    });
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

  console.log("[MultiGameClient] ✅ RENDERING: Game UI", {
    currentSongId: currentSong?.id,
    worksCount: works.length,
    state,
  });

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

      <div className="fixed top-3 left-2 sm:top-6 sm:left-6 z-50">
        <button
          onClick={handleGoHome}
          className="magic-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
        >
          <HomeIcon className="text-base sm:text-lg" />
          <span className="hidden sm:inline">Accueil</span>
        </button>
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
                    Morceau {displayedSongIndex} / {displayedTotalSongs}
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

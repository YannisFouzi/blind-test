"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, type MouseEvent } from "react";
import {
  Check,
  Home as HomeIcon,
  Pause,
  Play as PlayIcon,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { useSoloGame } from "../hooks/useSoloGame";
import type { MysteryEffectsConfig } from "@/types";
import { useAudioPlayer, useDoubleAudioPlayer } from "@/features/audio-player";
import { WorkSelector, DoubleWorkSelector } from "@/components/game";
import { PointsCelebration } from "@/components/game/PointsCelebration";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { cn } from "@/lib/utils";
import { pressable } from "@/styles/ui";

export interface SoloGameClientProps {
  universeId: string;
  allowedWorks?: string[];
  maxSongs?: number;
  noSeek?: boolean;
  mysteryEffectsConfig?: MysteryEffectsConfig;
}

export const SoloGameClient = ({
  universeId,
  allowedWorks,
  maxSongs,
  worksPerRound,
  noSeek = false,
  mysteryEffectsConfig,
}: SoloGameClientProps) => {
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

  const game = useSoloGame({
    universeId,
    allowedWorks,
    maxSongs,
    worksPerRound,
    preloadNextTrack: (song) => {
      // Précharger l'URL normale (le reverse sera chargé à la volée si nécessaire)
      if (song.audioUrl) {
        audioPreloadTrack(song.audioUrl);
      }
    },
    mysteryEffectsConfig,
  });

  const {
    works,
    currentSong,
    selectedWork,
    showAnswer,
    gameState,
    canGoNext,
    isCurrentSongAnswered,
    handleAnswer,
    validateAnswer,
    nextSong,
    prevSong,
    displayedSongIndex,
    displayedTotalSongs,
    score,
    isReverseMode,
    isDoubleMode,
    currentRoundSongs,
    doubleSelectedWorkSlot1,
    doubleSelectedWorkSlot2,
    handleDoubleSelection,
    clearDoubleSelectionForWork,
  } = game;

  // Vérifier si on est au dernier morceau
  const isLastSong = useMemo(
    () => displayedSongIndex >= displayedTotalSongs,
    [displayedSongIndex, displayedTotalSongs]
  );

  // Déterminer si on doit afficher "Voir les scores" ou "Morceau suivant"
  const shouldShowScoresButton = useMemo(
    () => isLastSong && isCurrentSongAnswered && showAnswer,
    [isLastSong, isCurrentSongAnswered, showAnswer]
  );

  const handleShowScores = useCallback(() => {
    const params = new URLSearchParams({
      correct: String(score.correct),
      incorrect: String(score.incorrect),
    });
    router.push(`/scores/solo?${params.toString()}`);
  }, [score, router]);

  const answerFooter =
    showAnswer && (isDoubleMode ? currentRoundSongs.length > 0 : !!game.currentSong) ? (
      <div className="flex flex-col items-center justify-center gap-3">
        <div className="px-5 py-3 rounded-2xl bg-white border-[3px] border-[#1B1B1B] text-center shadow-[4px_4px_0_#1B1B1B] space-y-1.5">
          {isDoubleMode ? (
            currentRoundSongs.map((song) => {
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
            })
          ) : (
            game.currentSong && (
              <p className="text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide">
                {game.currentSong.artist} &mdash;{" "}
                <span className="text-[#B45309]">{game.currentSong.title}</span>
              </p>
            )
          )}
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
          canGoNext && (
            <button
              onClick={nextSong}
              className="magic-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold"
            >
              <span className="relative z-10 flex items-center gap-2">
                Morceau suivant
              </span>
            </button>
          )
        )}
      </div>
    ) : null;

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

  const handleDoubleWorkSelection = useCallback(
    (slotIndex: 0 | 1, workId: string) => {
      handleDoubleSelection(slotIndex, workId);
    },
    [handleDoubleSelection]
  );

  const handleClearWorkSelection = useCallback(
    (workId: string) => {
      clearDoubleSelectionForWork(workId);
    },
    [clearDoubleSelectionForWork]
  );

  const handleValidateAnswer = useCallback(() => {
    validateAnswer();
  }, [validateAnswer]);

  const handleNextSong = useCallback(() => {
    nextSong();
  }, [nextSong]);

  const handlePrevSong = useCallback(() => {
    prevSong();
  }, [prevSong]);

  const handleGoHome = useCallback(() => {
    router.push("/");
  }, [router]);

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

  if (game.error) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage message={game.error} />
          <ConfirmActionButton
            buttonLabel="Retour à l'accueil"
            title="Retour à l'accueil ?"
            message="Vous allez quitter la partie et retourner à l'accueil."
            confirmText="Oui, retour"
            cancelText="Annuler"
            onConfirm={handleGoHome}
            variant="warning"
            className="magic-button mt-6 px-6 py-3 flex items-center gap-2"
          >
            <HomeIcon className="inline h-5 w-5" />
            Retour à l&apos;accueil
          </ConfirmActionButton>
        </div>
      </div>
    );
  }

  if (!game.loading && game.works.length === 0) {
    if (process.env.NODE_ENV === "development") {
      console.error("[SOLO-GAME] Affichage erreur « Aucune oeuvre »", {
        universeId,
        allowedWorksCount: allowedWorks?.length ?? 0,
        error: game.error,
      });
    }
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage
            message={
              game.error ||
              (universeId === "__custom__" || universeId === "__random__"
                ? "Aucune œuvre (mode custom/aléatoire). Passe des œuvres dans l'URL : ?works=id1,id2,..."
                : "Aucune oeuvre trouvee pour cet univers")
            }
          />
          <ConfirmActionButton
            buttonLabel="Retour à l'accueil"
            title="Retour à l'accueil ?"
            message="Vous allez quitter la partie et retourner à l'accueil."
            confirmText="Oui, retour"
            cancelText="Annuler"
            onConfirm={handleGoHome}
            variant="warning"
            className="magic-button mt-6 px-6 py-3 flex items-center gap-2"
          >
            <HomeIcon className="inline h-5 w-5" />
            Retour à l&apos;accueil
          </ConfirmActionButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] relative overflow-hidden">
      <PointsCelebration points={game.lastGain?.points ?? null} triggerKey={game.lastGain?.key} />

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
        <ConfirmActionButton
          buttonLabel="Accueil"
          title="Retour à l'accueil ?"
          message="Vous allez quitter la partie et retourner à l'accueil."
          confirmText="Oui, retour"
          cancelText="Annuler"
          onConfirm={handleGoHome}
          variant="warning"
          className="magic-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
        >
          <HomeIcon className="text-base sm:text-lg" />
          <span className="hidden sm:inline">Accueil</span>
        </ConfirmActionButton>
      </div>

      <div className="container mx-auto px-4 py-8 pb-24 relative z-10">
        <div className="flex flex-col items-center justify-center gap-4 min-h-[calc(100svh-220px)] sm:min-h-[calc(100svh-240px)] md:min-h-[calc(100svh-280px)]">
          <div className="w-full flex justify-center">
            {game.loading ? null : isDoubleMode && currentRoundSongs.length >= 1 ? (
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
                  gameState === "playing"
                }
                isCurrentSongAnswered={isCurrentSongAnswered}
                onSelectSlotWork={handleDoubleWorkSelection}
                onValidateAnswer={handleValidateAnswer}
                onClearWorkSelection={handleClearWorkSelection}
                footer={answerFooter}
              />
            ) : (
              <WorkSelector
                works={works}
                currentSongWorkId={currentSong?.workId}
                selectedWork={selectedWork}
                showAnswer={showAnswer}
                canValidate={!!selectedWork && !showAnswer && gameState === "playing"}
                isCurrentSongAnswered={isCurrentSongAnswered}
                onWorkSelection={handleWorkSelection}
                onValidateAnswer={handleValidateAnswer}
                footer={answerFooter}
              />
            )}
          </div>
        </div>
      </div>

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FDE68A]/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#BFDBFE]/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FBCFE8]/40 rounded-full blur-3xl" />
      </div>

      {!game.loading && (
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="player-dome mx-auto w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-6xl bg-white border-[3px] border-b-0 border-[#1B1B1B] shadow-[0_-6px_0_#1B1B1B] pointer-events-auto overflow-hidden">
          <div className="px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-col items-center gap-2 sm:gap-3">
              <div className="flex items-center justify-center gap-4 sm:gap-5">
                <button
                  onClick={handlePrevSong}
                  disabled={!game.canGoPrev}
                  className={cn(
                    "magic-button p-2 rounded-full bg-white hover:bg-[var(--color-surface-overlay)]",
                    !game.canGoPrev && "opacity-60"
                  )}
                >
                  <SkipBack className="w-4 h-4" />
                </button>

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
                    Morceau {game.displayedSongIndex} / {game.displayedTotalSongs}
                  </span>

                  <div className="flex items-center justify-center gap-3 text-xs">
                    <span className="px-3 py-1 rounded-full bg-[#86efac] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      {game.score.correct}
                    </span>
                    <span className="px-3 py-1 rounded-full bg-[#fca5a5] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1">
                      <X className="w-3 h-3" />
                      {game.score.incorrect}
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
      )}

      {!game.loading && effectiveError && (
        <div className="mt-4 text-center text-sm text-red-600">{effectiveError}</div>
      )}

      {!game.loading && playbackUnavailable && (
        <div className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          Aucun extrait audio n&apos;est disponible pour ce morceau.
        </div>
      )}
    </div>
  );
};

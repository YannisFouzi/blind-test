"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, type MouseEvent } from "react";
import { Home as HomeIcon } from "lucide-react";

import type { MysteryEffectsConfig } from "@/types";
import { useAudioPlayer, useDoubleAudioPlayer } from "@/features/audio-player";
import { DoubleWorkSelector, PlayerDome, WorkSelector } from "@/features/game-ui/components";
import { PointsCelebration } from "@/features/game-ui/components/PointsCelebration";
import { GameLayout, GameStage } from "@/features/game-ui/layout";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { cn } from "@/lib/utils";
import chromeStyles from "@/styles/gameChrome.module.css";
import { useSoloGame } from "../hooks/useSoloGame";

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export interface SoloGameClientProps {
  universeId: string;
  allowedWorks?: string[];
  maxSongs?: number;
  worksPerRound?: number;
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
    canGoPrev,
    isCurrentSongAnswered,
    handleAnswer,
    validateAnswer,
    nextSong,
    prevSong,
    displayedRoundIndex,
    displayedRoundCount,
    score,
    isReverseMode,
    isDoubleMode,
    currentRoundSongs = [],
    doubleSelectedWorkSlot1,
    doubleSelectedWorkSlot2,
    handleDoubleSelection,
    clearDoubleSelectionForWork,
    loading,
    error,
    lastGain,
  } = game;

  const isLastRound = displayedRoundCount > 0 && displayedRoundIndex >= displayedRoundCount;
  const shouldShowScoresButton = isLastRound && isCurrentSongAnswered;
  const isDenseActionLayout = works.length >= 7;

  const handleShowScores = useCallback(() => {
    const params = new URLSearchParams({
      correct: String(score.correct),
      incorrect: String(score.incorrect),
    });
    router.push(`/scores/solo?${params.toString()}`);
  }, [score.correct, score.incorrect, router]);

  const answerFooter = useMemo(() => {
    if (isDoubleMode ? currentRoundSongs.length === 0 : !currentSong) return null;

    const primaryAction = shouldShowScoresButton ? (
      <button
        onClick={handleShowScores}
        className={cn(
          "magic-button game-action-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold",
          isDenseActionLayout && "game-action-button--dense"
        )}
      >
        <span className="relative z-10 flex items-center gap-2">Voir les scores</span>
      </button>
    ) : canGoNext ? (
      <button
        onClick={nextSong}
        className={cn(
          "magic-button game-action-button px-6 py-3 sm:px-8 sm:py-4 text-sm sm:text-base font-bold",
          isDenseActionLayout && "game-action-button--dense"
        )}
      >
        <span className="relative z-10 flex items-center gap-2">Manche suivante</span>
      </button>
    ) : null;

    return (
      <div className="flex flex-col items-center justify-center gap-2 sm:gap-3">
        <div className="px-3 py-1.5 sm:px-5 sm:py-3 rounded-2xl bg-white border-[3px] border-[#1B1B1B] text-center shadow-[4px_4px_0_#1B1B1B] space-y-0.5 sm:space-y-1.5">
          {isDoubleMode
            ? currentRoundSongs.map((song) => {
                const work = works.find((candidate) => candidate.id === song.workId);
                return (
                  <p
                    key={song.id}
                    className="text-[0.65rem] sm:text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide leading-tight"
                  >
                    {song.artist}
                    {" \u2014 "}
                    <span className="text-[#B45309]">{song.title}</span>
                    {work && (
                      <span className="ml-2 text-[0.65rem] sm:text-xs text-[var(--color-text-secondary)]">
                        ({work.title})
                      </span>
                    )}
                  </p>
                );
              })
            : currentSong && (
                <p className="text-[0.7rem] sm:text-sm md:text-base text-[var(--color-text-primary)] font-semibold tracking-wide">
                  {currentSong.artist}
                  {" \u2014 "}
                  <span className="text-[#B45309]">{currentSong.title}</span>
                </p>
              )}
        </div>
        {primaryAction}
      </div>
    );
  }, [
    isDoubleMode,
    currentRoundSongs,
    currentSong,
    works,
    shouldShowScoresButton,
    isDenseActionLayout,
    handleShowScores,
    canGoNext,
    nextSong,
  ]);

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

    if (audioUrlToUse) {
      void audioLoadTrack(audioUrlToUse);
    } else {
      audioReset();
    }
  }, [audioUrlToUse, audioLoadTrack, audioReset, isDoubleMode]);

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

  const centerContent = (
    <div className="w-full flex justify-center">
      {loading ? null : isDoubleMode && currentRoundSongs.length >= 1 ? (
        <DoubleWorkSelector
          mode="solo"
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
          mode="solo"
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
  );

  const topButtons = (
    <ConfirmActionButton
      buttonLabel="Accueil"
      title="Retour a l'accueil ?"
      message="Vous allez quitter la partie et retourner a l'accueil."
      confirmText="Oui, retour"
      cancelText="Annuler"
      onConfirm={handleGoHome}
      variant="warning"
      className={cn("magic-button flex items-center", chromeStyles.homeButton)}
    >
      <HomeIcon className="text-base sm:text-lg" />
      <span className={chromeStyles.homeButtonLabel}>Accueil</span>
    </ConfirmActionButton>
  );

  const playerDome = (
    <PlayerDome
      currentTimeLabel={formatTime(effectiveCurrentTime)}
      durationLabel={formatTime(effectiveDuration)}
      isPlaying={effectiveIsPlaying}
      playbackUnavailable={playbackUnavailable}
      onTogglePlay={handlePlayToggle}
      canGoPrev={canGoPrev}
      onPrev={handlePrevSong}
      canGoNext={canGoNext}
      onNext={handleNextSong}
      isReverseMode={isReverseMode}
      isDoubleMode={isDoubleMode}
      progress={progress}
      onTimelineClick={handleTimelineClick}
      roundLabel={`Manche ${displayedRoundIndex} / ${displayedRoundCount}`}
      correctCount={score.correct}
      incorrectCount={score.incorrect}
      isMuted={effectiveIsMuted}
      onToggleMute={isDoubleRound ? doubleToggleMute : audioToggleMute}
      volume={effectiveVolume}
      onVolumeBarClick={handleVolumeBarClick}
    />
  );

  if (error) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage message={error} />
          <ConfirmActionButton
            buttonLabel="Retour a l'accueil"
            title="Retour a l'accueil ?"
            message="Vous allez quitter la partie et retourner a l'accueil."
            confirmText="Oui, retour"
            cancelText="Annuler"
            onConfirm={handleGoHome}
            variant="warning"
            className="magic-button mt-6 px-6 py-3 flex items-center gap-2"
          >
            <HomeIcon className="inline h-5 w-5" />
            Retour a l&apos;accueil
          </ConfirmActionButton>
        </div>
      </div>
    );
  }

  if (!loading && works.length === 0) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage
            message={
              error ||
              (universeId === "__custom__" || universeId === "__random__"
                ? "Aucune oeuvre (mode custom/aleatoire). Passe des oeuvres dans l'URL : ?works=id1,id2,..."
                : "Aucune oeuvre trouvee pour cet univers")
            }
          />
          <ConfirmActionButton
            buttonLabel="Retour a l'accueil"
            title="Retour a l'accueil ?"
            message="Vous allez quitter la partie et retourner a l'accueil."
            confirmText="Oui, retour"
            cancelText="Annuler"
            onConfirm={handleGoHome}
            variant="warning"
            className="magic-button mt-6 px-6 py-3 flex items-center gap-2"
          >
            <HomeIcon className="inline h-5 w-5" />
            Retour a l&apos;accueil
          </ConfirmActionButton>
        </div>
      </div>
    );
  }


  return (
    <GameStage>
      <PointsCelebration points={lastGain?.points ?? null} triggerKey={lastGain?.key} />

      <GameLayout
        mode="solo"
        cardCount={works.length}
        topButtons={topButtons}
        center={centerContent}
      />

      {!loading && playerDome}

      {!loading && effectiveError && (
        <div className="mt-4 text-center text-sm text-red-600">{effectiveError}</div>
      )}

      {!loading && playbackUnavailable && (
        <div className="mt-4 text-center text-sm text-[var(--color-text-secondary)]">
          Aucun extrait audio n&apos;est disponible pour ce morceau.
        </div>
      )}
    </GameStage>
  );
};


"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, type MouseEvent } from "react";
import { Home as HomeIcon, Pause, Play as PlayIcon, SkipBack, SkipForward, Volume2, VolumeX } from "lucide-react";

import { useSoloGame } from "../hooks/useSoloGame";
import { useAudioPlayer } from "@/features/audio-player";
import { WorkSelector } from "@/components/game/WorkSelector";
import { PointsCelebration } from "@/components/game/PointsCelebration";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

/**
 * Props du SoloGameClient
 */
export interface SoloGameClientProps {
  /** ID de l'univers (ex: "disney", "90s") ou "__custom__" */
  universeId: string;

  /** Liste des œuvres autorisées (pour mode custom) */
  allowedWorks?: string[];

  /** Nombre maximum de chansons */
  maxSongs?: number;

  /** Désactiver le seek dans l'audio */
  noSeek?: boolean;
}

/**
 * SoloGameClient
 *
 * Composant principal du mode solo.
 * Gère l'affichage du jeu + l'audio player + la navigation.
 *
 * @example
 * ```tsx
 * <SoloGameClient
 *   universeId="disney"
 *   maxSongs={10}
 *   noSeek={false}
 * />
 * ```
 */
export const SoloGameClient = ({ universeId, allowedWorks, maxSongs, noSeek = false }: SoloGameClientProps) => {
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

  // Audio player
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

  // Jeu solo
  const game = useSoloGame({
    universeId,
    allowedWorks,
    maxSongs,
    preloadNextTrack: (song) => {
      if (song.audioUrl) {
        audioPreloadTrack(song.audioUrl);
      }
    },
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
  } = game;

  // Charger l'audio quand la chanson change
  useEffect(() => {
    if (currentSong?.audioUrl) {
      void audioLoadTrack(currentSong.audioUrl);
    } else {
      audioReset();
    }
  }, [currentSong?.audioUrl, audioLoadTrack, audioReset]);

  // Handlers
  const handlePlayToggle = useCallback(() => {
    if (!currentSong?.audioUrl) return;
    audioTogglePlay();
  }, [currentSong?.audioUrl, audioTogglePlay]);

  const handleVolumeChange = useCallback(
    (value: number) => {
      audioSetVolume(value);
    },
    [audioSetVolume]
  );

  const handleTimelineClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    if (noSeek) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const newProgress = Math.max(0, Math.min(100, percentage));
    audioSeek(newProgress);
  }, [audioSeek, noSeek]);

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

  const playbackUnavailable = !currentSong?.audioUrl;
  const progress = useMemo(
    () => (audioDuration ? (audioCurrentTime / audioDuration) * 100 : 0),
    [audioDuration, audioCurrentTime]
  );

  // ========================================
  // LOADING
  // ========================================
  if (game.loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-white mt-4 font-medium">Chargement de l&apos;univers magique...</p>
        </div>
      </div>
    );
  }

  // ========================================
  // ERROR
  // ========================================
  if (game.error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage message={game.error} />
          <button onClick={handleGoHome} className="magic-button mt-6 px-6 py-3">
            <HomeIcon className="inline mr-2" />
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // NO WORKS
  // ========================================
  if (game.works.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage message="Aucune œuvre trouvée pour cet univers" />
          <button onClick={handleGoHome} className="magic-button mt-6 px-6 py-3">
            <HomeIcon className="inline mr-2" />
            Retour à l&apos;accueil
          </button>
        </div>
      </div>
    );
  }

  // ========================================
  // MAIN UI
  // ========================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Points celebration */}
      <PointsCelebration points={game.lastGain?.points ?? null} triggerKey={game.lastGain?.key} />

      {/* Particules */}
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

      {/* Effet de brume */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 via-transparent to-blue-800/20 pointer-events-none" />

      {/* Navigation - Bouton Home */}
      <div className="fixed top-6 left-6 z-50">
        <button onClick={handleGoHome} className="magic-button px-6 py-3 flex items-center gap-2 text-white font-semibold">
          <HomeIcon className="text-lg" />
          <span className="hidden sm:inline">Accueil</span>
        </button>
      </div>

      {/* Conteneur principal */}
      <div className="container mx-auto px-4 py-8 pb-24 relative z-10">
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto justify-items-center">
          <div className="xl:col-span-2 w-full flex justify-center">
            <WorkSelector
              works={works}
              currentSongWorkId={currentSong?.workId}
              selectedWork={selectedWork}
              showAnswer={showAnswer}
              canValidate={!!selectedWork && !showAnswer && gameState === "playing"}
              canGoNext={canGoNext}
              isCurrentSongAnswered={isCurrentSongAnswered}
              onWorkSelection={handleWorkSelection}
              onValidateAnswer={handleValidateAnswer}
              onNextSong={handleNextSong}
            />
          </div>
        </div>

        {/* Détails du morceau une fois la réponse validée */}
        {game.showAnswer && game.currentSongAnswer && game.currentSong?.artist && game.currentSong?.title && (
          <div className="flex justify-center mt-6">
            <div className="px-5 py-3 rounded-2xl bg-slate-900/80 border border-purple-500/40 text-center shadow-lg backdrop-blur">
              <p className="text-sm md:text-base text-white font-semibold tracking-wide">
                {game.currentSong.artist} &mdash; <span className="text-yellow-300">{game.currentSong.title}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Effets de lumière */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      {/* Barre de lecteur */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-purple-500/30 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-4">
            {/* Boutons de contrôle */}
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={handlePrevSong}
                disabled={!game.canGoPrev}
                className={`p-2 rounded-full transition-all duration-300 ${
                  game.canGoPrev
                    ? "bg-slate-800/70 hover:bg-slate-700 text-white shadow-md hover:shadow-purple-500/30 hover:scale-105"
                    : "bg-slate-800/40 text-gray-500 cursor-not-allowed"
                }`}
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <div className="relative">
                <button
                  onClick={handlePlayToggle}
                  disabled={playbackUnavailable}
                  className={`relative p-4 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 rounded-full text-white shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 transform hover:scale-105 ${
                    playbackUnavailable ? "opacity-60 cursor-not-allowed" : ""
                  }`}
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 blur-md opacity-50" />
                  <div className="relative z-10">
                    {audioIsPlaying ? <Pause className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                  </div>
                </button>
              </div>

              <button
                onClick={handleNextSong}
                disabled={!game.canGoNext}
                className={`p-2 rounded-full transition-all duration-300 ${
                  game.canGoNext
                    ? "bg-slate-800/70 hover:bg-slate-700 text-white shadow-md hover:shadow-blue-500/30 hover:scale-105"
                    : "bg-slate-800/40 text-gray-500 cursor-not-allowed"
                }`}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Barre de progression + infos */}
            <div className="w-full max-w-4xl flex flex-col items-center gap-3">
              {/* Temps */}
              <div className="flex items-center justify-between w-full text-white text-xs">
                <span>{formatTime(audioCurrentTime)}</span>
                <span>{formatTime(audioDuration)}</span>
              </div>

              {/* Barre de progression */}
              <div className="w-full magic-progress-bar h-2 cursor-pointer hover:h-3 transition-all duration-300" onClick={handleTimelineClick}>
                <div className="magic-progress-fill h-full" style={{ width: `${progress}%` }} />
              </div>

              {/* Score + Volume */}
              <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center text-sm gap-3 pt-1">
                {/* Progression */}
                <span className="text-yellow-400 font-semibold">
                  Morceau {game.currentSongIndex + 1} / {game.totalSongs}
                </span>

                {/* Score */}
                <div className="flex items-center justify-center gap-3 text-xs text-white">
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-200 font-semibold">+ {game.score.correct}</span>
                  <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 font-semibold">- {game.score.incorrect}</span>
                </div>

                {/* Volume */}
                <div className="hidden md:flex items-center justify-end gap-3 text-white text-xs">
                  <button
                    onClick={audioToggleMute}
                    className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/60 transition-all duration-300 hover:scale-105"
                  >
                    {audioIsMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-28 magic-progress-bar h-2 cursor-pointer hover:h-3 transition-all duration-300"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = (clickX / rect.width) * 100;
                        const newVolume = Math.max(0, Math.min(100, percentage));
                        handleVolumeChange(newVolume);
                      }}
                    >
                      <div className="magic-progress-fill h-full" style={{ width: `${audioVolume}%` }} />
                    </div>
                    <span className="text-white text-xs w-10 text-center">{Math.round(audioVolume)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Erreur audio */}
      {audioError && (
        <div className="mt-4 text-center text-sm text-yellow-300">
          {audioError}
        </div>
      )}

      {/* Pas d'audio disponible */}
      {playbackUnavailable && (
        <div className="mt-4 text-center text-sm text-yellow-300">
          Aucun extrait audio n&apos;est disponible pour ce morceau.
        </div>
      )}
    </div>
  );
};

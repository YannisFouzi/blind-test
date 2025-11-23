"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import {
  Home as HomeIcon,
  Pause,
  Play as PlayIcon,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Song } from "@/types";

import { WorkSelector } from "@/components/game/WorkSelector";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useGame } from "@/hooks/useGame";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";

interface GameClientProps {
  universeId: string;
}

export function GameClient({ universeId }: GameClientProps) {
  const router = useRouter();

  const {
    isPlaying: audioIsPlaying,
    volume: audioVolume,
    currentTime: audioCurrentTime,
    duration: audioDuration,
    isMuted: audioIsMuted,
    audioError,
    handlePlayPause: handleAudioPlayPause,
    handleVolumeChange: handleAudioVolumeChange,
    toggleMute: toggleAudioMute,
    handleProgressClick: handleAudioProgressClick,
    resetPlayer: resetAudioPlayer,
    preloadTrack,
    prepareTrack,
    formatTime: formatAudioTime,
  } = useAudioPlayer();

  const preloadNextMedia = useCallback(
    (song: Song) => {
      if (song.audioUrl) {
        preloadTrack(song.audioUrl);
      }
    },
    [preloadTrack]
  );

  const {
    gameSession,
    works,
    currentSong,
    selectedWork,
    showAnswer,
    handleWorkSelection,
    handleValidateAnswer,
    handleNextSong,
    handlePrevSong,
    canGoNext,
    canGoPrev,
    isCurrentSongAnswered,
    currentSongAnswer,
  } = useGame(universeId, preloadNextMedia);

  const playbackIsPlaying = audioIsPlaying;
  const playbackCurrentTime = audioCurrentTime;
  const playbackDuration = audioDuration;
  const playbackVolume = audioVolume;
  const playbackMuted = audioIsMuted;
  const playerError = audioError;
  const formatTimeFn = formatAudioTime;
  const playbackUnavailable = !currentSong?.audioUrl;

  useEffect(() => {
    if (currentSong?.audioUrl) {
      void prepareTrack(currentSong.audioUrl);
    } else {
      resetAudioPlayer();
    }
  }, [currentSong?.audioUrl, prepareTrack, resetAudioPlayer]);

  const handlePlayToggle = () => {
    if (playbackUnavailable) {
      return;
    }

    if (currentSong?.audioUrl) {
      handleAudioPlayPause(currentSong.audioUrl);
    }
  };

  const handleVolumeChangeValue = (value: number) => {
    handleAudioVolumeChange(value);
  };

  const handleMuteToggle = () => {
    toggleAudioMute();
  };

  const handleTimelineClick = (event: MouseEvent<HTMLDivElement>) => {
    handleAudioProgressClick(event);
  };

  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    // Animation d'entrée
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const handleNextSongWithReset = () => {
    handleNextSong();
  };

  const handlePrevSongWithReset = () => {
    handlePrevSong();
  };

  const handleWorkSelectionWithSound = (workId: string) => {
    handleWorkSelection(workId);
  };

  const handleValidateAnswerWithSound = () => {
    handleValidateAnswer();
  };

  if (!gameSession || !currentSong) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-white mt-4 font-medium">
            Chargement de l&apos;univers magique...
          </p>
        </div>
      </div>
    );
  }

  if (works.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage message="Aucune œuvre trouvée pour cet univers" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Particules flottantes d'arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[
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
        ].map((position, i) => (
          <div
            key={i}
            className="particle"
            style={{
              top: `${position.top}%`,
              left: `${position.left}%`,
            }}
          />
        ))}
      </div>

      {/* Effet de brume magique */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 via-transparent to-blue-800/20 pointer-events-none" />

      {/* Navigation */}
      <div
        className={`fixed top-6 left-6 z-50 ${
          isLoaded ? "slide-in-left" : "opacity-0"
        }`}
      >
        <button
          onClick={() => {
            router.push("/");
          }}
          className="magic-button px-6 py-3 flex items-center gap-2 text-white font-semibold"
        >
                  <HomeIcon className="text-lg" />
          <span className="hidden sm:inline">Accueil</span>
        </button>
      </div>

      {/* Conteneur principal avec padding bottom pour la barre de lecteur */}
      <div className="container mx-auto px-4 py-8 pb-24 relative z-10">
        {/* Grille principale responsive */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto justify-items-center">
          {/* Sélecteur d'œuvres - Cartes interactives */}
          <div
            className={`xl:col-span-2 w-full flex justify-center ${
              isLoaded ? "slide-in-right" : "opacity-0"
            }`}
            style={{ animationDelay: "0.6s" }}
          >
            <WorkSelector
              works={works}
              currentSongWorkId={currentSong.workId}
              selectedWork={selectedWork}
              showAnswer={showAnswer}
              canValidate={!!selectedWork && !showAnswer}
              canGoNext={canGoNext}
              isCurrentSongAnswered={isCurrentSongAnswered}
              onWorkSelection={handleWorkSelectionWithSound}
              onValidateAnswer={handleValidateAnswerWithSound}
              onNextSong={handleNextSongWithReset}
            />
          </div>
        </div>

        {/* Détails du morceau une fois la réponse validée (évite le flash au changement de morceau) */}
        {showAnswer && currentSongAnswer && currentSong?.artist && currentSong?.title && (
          <div className="flex justify-center mt-6">
            <div className="px-5 py-3 rounded-2xl bg-slate-900/80 border border-purple-500/40 text-center shadow-lg backdrop-blur">
              <p className="text-sm md:text-base text-white font-semibold tracking-wide">
                {currentSong.artist} &mdash; <span className="text-yellow-300">{currentSong.title}</span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Effets de lumière d'ambiance */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      {/* Barre de lecteur fixe en bas - Style inspire Spotify */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 border-t border-purple-500/30 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center justify-center gap-5">
              <button
                onClick={handlePrevSongWithReset}
                disabled={!canGoPrev}
                className={`p-2 rounded-full transition-all duration-300 ${
                  canGoPrev
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
                    {playbackIsPlaying ? <Pause className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                  </div>
                </button>
              </div>

              <button
                onClick={handleNextSongWithReset}
                disabled={!canGoNext}
                className={`p-2 rounded-full transition-all duration-300 ${
                  canGoNext
                    ? "bg-slate-800/70 hover:bg-slate-700 text-white shadow-md hover:shadow-blue-500/30 hover:scale-105"
                    : "bg-slate-800/40 text-gray-500 cursor-not-allowed"
                }`}
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            <div className="w-full max-w-4xl flex flex-col items-center gap-3">
              <div className="flex items-center justify-between w-full text-white text-xs">
                <span>{formatTimeFn(playbackCurrentTime)}</span>
                <span>{formatTimeFn(playbackDuration)}</span>
              </div>
              <div
                className="w-full magic-progress-bar h-2 cursor-pointer hover:h-3 transition-all duration-300"
                onClick={handleTimelineClick}
              >
                <div
                  className="magic-progress-fill h-full"
                  style={{
                    width: `${
                      playbackDuration ? (playbackCurrentTime / playbackDuration) * 100 : 0
                    }%`,
                  }}
                />
              </div>
              <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center text-sm gap-3 pt-1">
                <span className="text-yellow-400 font-semibold">
                  Morceau {gameSession.currentSongIndex + 1} / {gameSession.songs.length}
                </span>
                <div className="flex items-center justify-center gap-3 text-xs text-white">
                  <span className="px-3 py-1 rounded-full bg-green-500/20 text-green-200 font-semibold">
                    + {gameSession.score.correct}
                  </span>
                  <span className="px-3 py-1 rounded-full bg-red-500/20 text-red-200 font-semibold">
                    - {gameSession.score.incorrect}
                  </span>
                </div>
                <div className="hidden md:flex items-center justify-end gap-3 text-white text-xs">
                  <button
                    onClick={handleMuteToggle}
                    className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-700/60 transition-all duration-300 hover:scale-105"
                  >
                    {playbackMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-28 magic-progress-bar h-2 cursor-pointer hover:h-3 transition-all duration-300"
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const clickX = e.clientX - rect.left;
                        const percentage = (clickX / rect.width) * 100;
                        const newVolume = Math.max(0, Math.min(100, percentage));
                        handleVolumeChangeValue(newVolume);
                      }}
                    >
                      <div
                        className="magic-progress-fill h-full"
                        style={{ width: `${playbackVolume}%` }}
                      />
                    </div>
                    <span className="text-white text-xs w-10 text-center">{Math.round(playbackVolume)}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {playerError && (
        <div className="mt-4 text-center text-sm text-yellow-300">
          {playerError}
        </div>
      )}
      {playbackUnavailable && (
        <div className="mt-4 text-center text-sm text-yellow-300">
          Aucun extrait audio n&apos;est disponible pour ce morceau. Ajoutez un MP3 Cloudflare
          pour activer la lecture.
        </div>
      )}

    </div>
  );
}

export default GameClient;


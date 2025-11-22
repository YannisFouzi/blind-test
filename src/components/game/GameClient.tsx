"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type MouseEvent } from "react";
import YouTube from "react-youtube";
import {
  Home as HomeIcon,
  Pause,
  Play as PlayIcon,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { YouTubePlayerOptions } from "@/types/youtube";
import { Song } from "@/types";

import { PreloadPlayer } from "@/components/game/PreloadPlayer";
import { WorkSelector } from "@/components/game/WorkSelector";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useGame } from "@/hooks/useGame";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { useYouTube } from "@/hooks/useYouTube";

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

  const {
    isPlaying: youtubeIsPlaying,
    currentTime: youtubeCurrentTime,
    duration: youtubeDuration,
    volume: youtubeVolume,
    isMuted: youtubeIsMuted,
    youtubeError,
    handlePlayPause: handleYoutubePlayPause,
    handleVolumeChange: handleYoutubeVolumeChange,
    toggleMute: toggleYoutubeMute,
    handleProgressClick: handleYoutubeProgressClick,
    handleYoutubeError,
    handleYoutubeReady,
    handleYoutubeStateChange,
    preloadNextVideo,
    preloadSystem,
    formatTime: formatYoutubeTime,
  } = useYouTube();

  const preloadNextMedia = useCallback(
    (song: Song) => {
      if (song.audioUrl) {
        preloadTrack(song.audioUrl);
      } else if (song.youtubeId) {
        preloadNextVideo(song.youtubeId);
      }
    },
    [preloadTrack, preloadNextVideo]
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
  } = useGame(universeId, preloadNextMedia);

  const shouldUseAudio = Boolean(currentSong?.audioUrl);
  const playbackIsPlaying = shouldUseAudio ? audioIsPlaying : youtubeIsPlaying;
  const playbackCurrentTime = shouldUseAudio ? audioCurrentTime : youtubeCurrentTime;
  const playbackDuration = shouldUseAudio ? audioDuration : youtubeDuration;
  const playbackVolume = shouldUseAudio ? audioVolume : youtubeVolume;
  const playbackMuted = shouldUseAudio ? audioIsMuted : youtubeIsMuted;
  const playerError = shouldUseAudio ? audioError : youtubeError;
  const formatTimeFn = shouldUseAudio ? formatAudioTime : formatYoutubeTime;
  const playbackUnavailable = !shouldUseAudio && !currentSong?.youtubeId;

  useEffect(() => {
    if (shouldUseAudio && currentSong?.audioUrl) {
      void prepareTrack(currentSong.audioUrl);
    } else {
      resetAudioPlayer();
    }
  }, [shouldUseAudio, currentSong?.audioUrl, prepareTrack, resetAudioPlayer]);

  const handlePlayToggle = () => {
    if (playbackUnavailable) {
      return;
    }

    if (shouldUseAudio) {
      if (currentSong?.audioUrl) {
        handleAudioPlayPause(currentSong.audioUrl);
      }
    } else {
      handleYoutubePlayPause(currentSong?.youtubeId);
    }
  };

  const handleVolumeChangeValue = (value: number) => {
    if (shouldUseAudio) {
      handleAudioVolumeChange(value);
    } else {
      handleYoutubeVolumeChange(value);
    }
  };

  const handleMuteToggle = () => {
    if (shouldUseAudio) {
      toggleAudioMute();
    } else {
      toggleYoutubeMute();
    }
  };

  const handleTimelineClick = (event: MouseEvent<HTMLDivElement>) => {
    if (shouldUseAudio) {
      handleAudioProgressClick(event);
    } else {
      handleYoutubeProgressClick(event);
    }
  };

  const [isLoaded, setIsLoaded] = useState(false);
  const hiddenPlayerOptions: YouTubePlayerOptions = {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 0,
      controls: 0,
      playsinline: 1,
      enablejsapi: 1,
    },
  };

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
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Sélecteur d'œuvres - Cartes interactives */}
          <div
            className={`xl:col-span-1 ${
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
      </div>

      {/* Effets de lumière d'ambiance */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>

      {/* Barre de lecteur fixe en bas - Style Spotify */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-purple-500/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Section gauche - Contrôles et scores */}
            <div className="flex flex-col items-center gap-3">
              {/* Contrôles principaux - Version compacte */}
              <div className="flex items-center gap-4">
                {/* Bouton précédent */}
                <button
                  onClick={handlePrevSongWithReset}
                  disabled={!canGoPrev}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    canGoPrev
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/50 hover:scale-110"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                {/* Bouton play/pause principal - Version compacte */}
                <div className="relative">
                  <button
                    onClick={handlePlayToggle}
                    disabled={playbackUnavailable}
                    className={`relative p-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 rounded-full text-white shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 transform hover:scale-105 ${
                      playbackUnavailable ? "opacity-60 cursor-not-allowed" : ""
                    }`}
                  >
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 blur-md opacity-50" />
                    <div className="relative z-10">
                      {playbackIsPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <PlayIcon className="w-5 h-5" />
                      )}
                    </div>
                  </button>
                </div>

                {/* Bouton suivant */}
                <button
                  onClick={handleNextSongWithReset}
                  disabled={!canGoNext}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    canGoNext
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-blue-500/50 hover:scale-110"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>

              {/* Scores compacts */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-green-400 text-sm">✓</span>
                  <span className="text-white text-sm font-semibold">
                    {gameSession.score.correct}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-400 text-sm">✗</span>
                  <span className="text-white text-sm font-semibold">
                    {gameSession.score.incorrect}
                  </span>
                </div>
              </div>
            </div>

            {/* Barre de progression centrale avec indicateur de morceau */}
            <div className="flex-1 max-w-md mx-4">
              <div className="flex items-center justify-between text-white text-xs mb-1">
                <span>{formatTimeFn(playbackCurrentTime)}</span>
                <span>{formatTimeFn(playbackDuration)}</span>
              </div>
              <div
                className="magic-progress-bar h-2 cursor-pointer hover:h-3 transition-all duration-300"
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
              {/* Indicateur de morceau */}
              <div className="text-center mt-2">
                <span className="text-yellow-400 text-sm font-semibold">
                  Morceau {gameSession.currentSongIndex + 1} /{" "}
                  {gameSession.songs.length}
                </span>
              </div>
            </div>

            {/* Contrôle du volume - Masqué sur mobile */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={handleMuteToggle}
                className="p-2 rounded-full bg-slate-800/50 text-white hover:bg-slate-700/50 transition-all duration-300 hover:scale-110"
              >
                {playbackMuted ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <div className="flex items-center gap-2">
                <div
                  className="w-20 magic-progress-bar h-2 cursor-pointer hover:h-3 transition-all duration-300"
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
                <span className="text-white text-xs w-8 text-center">
                  {Math.round(playbackVolume)}%
                </span>
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

      {!shouldUseAudio && currentSong.youtubeId && (
        <>
          <div className="hidden">
            <YouTube
              videoId={currentSong.youtubeId}
              opts={hiddenPlayerOptions}
              onReady={handleYoutubeReady}
              onStateChange={handleYoutubeStateChange}
              onError={handleYoutubeError}
            />
          </div>
          <PreloadPlayer
            onReady={preloadSystem.handlePreloadPlayerReady}
            onError={(error) => {
              if (process.env.NODE_ENV === "development") {
                console.warn("Erreur lecteur de préchargement:", error);
              }
            }}
          />
        </>
      )}
    </div>
  );
}

export default GameClient;

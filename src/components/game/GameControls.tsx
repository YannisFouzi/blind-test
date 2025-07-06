import {
  FaPause,
  FaPlay,
  FaStepBackward,
  FaStepForward,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";
import YouTube from "react-youtube";
import { GameSession } from "../../../types";
import { GameScore } from "./GameScore";

interface GameControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  currentSongTitle: string;
  currentSongVideoId: string;
  showAnswer: boolean;
  usingDemoData: boolean;
  youtubeError: string | null;
  gameSession: GameSession;
  onPlayPause: () => void;
  onPrevSong: () => void;
  onNextSong: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  onError: (error: any) => void;
  onReady: (event: any) => void;
  onStateChange: (event: any) => void;
  formatTime: (seconds: number) => string;
}

export const GameControls = ({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  canGoPrev,
  canGoNext,
  currentSongTitle,
  currentSongVideoId,
  showAnswer,
  usingDemoData,
  youtubeError,
  gameSession,
  onPlayPause,
  onPrevSong,
  onNextSong,
  onVolumeChange,
  onToggleMute,
  onProgressClick,
  onError,
  onReady,
  onStateChange,
  formatTime,
}: GameControlsProps) => {
  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    const newVolume = Math.max(0, Math.min(100, percentage));
    onVolumeChange(newVolume);
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="relative">
      {/* Effet de lumière magique autour du lecteur */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-xl" />

      {/* Container principal avec glassmorphism */}
      <div className="relative bg-slate-900/40 backdrop-blur-lg rounded-3xl p-8 border border-purple-500/20">
        {/* Titre de la musique ou message d'instruction */}
        <div className="text-center mb-8 relative">
          {showAnswer ? (
            <div className="fade-in-up">
              <h2 className="fantasy-text text-4xl md:text-5xl font-bold mb-2">
                {currentSongTitle}
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-purple-500 mx-auto rounded-full" />
            </div>
          ) : (
            <div className="fade-in-up">
              <p className="text-white text-xl md:text-2xl font-semibold mb-2">
                Écoute et devine l'œuvre
              </p>
            </div>
          )}
        </div>

        {/* Contrôles principaux - Design central imposant */}
        <div className="flex justify-center items-center gap-8 mb-8">
          {/* Bouton précédent */}
          <button
            onClick={onPrevSong}
            disabled={!canGoPrev}
            className={`p-4 rounded-full transition-all duration-300 ${
              canGoPrev
                ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/50 hover:scale-110 card-hover"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            <FaStepBackward size={24} />
          </button>

          {/* Bouton play/pause principal - Plus grand et plus imposant */}
          <button
            onClick={onPlayPause}
            className="relative p-8 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 rounded-full text-white shadow-2xl hover:shadow-yellow-500/50 transition-all duration-300 transform hover:scale-105"
          >
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 blur-lg opacity-50" />
            <div className="relative z-10">
              {isPlaying ? <FaPause size={32} /> : <FaPlay size={32} />}
            </div>
          </button>

          {/* Bouton suivant */}
          <button
            onClick={onNextSong}
            disabled={!canGoNext}
            className={`p-4 rounded-full transition-all duration-300 ${
              canGoNext
                ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-blue-500/50 hover:scale-110 card-hover"
                : "bg-gray-700 text-gray-400 cursor-not-allowed"
            }`}
          >
            <FaStepForward size={24} />
          </button>
        </div>

        {/* Barre de progression magique */}
        <div className="mb-8">
          <div className="flex items-center justify-between text-white text-sm mb-2">
            <span className="bg-slate-800/50 px-3 py-1 rounded-full">
              {formatTime(currentTime)}
            </span>
            <span className="bg-slate-800/50 px-3 py-1 rounded-full">
              {formatTime(duration)}
            </span>
          </div>
          <div
            className="magic-progress-bar h-3 cursor-pointer hover:h-4 transition-all duration-300"
            onClick={onProgressClick}
          >
            <div
              className="magic-progress-fill h-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Contrôle du volume avec design moderne */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <button
            onClick={onToggleMute}
            className="p-3 rounded-full bg-slate-800/50 text-white hover:bg-slate-700/50 transition-all duration-300 hover:scale-110"
          >
            {isMuted ? <FaVolumeMute size={20} /> : <FaVolumeUp size={20} />}
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-32 magic-progress-bar h-3 cursor-pointer hover:h-4 transition-all duration-300"
              onClick={handleVolumeClick}
            >
              <div
                className="magic-progress-fill h-full"
                style={{ width: `${volume}%` }}
              />
            </div>
            <span className="text-white text-sm w-8 text-center">
              {Math.round(volume)}%
            </span>
          </div>
        </div>

        {/* Messages d'erreur et d'info avec nouveau design */}
        {youtubeError && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-900/50 to-orange-900/50 border border-yellow-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 text-yellow-300">
              <div className="text-2xl">⚠️</div>
              <div>
                <p className="font-semibold">Attention magique</p>
                <p className="text-sm text-yellow-200 mt-1">{youtubeError}</p>
              </div>
            </div>
          </div>
        )}

        {usingDemoData && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-900/50 to-cyan-900/50 border border-blue-500/30 rounded-xl backdrop-blur-sm">
            <div className="flex items-center gap-3 text-blue-300">
              <div className="text-2xl">🎭</div>
              <div>
                <p className="font-semibold">Mode démonstration</p>
                <p className="text-sm text-blue-200 mt-1">
                  Vous utilisez des chansons de démonstration. Rendez-vous dans
                  l'administration pour ajouter de vraies chansons et débloquer
                  tous les pouvoirs magiques !
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Lecteur YouTube (caché) */}
        <div className="hidden">
          <YouTube
            videoId={currentSongVideoId}
            opts={{
              height: "0",
              width: "0",
              playerVars: { autoplay: 0, controls: 0 },
            }}
            onReady={onReady}
            onStateChange={onStateChange}
            onError={onError}
          />
        </div>

        {/* Score intégré avec design moderne */}
        <div className="mt-8 pt-6 border-t border-purple-500/20">
          <GameScore gameSession={gameSession} />
        </div>
      </div>
    </div>
  );
};

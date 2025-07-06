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

  return (
    <div>
      {/* Titre de la musique ou message d'instruction */}
      {showAnswer ? (
        <h2 className="text-3xl font-bold text-white mb-6 text-center">
          {currentSongTitle}
        </h2>
      ) : (
        <p className="text-gray-400 text-lg mb-6 text-center">
          Appuie sur play et devine l&apos;œuvre
        </p>
      )}

      {/* Contrôles principaux */}
      <div className="flex justify-center items-center gap-6 mb-4">
        <button
          onClick={onPrevSong}
          disabled={!canGoPrev}
          className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <FaStepBackward size={24} />
        </button>

        <button
          onClick={onPlayPause}
          className="bg-orange-500 hover:bg-orange-600 rounded-full p-4 text-white transition-colors cursor-pointer"
        >
          {isPlaying ? <FaPause size={24} /> : <FaPlay size={24} />}
        </button>

        <button
          onClick={onNextSong}
          disabled={!canGoNext}
          className="text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          <FaStepForward size={24} />
        </button>
      </div>

      {/* Barre de progression */}
      <div className="flex items-center gap-4 mb-4">
        <span className="text-white text-sm">{formatTime(currentTime)}</span>
        <div
          className="flex-1 bg-gray-700 rounded-full h-2 cursor-pointer hover:bg-gray-600 transition-colors"
          onClick={onProgressClick}
        >
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${duration ? (currentTime / duration) * 100 : 0}%`,
            }}
          ></div>
        </div>
        <span className="text-white text-sm">{formatTime(duration)}</span>
      </div>

      {/* Contrôle du volume */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={onToggleMute}
          className="text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          {isMuted ? <FaVolumeMute size={20} /> : <FaVolumeUp size={20} />}
        </button>
        <div
          className="w-24 bg-gray-700 rounded-full h-2 cursor-pointer hover:bg-gray-600 transition-colors"
          onClick={handleVolumeClick}
        >
          <div
            className="bg-orange-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${volume}%` }}
          ></div>
        </div>
      </div>

      {/* Message d'erreur YouTube */}
      {youtubeError && (
        <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400">
            <span>⚠️</span>
            <span className="text-sm">{youtubeError}</span>
          </div>
        </div>
      )}

      {/* Message données de démonstration */}
      {usingDemoData && (
        <div className="mb-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
          <div className="flex items-center gap-2 text-blue-400">
            <span>ℹ️</span>
            <div className="text-sm">
              <p className="font-medium">Mode démonstration</p>
              <p className="text-blue-300 mt-1">
                Vous utilisez des chansons de démonstration car aucune chanson
                n&apos;a été ajoutée pour vos œuvres. Rendez-vous dans
                l&apos;administration pour ajouter de vraies chansons.
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

      {/* Score */}
      <GameScore gameSession={gameSession} />
    </div>
  );
};

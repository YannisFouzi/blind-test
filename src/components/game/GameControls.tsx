import {
  FaPause,
  FaPlay,
  FaStepBackward,
  FaStepForward,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";

interface GameControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPlayPause: () => void;
  onPrevSong: () => void;
  onNextSong: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onProgressClick: (e: React.MouseEvent<HTMLDivElement>) => void;
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
  onPlayPause,
  onPrevSong,
  onNextSong,
  onVolumeChange,
  onToggleMute,
  onProgressClick,
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
    <div className="mt-6">
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
      <div className="flex items-center justify-center gap-4">
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
    </div>
  );
};

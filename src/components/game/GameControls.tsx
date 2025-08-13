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
  onError: (error: unknown) => void;
  onReady: (event: {
    target: {
      playVideo: () => void;
      pauseVideo: () => void;
      setVolume: (volume: number) => void;
      seekTo: (seconds: number, allowSeekAhead: boolean) => void;
      getCurrentTime: () => number;
      getDuration: () => number;
    };
  }) => void;
  onStateChange: (event: { target: unknown; data: number }) => void;
  formatTime: (seconds: number) => string;
}

export const GameControls = ({
  currentSongTitle,
  currentSongVideoId,
  showAnswer,
  usingDemoData,
  youtubeError,
  gameSession,
  onError,
  onReady,
  onStateChange,
}: GameControlsProps) => {
  return (
    <>
      {/* Zone principale avec titre et score */}
      <div className="relative">
        {/* Effet de lumière magique autour du lecteur */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-blue-500/10 to-purple-500/10 rounded-3xl blur-xl" />

        {/* Container principal avec glassmorphism */}
        <div className="relative bg-slate-900/40 backdrop-blur-lg rounded-3xl p-8">
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
                  Écoute et devine l&apos;œuvre
                </p>
              </div>
            )}
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
                    Vous utilisez des chansons de démonstration. Rendez-vous
                    dans l&apos;administration pour ajouter de vraies chansons
                    et débloquer tous les pouvoirs magiques !
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Score intégré avec design moderne */}
          <div className="mt-6 pt-4 border-t border-purple-500/20">
            <GameScore gameSession={gameSession} />
          </div>
        </div>
      </div>

      {/* Lecteur YouTube (caché) */}
      <div className="hidden">
        <YouTube
          videoId={currentSongVideoId}
          opts={{
            height: "0",
            width: "0",
            playerVars: {
              autoplay: 0,
              controls: 0,
              playsinline: 1,
              enablejsapi: 1,
              origin:
                typeof window !== "undefined"
                  ? window.location.origin
                  : undefined,
            },
          }}
          onReady={onReady}
          onStateChange={onStateChange}
          onError={onError}
        />
      </div>
    </>
  );
};

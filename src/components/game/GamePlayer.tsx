import YouTube from "react-youtube";
import { Song } from "../../../types";

interface GamePlayerProps {
  currentSong: Song;
  showAnswer: boolean;
  correctWorkTitle?: string;
  usingDemoData: boolean;
  youtubeError: string | null;
  onError: (error: unknown) => void;
  onReady: (event: {
    target: {
      playVideo: () => void;
      pauseVideo: () => void;
      setVolume: (volume: number) => void;
      seekTo: (seconds: number, allowSeekAhead: boolean) => void;
      getCurrentTime: () => number;
      getDuration: () => number;
      cueVideoById: (videoId: string) => void;
      loadVideoById: (videoId: string) => void;
    };
  }) => void;
  onStateChange: (event: { target: unknown; data: number }) => void;
}

export const GamePlayer = ({
  currentSong,
  showAnswer,
  usingDemoData,
  youtubeError,
  onError,
  onReady,
  onStateChange,
}: GamePlayerProps) => {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-8 text-center border border-gray-700/50">
      {!showAnswer && (
        <p className="text-gray-400 text-lg mb-6">
          Devinez le titre de cette musique
        </p>
      )}

      {/* Message d'erreur YouTube */}
      {youtubeError && (
        <div className="mt-6 p-4 bg-yellow-900/30 border border-yellow-600 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-400">
            <span>⚠️</span>
            <span className="text-sm">{youtubeError}</span>
          </div>
        </div>
      )}

      {/* Message données de démonstration */}
      {usingDemoData && (
        <div className="mt-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
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
      <div className="mt-6">
        <YouTube
          videoId={currentSong.youtubeId}
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
    </div>
  );
};

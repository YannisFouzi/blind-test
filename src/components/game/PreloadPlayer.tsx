import YouTube from "react-youtube";
import type {
  YouTubeEvent,
  YouTubePlayerOptions,
} from "@/types/youtube";

interface PreloadPlayerProps {
  onReady: (event: YouTubeEvent<void>) => void;
  onError: (error: unknown) => void;
}

export const PreloadPlayer = ({ onReady, onError }: PreloadPlayerProps) => {
  // Options pour le lecteur invisible
  const opts: YouTubePlayerOptions = {
    height: "0",
    width: "0",
    playerVars: {
      autoplay: 0,
      controls: 0,
      disablekb: 1,
      enablejsapi: 1,
      fs: 0,
      iv_load_policy: 3,
      modestbranding: 1,
      playsinline: 1,
      rel: 0,
    },
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "-9999px",
        left: "-9999px",
        width: "0",
        height: "0",
        opacity: 0,
        pointerEvents: "none",
      }}
      aria-hidden="true"
    >
      <YouTube
        videoId="" // Pas de vidéo par défaut
        opts={opts}
        onReady={onReady}
        onError={onError}
      />
    </div>
  );
};


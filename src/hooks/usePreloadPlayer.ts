import { useRef, useState } from "react";
import { coerceYouTubeController } from "@/types/youtube";
import type { YouTubeController, YouTubeEvent } from "@/types/youtube";

export const usePreloadPlayer = () => {
  const [preloadedVideoId, setPreloadedVideoId] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);

  const preloadPlayer = useRef<YouTubeController | null>(null);

  const preloadNextVideo = (videoId: string) => {
    if (!preloadPlayer.current || !videoId || preloadedVideoId === videoId) {
      return;
    }

    setIsPreloading(true);

    try {
      preloadPlayer.current.cueVideoById(videoId);
      setPreloadedVideoId(videoId);

      if (process.env.NODE_ENV === "development") {
        console.log(`YouTube preload: ${videoId}`);
      }
    } catch (error) {
      console.warn("Erreur lors du prechargement:", error);
    } finally {
      setIsPreloading(false);
    }
  };

  const handlePreloadPlayerReady = (event: YouTubeEvent<void>) => {
    const player = coerceYouTubeController(event.target);
    preloadPlayer.current = player;
    preloadPlayer.current.setVolume(0);

    if (process.env.NODE_ENV === "development") {
      console.log("Preload player ready");
    }
  };

  const transferPreloadedVideo = (
    mainPlayer: YouTubeController,
    videoId: string
  ) => {
    if (preloadedVideoId === videoId && mainPlayer) {
      mainPlayer.loadVideoById(videoId);
      setPreloadedVideoId(null);
      return true;
    }
    return false;
  };

  return {
    preloadedVideoId,
    isPreloading,
    preloadPlayer,
    preloadNextVideo,
    handlePreloadPlayerReady,
    transferPreloadedVideo,
  };
};
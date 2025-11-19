import { useRef, useState } from "react";
import { usePreloadDebug } from "./usePreloadDebug";

export const usePreloadPlayer = () => {
  // État du lecteur de préchargement
  const [preloadedVideoId, setPreloadedVideoId] = useState<string | null>(null);
  const [isPreloading, setIsPreloading] = useState(false);

  // Système de debug
  const debug = usePreloadDebug();

  const preloadPlayer = useRef<{
    cueVideoById: (videoId: string) => void;
    loadVideoById: (videoId: string) => void;
    playVideo: () => void;
    pauseVideo: () => void;
    setVolume: (volume: number) => void;
  } | null>(null);

  // Préchargement de la vidéo suivante
  const preloadNextVideo = (videoId: string) => {
    if (!preloadPlayer.current || !videoId || preloadedVideoId === videoId) {
      return;
    }

    const startTime = Date.now();
    setIsPreloading(true);

    // Log début de préchargement
    debug.logPreloadStart(videoId);

    try {
      // Utiliser cueVideoById pour précharger sans jouer
      preloadPlayer.current.cueVideoById(videoId);
      setPreloadedVideoId(videoId);

      // Log succès du préchargement
      debug.logPreloadSuccess(videoId, startTime);

      if (process.env.NODE_ENV === "development") {
        console.log(`🎯 Vidéo préchargée: ${videoId}`);
      }
    } catch (error) {
      // Log erreur du préchargement
      debug.logPreloadError(videoId, error);
      console.warn("Erreur lors du préchargement:", error);
    } finally {
      setIsPreloading(false);
    }
  };

  // Événement quand le lecteur de préchargement est prêt
  const handlePreloadPlayerReady = (event: {
    target: {
      cueVideoById: (videoId: string) => void;
      loadVideoById: (videoId: string) => void;
      playVideo: () => void;
      pauseVideo: () => void;
      setVolume: (volume: number) => void;
    };
  }) => {
    preloadPlayer.current = event.target;
    // Mettre le volume à 0 pour le lecteur invisible
    preloadPlayer.current.setVolume(0);

    if (process.env.NODE_ENV === "development") {
      console.log("🎯 Lecteur de préchargement prêt");
    }
  };

  // Transférer la vidéo préchargée vers le lecteur principal
  const transferPreloadedVideo = (
    mainPlayer: {
      loadVideoById: (videoId: string) => void;
      cueVideoById: (videoId: string) => void;
      playVideo: () => void;
    },
    videoId: string
  ) => {
    if (preloadedVideoId === videoId && mainPlayer) {
      // La vidéo est préchargée, on peut faire un transfert optimisé
      mainPlayer.loadVideoById(videoId);
      setPreloadedVideoId(null); // Reset après transfert
      return true;
    }
    return false;
  };

  return {
    // État
    preloadedVideoId,
    isPreloading,
    preloadPlayer,

    // Actions
    preloadNextVideo,
    handlePreloadPlayerReady,
    transferPreloadedVideo,

    // Debug
    debug,
  };
};


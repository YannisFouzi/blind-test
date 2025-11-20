import { useEffect, useRef, useState } from "react";
import { coerceYouTubeController } from "@/types/youtube";
import type { YouTubeController, YouTubeEvent } from "@/types/youtube";
import { formatTime } from "../utils/formatters";
import { usePreloadPlayer } from "./usePreloadPlayer";

export const useYouTube = () => {
  // Ã‰tat du lecteur
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  // Hook pour le lecteur de prÃ©chargement
  const preloadSystem = usePreloadPlayer();

  const youtubePlayer = useRef<YouTubeController | null>(null);

  // ContrÃ´les du lecteur
  const handlePlayPause = (videoId?: string) => {
    if (youtubePlayer.current) {
      try {
        if (isPlaying) {
          youtubePlayer.current.pauseVideo();
          setIsPlaying(false);
        } else {
          if (videoId) {
            // Jouer une vidÃ©o spÃ©cifique (avec prÃ©chargement intelligent)
            playVideo(videoId);
          } else {
            // Reprendre la lecture actuelle
            youtubePlayer.current.playVideo();
            setIsPlaying(true);
          }
        }
      } catch (error) {
        console.warn("Erreur lors du contrÃ´le de lecture:", error);
        // On ne met pas d'erreur visible pour l'utilisateur ici
      }
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (youtubePlayer.current) {
      youtubePlayer.current.setVolume(newVolume);
    }
  };

  const toggleMute = () => {
    if (youtubePlayer.current) {
      if (isMuted) {
        youtubePlayer.current.setVolume(volume);
      } else {
        youtubePlayer.current.setVolume(0);
      }
      setIsMuted(!isMuted);
    }
  };

  const handleSeek = (seconds: number) => {
    if (youtubePlayer.current) {
      youtubePlayer.current.seekTo(seconds, true);
      setCurrentTime(seconds);
    }
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;

    handleSeek(newTime);
  };

  const handleYoutubeError = (error: unknown) => {
    // DÃ©tection mobile
    const isMobile =
      typeof window !== "undefined" &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Sur mobile, on ignore complÃ¨tement les erreurs YouTube (autoplay bloquÃ©, etc.)
    if (isMobile) {
      return; // Ne rien faire sur mobile
    }

    // Sur desktop uniquement
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur YouTube:", error);
    }

    // Afficher l'erreur seulement sur desktop
    setYoutubeError(
      "Impossible de charger la vidÃ©o YouTube. Cela peut Ãªtre dÃ» Ã  vos extensions de navigateur (adblockers). Le jeu fonctionne toujours sans audio."
    );
  };

  const handleYoutubeReady = (event: YouTubeEvent<void>) => {
    const player = coerceYouTubeController(event.target);
    youtubePlayer.current = player;
    setDuration(player.getDuration());
    setYoutubeError(null);
  };

  const handleYoutubeStateChange = (event: YouTubeEvent<number>) => {
    setIsPlaying(event.data === 1);
  };

  const resetPlayer = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    setYoutubeError(null);
  };

  // PrÃ©chargement de la vidÃ©o suivante (dÃ©lÃ©guÃ© au lecteur de prÃ©chargement)
  const preloadNextVideo = (videoId: string) => {
    preloadSystem.preloadNextVideo(videoId);
  };

  // Jouer la vidÃ©o prÃ©chargÃ©e ou charger une nouvelle
  const playVideo = (videoId: string) => {
    if (!youtubePlayer.current) return;

    const isPreloaded = preloadSystem.preloadedVideoId === videoId;

    try {
      if (isPreloaded) {
        const transferred = preloadSystem.transferPreloadedVideo(
          youtubePlayer.current,
          videoId
        );
        if (transferred) {
          setIsPlaying(true);
          setYoutubeError(null);
        } else {
          youtubePlayer.current.loadVideoById(videoId);
          setIsPlaying(true);
        }
      } else {
        youtubePlayer.current.loadVideoById(videoId);
        setIsPlaying(true);
      }
      setYoutubeError(null);
    } catch (error) {
      console.warn("Erreur lors de la lecture:", error);
    }
  };

  // Effet pour mettre Ã  jour le temps actuel
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPlaying && youtubePlayer.current) {
      interval = setInterval(() => {
        if (youtubePlayer.current) {
          const currentTime = youtubePlayer.current.getCurrentTime();
          setCurrentTime(currentTime);
        }
      }, 500);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying]);

  return {
    // Ã‰tat
    isPlaying,
    volume,
    currentTime,
    duration,
    isMuted,
    youtubeError,
    youtubePlayer,

    // Ã‰tat du prÃ©chargement (depuis le systÃ¨me de prÃ©chargement)
    preloadedVideoId: preloadSystem.preloadedVideoId,
    isPreloading: preloadSystem.isPreloading,

    // Actions
    handlePlayPause,
    handleVolumeChange,
    toggleMute,
    handleSeek,
    handleProgressClick,
    handleYoutubeError,
    handleYoutubeReady,
    handleYoutubeStateChange,
    resetPlayer,

    // Actions de prÃ©chargement
    preloadNextVideo,
    playVideo,

    // SystÃ¨me de prÃ©chargement
    preloadSystem,

    // Utilitaires
    formatTime,
  };
};












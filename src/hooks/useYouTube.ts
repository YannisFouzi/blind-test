import { useEffect, useRef, useState } from "react";
import { formatTime } from "../utils/formatters";

export const useYouTube = () => {
  // État du lecteur
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  const youtubePlayer = useRef<{
    playVideo: () => void;
    pauseVideo: () => void;
    setVolume: (volume: number) => void;
    seekTo: (seconds: number, allowSeekAhead: boolean) => void;
    getCurrentTime: () => number;
    getDuration: () => number;
  } | null>(null);

  // Contrôles du lecteur
  const handlePlayPause = () => {
    if (youtubePlayer.current) {
      try {
        if (isPlaying) {
          youtubePlayer.current.pauseVideo();
        } else {
          youtubePlayer.current.playVideo();
        }
        setIsPlaying(!isPlaying);
      } catch (error) {
        console.warn("Erreur lors du contrôle de lecture:", error);
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
    // Détection mobile
    const isMobile =
      typeof window !== "undefined" &&
      /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    // Sur mobile, on ignore complètement les erreurs YouTube (autoplay bloqué, etc.)
    if (isMobile) {
      return; // Ne rien faire sur mobile
    }

    // Sur desktop uniquement
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur YouTube:", error);
    }

    // Afficher l'erreur seulement sur desktop
    setYoutubeError(
      "Impossible de charger la vidéo YouTube. Cela peut être dû à vos extensions de navigateur (adblockers). Le jeu fonctionne toujours sans audio."
    );
  };

  const handleYoutubeReady = (event: {
    target: {
      playVideo: () => void;
      pauseVideo: () => void;
      setVolume: (volume: number) => void;
      seekTo: (seconds: number, allowSeekAhead: boolean) => void;
      getCurrentTime: () => number;
      getDuration: () => number;
    };
  }) => {
    youtubePlayer.current = event.target;
    setDuration(event.target.getDuration());
    setYoutubeError(null);
  };

  const handleYoutubeStateChange = (event: { data: number }) => {
    setIsPlaying(event.data === 1);
  };

  const resetPlayer = () => {
    setCurrentTime(0);
    setIsPlaying(false);
    setYoutubeError(null);
  };

  // Effet pour mettre à jour le temps actuel
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
    // État
    isPlaying,
    volume,
    currentTime,
    duration,
    isMuted,
    youtubeError,
    youtubePlayer,

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

    // Utilitaires
    formatTime,
  };
};

import { useEffect, useRef, useState } from "react";
import type { LegacyYouTubePlayer, YouTubeEvent } from "@/types/youtube";
import { formatTime } from "../utils/formatters";
import { usePreloadDebug } from "./usePreloadDebug";
import { usePreloadPlayer } from "./usePreloadPlayer";

export const useYouTube = () => {
  // État du lecteur
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(50);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);

  // System de debug
  const debug = usePreloadDebug();

  // Hook pour le lecteur de préchargement
  const preloadSystem = usePreloadPlayer();

  const youtubePlayer = useRef<LegacyYouTubePlayer | null>(null);

  // Contrôles du lecteur
  const handlePlayPause = (videoId?: string) => {
    if (youtubePlayer.current) {
      try {
        if (isPlaying) {
          youtubePlayer.current.pauseVideo();
          setIsPlaying(false);
        } else {
          if (videoId) {
            // Jouer une vidéo spécifique (avec préchargement intelligent)
            playVideo(videoId);
          } else {
            // Reprendre la lecture actuelle
            youtubePlayer.current.playVideo();
            setIsPlaying(true);
          }
        }
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

  const handleYoutubeReady = (event: YouTubeEvent<void>) => {
    const player = event.target as unknown as LegacyYouTubePlayer;
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

  // Préchargement de la vidéo suivante (délégué au lecteur de préchargement)
  const preloadNextVideo = (videoId: string) => {
    preloadSystem.preloadNextVideo(videoId);
  };

  // Jouer la vidéo préchargée ou charger une nouvelle
  const playVideo = (videoId: string) => {
    if (!youtubePlayer.current) return;

    const isPreloaded = preloadSystem.preloadedVideoId === videoId;
    const startTime = debug.logPlayStart(videoId, isPreloaded);

    try {
      if (isPreloaded) {
        // La vidéo est préchargée dans le lecteur invisible, transférer vers le principal
        const transferred = preloadSystem.transferPreloadedVideo(
          youtubePlayer.current,
          videoId
        );
        if (transferred) {
          setIsPlaying(true);
          setYoutubeError(null);

          // Log performance de lecture instantanée
          setTimeout(() => {
            debug.logPlaySuccess(videoId, startTime, true);
          }, 100);
        } else {
          // Fallback si le transfert échoue
          youtubePlayer.current.loadVideoById(videoId);
          setIsPlaying(true);
        }
      } else {
        // Charger et jouer la vidéo normalement
        youtubePlayer.current.loadVideoById(videoId);
        setIsPlaying(true);

        // Log performance de chargement
        setTimeout(() => {
          debug.logPlaySuccess(videoId, startTime, false);
        }, 500);
      }
      setYoutubeError(null);
    } catch (error) {
      debug.logAction("PLAY_ERROR", { videoId, error });
      console.warn("Erreur lors de la lecture:", error);
    }
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

    // État du préchargement (depuis le système de préchargement)
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

    // Actions de préchargement
    preloadNextVideo,
    playVideo,

    // Système de debug
    debug,

    // Système de préchargement
    preloadSystem,

    // Utilitaires
    formatTime,
  };
};

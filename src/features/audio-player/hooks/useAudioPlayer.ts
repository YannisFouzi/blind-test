"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseAudioPlayerOptions, UseAudioPlayerReturn } from "../types";

/**
 * useAudioPlayer Hook
 *
 * Hook réutilisable pour gérer la lecture audio.
 * Utilisé par solo-game et multiplayer-game.
 *
 * @example
 * ```tsx
 * const audio = useAudioPlayer({
 *   initialAudioUrl: "/song.mp3",
 *   autoPlay: true,
 *   noSeek: false,
 *   onEnded: () => console.log("Finished"),
 * });
 *
 * return <AudioControls {...audio} />;
 * ```
 */

const createAudioElement = () => {
  const audio = new Audio();
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  return audio;
};

export const useAudioPlayer = (options: UseAudioPlayerOptions = {}): UseAudioPlayerReturn => {
  const {
    initialAudioUrl,
    startTime = 0,
    autoPlay = false,
    initialVolume = 70,
    noSeek = false,
    onEnded,
    onError,
    onReady,
  } = options;

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const preloadedSrcRef = useRef<string | null>(null);
  const previousVolumeRef = useRef(initialVolume);

  // State
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(initialAudioUrl || null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolumeState] = useState(initialVolume);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAutoplayBlockedError = (err: unknown) =>
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: string }).name === "NotAllowedError";

  // Initialize audio element
  useEffect(() => {
    const audio = createAudioElement();
    audio.volume = initialVolume / 100;
    audioRef.current = audio;

    // Event handlers
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
      setIsLoading(false);
      onReady?.();
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    const handleError = () => {
      const errorMsg = "Impossible de lire l'extrait audio.";
      setError(errorMsg);
      setIsPlaying(false);
      setIsLoading(false);
      onError?.(errorMsg);
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    // Add event listeners
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("loadstart", handleLoadStart);

    // Cleanup
    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
      audio.removeEventListener("loadstart", handleLoadStart);
    };
  }, [initialVolume, onEnded, onError, onReady]);

  // Sync volume with audio element
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  // Load initial track
  useEffect(() => {
    if (initialAudioUrl) {
      void loadTrack(initialAudioUrl, startTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only on mount

  const playInternal = useCallback(
    async (mode: "user" | "auto") => {
      const audio = audioRef.current;
      if (!audio || !audio.src) return false;

      try {
        await audio.play();
        setIsPlaying(true);
        setError(null);
        return true;
      } catch (err) {
        setIsPlaying(false);

        if (mode === "auto" && isAutoplayBlockedError(err)) {
          setError("Cliquez sur Play pour activer l'audio.");
          return false;
        }

        const errorMsg = "Impossible de démarrer la lecture audio.";
        setError(errorMsg);
        onError?.(errorMsg);
        if (process.env.NODE_ENV === "development") {
          console.warn("Audio playback error:", err);
        }
        return false;
      }
    },
    [onError]
  );

  /**
   * Charger une nouvelle piste
   */
  const loadTrack = useCallback(async (audioUrl: string, seekTo: number = 0): Promise<void> => {
    const audio = audioRef.current;
    if (!audio || !audioUrl) return;

    setError(null);
    setIsLoading(true);

    const shouldReload = !audio.src || currentAudioUrl !== audioUrl;

    if (shouldReload) {
      audio.pause();
      setIsPlaying(false);
      setCurrentAudioUrl(audioUrl);
      setCurrentTime(0);
      setDuration(0);
      audio.src = audioUrl;
      audio.load();

      // Wait for metadata to be loaded
      await new Promise<void>((resolve) => {
        const handleCanPlay = () => {
          audio.removeEventListener("canplay", handleCanPlay);
          resolve();
        };
        audio.addEventListener("canplay", handleCanPlay);
      });

      // Seek to start time
      if (seekTo > 0 && Number.isFinite(seekTo)) {
        audio.currentTime = seekTo;
      }
    }

    setIsLoading(false);

    if (autoPlay) {
      void playInternal("auto");
    }

    // Clear preload cache if this was preloaded
    if (preloadedSrcRef.current === audioUrl) {
      preloadedSrcRef.current = null;
    }
  }, [autoPlay, currentAudioUrl, playInternal]);

  /**
   * Play
   */
  const play = useCallback(() => {
    void playInternal("user");
  }, [playInternal]);

  /**
   * Pause
   */
  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  }, []);

  /**
   * Toggle play/pause
   */
  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      void play();
    }
  }, [isPlaying, pause, play]);

  /**
   * Changer le volume (0-100)
   */
  const setVolume = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(100, newVolume));
    setVolumeState(clamped);

    if (clamped === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
      previousVolumeRef.current = clamped;
    }

    if (audioRef.current) {
      audioRef.current.volume = clamped / 100;
    }
  }, []);

  /**
   * Toggle mute
   */
  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(previousVolumeRef.current || 70);
    } else {
      previousVolumeRef.current = volume || 70;
      setVolume(0);
    }
  }, [isMuted, volume, setVolume]);

  /**
   * Seek à une position (0-100%)
   */
  const seek = useCallback((position: number) => {
    if (noSeek || !audioRef.current || !Number.isFinite(duration)) return;

    const clampedPosition = Math.max(0, Math.min(100, position));
    const seconds = (clampedPosition / 100) * duration;

    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  }, [duration, noSeek]);

  /**
   * Précharger une piste (pour réduire le temps de chargement)
   */
  const preloadTrack = useCallback((audioUrl: string) => {
    if (!audioUrl || preloadedSrcRef.current === audioUrl) {
      return;
    }

    if (!preloadRef.current) {
      preloadRef.current = createAudioElement();
      preloadRef.current.volume = 0;
    }

    const preloadAudio = preloadRef.current;
    preloadAudio.src = audioUrl;
    preloadAudio.load();
    preloadedSrcRef.current = audioUrl;
  }, []);

  /**
   * Reset le player
   */
  const reset = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.src = "";
    }

    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setCurrentAudioUrl(null);
    setIsLoading(false);
  }, []);

  // Cleanup preload on unmount
  useEffect(() => {
    return () => {
      if (preloadRef.current) {
        preloadRef.current.src = "";
        preloadRef.current = null;
      }
    };
  }, []);

  // Calculate progress (0-100)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
    // State
    audioRef,
    isPlaying,
    volume,
    isMuted,
    progress,
    duration,
    currentTime,
    isLoading,
    error,
    currentAudioUrl,
    noSeek,

    // Actions
    play,
    pause,
    togglePlay,
    setVolume,
    toggleMute,
    seek,
    loadTrack,
    preloadTrack,
    reset,
  };
};

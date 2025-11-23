"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { formatTime } from "@/utils/formatters";

const createAudioElement = () => {
  const audio = new Audio();
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  return audio;
};

export const useAudioPlayer = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const preloadedSrcRef = useRef<string | null>(null);

  const [currentSrc, setCurrentSrc] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(70);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState<string | null>(null);

  const previousVolumeRef = useRef(volume);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const audio = createAudioElement();
    audio.volume = volume / 100;
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(Number.isFinite(audio.duration) ? audio.duration : 0);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => {
      setAudioError("Impossible de lire l'extrait audio.");
      setIsPlaying(false);
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);

    return () => {
      audio.pause();
      audio.src = "";
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("error", handleError);
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
    }
  }, [volume]);

  const loadTrack = useCallback(
    async (src: string, autoplay = false) => {
      const audio = audioRef.current;
      if (!audio || !src) return;

      setAudioError(null);

      const shouldReload = !audio.src || currentSrc !== src;
      if (shouldReload) {
        audio.pause();
        setIsPlaying(false);
        setCurrentSrc(src);
        setCurrentTime(0);
        setDuration(0);
        audio.src = src;
        audio.load();
      }

      if (autoplay || (audio.paused && !shouldReload)) {
        try {
          await audio.play();
          setIsPlaying(true);
        } catch (error) {
          setIsPlaying(false);
          setAudioError("Impossible de demarrer la lecture audio.");
          if (process.env.NODE_ENV === "development") {
            console.warn("Audio playback error:", error);
          }
        }
      }

      if (preloadedSrcRef.current === src) {
        preloadedSrcRef.current = null;
      }
    },
    [currentSrc]
  );

  const prepareTrack = useCallback(
    async (src: string) => {
      if (!src) return;
      await loadTrack(src, false);
    },
    [loadTrack]
  );

  const handlePlayPause = useCallback(
    (src?: string) => {
      const audio = audioRef.current;
      if (!audio) {
        return;
      }

      if (src && src !== currentSrc) {
        void loadTrack(src, true);
        return;
      }

      if (!currentSrc && src) {
        void loadTrack(src, true);
        return;
      }

      if (audio.paused) {
        void loadTrack(currentSrc || src || "", true);
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    },
    [currentSrc, loadTrack]
  );

  const handleVolumeChange = useCallback((newVolume: number) => {
    const clamped = Math.max(0, Math.min(100, newVolume));
    setVolume(clamped);
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

  const toggleMute = useCallback(() => {
    if (isMuted) {
      handleVolumeChange(previousVolumeRef.current || 70);
    } else {
      previousVolumeRef.current = volume || 70;
      handleVolumeChange(0);
    }
  }, [handleVolumeChange, isMuted, volume]);

  const handleSeek = useCallback((seconds: number) => {
    if (audioRef.current && Number.isFinite(seconds)) {
      audioRef.current.currentTime = Math.max(0, Math.min(seconds, duration || 0));
      setCurrentTime(audioRef.current.currentTime);
    }
  }, [duration]);

  const handleProgressClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!duration) return;
      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = clickX / rect.width;
      handleSeek(percentage * duration);
    },
    [duration, handleSeek]
  );

  const resetPlayer = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(null);
  }, []);

  const preloadTrack = useCallback((src: string) => {
    if (!src || preloadedSrcRef.current === src) {
      return;
    }

    if (!preloadRef.current) {
      preloadRef.current = createAudioElement();
      preloadRef.current.volume = 0;
    }

    const preloadAudio = preloadRef.current;
    preloadAudio.src = src;
    preloadAudio.load();
    preloadedSrcRef.current = src;
  }, []);

  useEffect(() => {
    return () => {
      if (preloadRef.current) {
        preloadRef.current.src = "";
        preloadRef.current = null;
      }
    };
  }, []);

  return {
    isPlaying,
    volume,
    currentTime,
    duration,
    isMuted,
    audioError,
    currentSrc,
    handlePlayPause,
    handleVolumeChange,
    toggleMute,
    handleSeek,
    handleProgressClick,
    resetPlayer,
    preloadTrack,
    prepareTrack,
    formatTime,
  };
};

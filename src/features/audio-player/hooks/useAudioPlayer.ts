"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { UseAudioPlayerOptions, UseAudioPlayerReturn } from "../types";

const DEFAULT_VOLUME = 70;
const MIN_VOLUME = 0;
const MAX_VOLUME = 100;

const clampVolume = (value: number) => Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, value));

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
    initialVolume = DEFAULT_VOLUME,
    noSeek = false,
    onEnded,
    onError,
    onReady,
  } = options;

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const preloadRef = useRef<HTMLAudioElement | null>(null);
  const preloadedSrcRef = useRef<string | null>(null);
  const previousVolumeRef = useRef(initialVolume);

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

  useEffect(() => {
    const audio = createAudioElement();
    audio.volume = clampVolume(initialVolume) / MAX_VOLUME;
    audioRef.current = audio;

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

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("error", handleError);
    audio.addEventListener("loadstart", handleLoadStart);

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

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = clampVolume(volume) / MAX_VOLUME;
    }
  }, [volume]);

  useEffect(() => {
    if (initialAudioUrl) {
      void loadTrack(initialAudioUrl, startTime);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

        const errorMsg = "Impossible de demarrer la lecture audio.";
        setError(errorMsg);
        onError?.(errorMsg);
        return false;
      }
    },
    [onError]
  );

  const loadTrack = useCallback(
    async (audioUrl: string, seekTo: number = 0): Promise<void> => {
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

        await new Promise<void>((resolve) => {
          const handleCanPlay = () => {
            audio.removeEventListener("canplay", handleCanPlay);
            resolve();
          };
          audio.addEventListener("canplay", handleCanPlay);
        });

        if (seekTo > 0 && Number.isFinite(seekTo)) {
          audio.currentTime = seekTo;
        }
      }

      setIsLoading(false);

      if (autoPlay) {
        void playInternal("auto");
      }

      if (preloadedSrcRef.current === audioUrl) {
        preloadedSrcRef.current = null;
      }
    },
    [autoPlay, currentAudioUrl, playInternal]
  );

  const play = useCallback(() => {
    void playInternal("user");
  }, [playInternal]);

  const pause = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    setIsPlaying(false);
  }, []);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      void play();
    }
  }, [isPlaying, pause, play]);

  const setVolume = useCallback((newVolume: number) => {
    const clamped = clampVolume(newVolume);
    setVolumeState(clamped);

    if (clamped === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
      previousVolumeRef.current = clamped;
    }

    if (audioRef.current) {
      audioRef.current.volume = clamped / MAX_VOLUME;
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (isMuted) {
      setVolume(previousVolumeRef.current || DEFAULT_VOLUME);
    } else {
      previousVolumeRef.current = volume || DEFAULT_VOLUME;
      setVolume(0);
    }
  }, [isMuted, volume, setVolume]);

  const seek = useCallback(
    (position: number) => {
      if (noSeek || !audioRef.current || !Number.isFinite(duration)) return;

      const clampedPosition = clampVolume(position);
      const seconds = (clampedPosition / 100) * duration;

      audioRef.current.currentTime = seconds;
      setCurrentTime(seconds);
    },
    [duration, noSeek]
  );

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

  useEffect(() => {
    return () => {
      if (preloadRef.current) {
        preloadRef.current.src = "";
        preloadRef.current = null;
      }
    };
  }, []);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return {
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

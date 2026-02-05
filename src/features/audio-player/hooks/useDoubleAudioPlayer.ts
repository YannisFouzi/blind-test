import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

interface UseDoubleAudioPlayerOptions {
  autoPlay?: boolean;
  noSeek?: boolean;
  initialVolume?: number;
  onEnded?: () => void;
  onError?: (error: string) => void;
}

export interface UseDoubleAudioPlayerReturn {
  primaryRef: RefObject<HTMLAudioElement | null>;
  secondaryRef: RefObject<HTMLAudioElement | null>;

  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  currentTime: number;
  duration: number;
  progress: number;
  isLoading: boolean;
  error: string | null;
  noSeek: boolean;

  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seek: (position: number) => void;
  loadTracks: (primaryUrl: string | null, secondaryUrl: string | null) => Promise<void>;
  reset: () => void;
}

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

const isAutoplayBlockedError = (err: unknown) =>
  typeof err === "object" &&
  err !== null &&
  "name" in err &&
  (err as { name?: string }).name === "NotAllowedError";

export const useDoubleAudioPlayer = (
  options: UseDoubleAudioPlayerOptions = {}
): UseDoubleAudioPlayerReturn => {
  const {
    autoPlay = false,
    noSeek = false,
    initialVolume = DEFAULT_VOLUME,
    onEnded,
    onError,
  } = options;

  const primaryRef = useRef<HTMLAudioElement | null>(null);
  const secondaryRef = useRef<HTMLAudioElement | null>(null);
  const primaryDurationRef = useRef(0);
  const secondaryDurationRef = useRef(0);
  const lastLoadedRef = useRef<{ primary: string; secondary: string } | null>(null);
  const needsReloadRef = useRef(false);
  const hadErrorRef = useRef(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(initialVolume);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const primary = createAudioElement();
    const secondary = createAudioElement();

    const normalizedVolume = clampVolume(initialVolume) / MAX_VOLUME;
    primary.volume = normalizedVolume;
    secondary.volume = normalizedVolume;

    primaryRef.current = primary;
    secondaryRef.current = secondary;

    const handleTimeUpdate = () => {
      const t1 = primary.currentTime || 0;
      const t2 = secondary.currentTime || 0;
      setCurrentTime(Math.max(t1, t2));
    };

    const handleLoadedMetadata = () => {
      const d1 = Number.isFinite(primary.duration) ? primary.duration : 0;
      const d2 = Number.isFinite(secondary.duration) ? secondary.duration : 0;
      primaryDurationRef.current = d1;
      secondaryDurationRef.current = d2;
      setDuration(Math.max(d1, d2));
      setIsLoading(false);
    };

    const handleEnded = () => {
      const p = primaryRef.current;
      const s = secondaryRef.current;
      if (p && s && p.ended && s.ended) {
        setIsPlaying(false);
        onEnded?.();
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };

    const handlePause = () => {
      const isPrimaryPlaying = !(primary.paused || primary.ended);
      const isSecondaryPlaying = !(secondary.paused || secondary.ended);
      if (!isPrimaryPlaying && !isSecondaryPlaying) {
        setIsPlaying(false);
      }
    };

    const handleError = () => {
      const errorMsg = "Impossible de lire les extraits audio.";
      setError(errorMsg);
      setIsPlaying(false);
      setIsLoading(false);
      onError?.(errorMsg);
      hadErrorRef.current = true;
      needsReloadRef.current = true;
    };

    const handleLoadStart = () => {
      setIsLoading(true);
    };

    primary.addEventListener("timeupdate", handleTimeUpdate);
    secondary.addEventListener("timeupdate", handleTimeUpdate);
    primary.addEventListener("loadedmetadata", handleLoadedMetadata);
    secondary.addEventListener("loadedmetadata", handleLoadedMetadata);
    primary.addEventListener("ended", handleEnded);
    secondary.addEventListener("ended", handleEnded);
    primary.addEventListener("play", handlePlay);
    secondary.addEventListener("play", handlePlay);
    primary.addEventListener("pause", handlePause);
    secondary.addEventListener("pause", handlePause);
    primary.addEventListener("error", handleError);
    secondary.addEventListener("error", handleError);
    primary.addEventListener("loadstart", handleLoadStart);
    secondary.addEventListener("loadstart", handleLoadStart);

    return () => {
      primary.pause();
      secondary.pause();
      primary.src = "";
      secondary.src = "";

      primary.removeEventListener("timeupdate", handleTimeUpdate);
      secondary.removeEventListener("timeupdate", handleTimeUpdate);
      primary.removeEventListener("loadedmetadata", handleLoadedMetadata);
      secondary.removeEventListener("loadedmetadata", handleLoadedMetadata);
      primary.removeEventListener("ended", handleEnded);
      secondary.removeEventListener("ended", handleEnded);
      primary.removeEventListener("play", handlePlay);
      secondary.removeEventListener("play", handlePlay);
      primary.removeEventListener("pause", handlePause);
      secondary.removeEventListener("pause", handlePause);
      primary.removeEventListener("error", handleError);
      secondary.removeEventListener("error", handleError);
      primary.removeEventListener("loadstart", handleLoadStart);
      secondary.removeEventListener("loadstart", handleLoadStart);
    };
  }, [initialVolume, onEnded, onError]);

  useEffect(() => {
    const normalizedVolume = clampVolume(volume) / MAX_VOLUME;
    if (primaryRef.current) primaryRef.current.volume = normalizedVolume;
    if (secondaryRef.current) secondaryRef.current.volume = normalizedVolume;
  }, [volume]);

  const playInternal = useCallback(
    async (mode: "user" | "auto") => {
      const primary = primaryRef.current;
      const secondary = secondaryRef.current;
      if (!primary || !secondary) return false;

      try {
        const playPromises: Promise<void>[] = [];

        const primaryDuration = primaryDurationRef.current || primary.duration || 0;
        const secondaryDuration = secondaryDurationRef.current || secondary.duration || 0;

        const canPlayPrimary =
          primaryDuration === 0 || primary.currentTime < primaryDuration - 0.05;
        const canPlaySecondary =
          secondaryDuration === 0 || secondary.currentTime < secondaryDuration - 0.05;

        if (canPlayPrimary) {
          playPromises.push(primary.play());
        }
        if (canPlaySecondary) {
          playPromises.push(secondary.play());
        }

        if (!playPromises.length) {
          setIsPlaying(false);
          return false;
        }

        await Promise.all(playPromises);

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

  const loadTracks = useCallback(
    async (primaryUrl: string | null, secondaryUrl: string | null): Promise<void> => {
      const primary = primaryRef.current;
      const secondary = secondaryRef.current;
      if (!primary || !secondary) return;

      const currentPrimarySrc = primary.currentSrc || primary.src;
      const currentSecondarySrc = secondary.currentSrc || secondary.src;
      const normalizedPrimary = primaryUrl || "";
      const normalizedSecondary = secondaryUrl || "";
      const lastLoaded = lastLoadedRef.current;
      const sameAsLast =
        lastLoaded?.primary === normalizedPrimary && lastLoaded?.secondary === normalizedSecondary;
      const hasElementError = Boolean(primary.error || secondary.error);

      if (sameAsLast && !needsReloadRef.current && !hasElementError && !hadErrorRef.current) {
        return;
      }

      setError(null);
      setIsLoading(true);
      hadErrorRef.current = false;
      needsReloadRef.current = false;
      primary.pause();
      secondary.pause();

      lastLoadedRef.current = { primary: normalizedPrimary, secondary: normalizedSecondary };
      primary.src = primaryUrl || "";
      secondary.src = secondaryUrl || "";

      if (primaryUrl) {
        primary.load();
      }
      if (secondaryUrl) {
        secondary.load();
      }

      await new Promise<void>((resolve) => {
        let readyCount = 0;
        const tryResolve = () => {
          readyCount += 1;
          if (readyCount >= 1) {
            primary.removeEventListener("canplay", tryResolve);
            secondary.removeEventListener("canplay", tryResolve);
            resolve();
          }
        };
        primary.addEventListener("canplay", tryResolve);
        secondary.addEventListener("canplay", tryResolve);
      });

      setIsLoading(false);
      if (autoPlay && (primaryUrl || secondaryUrl)) {
        void playInternal("auto");
      }
    },
    [autoPlay, playInternal]
  );

  const play = useCallback(() => {
    void playInternal("user");
  }, [playInternal]);

  const pause = useCallback(() => {
    const primary = primaryRef.current;
    const secondary = secondaryRef.current;
    if (!primary || !secondary) return;
    primary.pause();
    secondary.pause();
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
    setIsMuted(clamped === 0);
  }, []);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
    setVolumeState((prev) => (prev === 0 ? DEFAULT_VOLUME : 0));
  }, []);

  const seek = useCallback(
    (position: number) => {
      if (noSeek || !Number.isFinite(duration)) return;
      const primary = primaryRef.current;
      const secondary = secondaryRef.current;
      if (!primary || !secondary) return;

      const clampedPosition = clampVolume(position);
      const seconds = (clampedPosition / 100) * duration;

      primary.currentTime = seconds;
      secondary.currentTime = seconds;
      setCurrentTime(seconds);

      if (isPlaying) {
        void playInternal("user");
      }
    },
    [duration, isPlaying, noSeek, playInternal]
  );

  const reset = useCallback(() => {
    const primary = primaryRef.current;
    const secondary = secondaryRef.current;
    if (primary) {
      primary.pause();
      primary.currentTime = 0;
      primary.src = "";
      primary.load();
    }
    if (secondary) {
      secondary.pause();
      secondary.currentTime = 0;
      secondary.src = "";
      secondary.load();
    }
    lastLoadedRef.current = null;
    needsReloadRef.current = false;
    hadErrorRef.current = false;
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
    setIsLoading(false);
  }, []);

  const progress = useMemo(
    () => (duration > 0 ? (currentTime / duration) * 100 : 0),
    [currentTime, duration]
  );

  return {
    primaryRef,
    secondaryRef,
    isPlaying,
    isMuted,
    volume,
    currentTime,
    duration,
    progress,
    isLoading,
    error,
    noSeek,
    play,
    pause,
    togglePlay,
    setVolume,
    toggleMute,
    seek,
    loadTracks,
    reset,
  };
};

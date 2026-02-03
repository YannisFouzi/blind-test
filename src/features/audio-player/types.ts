export interface AudioPlayerState {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  progress: number;
  duration: number;
  currentTime: number;
  isLoading: boolean;
  error: string | null;
  currentAudioUrl: string | null;
  noSeek: boolean;
}

export interface AudioPlayerActions {
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  seek: (position: number) => void;
  loadTrack: (audioUrl: string, startTime?: number) => Promise<void>;
  preloadTrack: (audioUrl: string) => void;
  reset: () => void;
}

export interface UseAudioPlayerReturn extends AudioPlayerState, AudioPlayerActions {
  audioRef: React.RefObject<HTMLAudioElement | null>;
}

export interface UseAudioPlayerOptions {
  initialAudioUrl?: string;
  startTime?: number;
  autoPlay?: boolean;
  initialVolume?: number;
  noSeek?: boolean;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onReady?: () => void;
}

export interface AudioTimeFormat {
  minutes: number;
  seconds: number;
  formatted: string;
}

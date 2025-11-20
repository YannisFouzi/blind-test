import type { Options, YouTubePlayer as RawPlayer } from "youtube-player/dist/types";

export type YouTubePlayer = RawPlayer;

export type YouTubePlayerOptions = Options;

export type YouTubeEvent<T = number> = {
  data: T;
  target: RawPlayer;
};

export type YouTubeController = {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  cueVideoById: (videoId: string) => void;
  loadVideoById: (videoId: string) => void;
};

export const coerceYouTubeController = (player: RawPlayer): YouTubeController => {
  return player as unknown as YouTubeController;
};

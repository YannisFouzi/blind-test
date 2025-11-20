import type { Options, YouTubePlayer as Player } from "youtube-player/dist/types";

export type YouTubePlayer = Player;

export type YouTubeEvent<T = number> = {
  data: T;
  target: Player;
};

export type LegacyYouTubePlayer = {
  playVideo: () => void;
  pauseVideo: () => void;
  setVolume: (volume: number) => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
  cueVideoById: (videoId: string) => void;
  loadVideoById: (videoId: string) => void;
};

export type LegacyPreloadPlayer = Pick<
  LegacyYouTubePlayer,
  "cueVideoById" | "loadVideoById" | "playVideo" | "pauseVideo" | "setVolume"
>;

export type YouTubePlayerOptions = Options;

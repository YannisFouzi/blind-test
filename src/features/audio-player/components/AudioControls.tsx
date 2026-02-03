import { memo } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "./ProgressBar";
import { VolumeControl } from "./VolumeControl";
import type { UseAudioPlayerReturn } from "../types";

export interface AudioControlsProps
  extends Pick<
    UseAudioPlayerReturn,
    | "isPlaying"
    | "volume"
    | "isMuted"
    | "progress"
    | "duration"
    | "currentTime"
    | "isLoading"
    | "error"
    | "noSeek"
    | "togglePlay"
    | "setVolume"
    | "toggleMute"
    | "seek"
  > {
  disabled?: boolean;
  className?: string;
  showVolumeControl?: boolean;
  showProgressBar?: boolean;
  compact?: boolean;
}

const PlayPauseIcon = ({ isLoading, isPlaying }: { isLoading: boolean; isPlaying: boolean }) => {
  if (isLoading) {
    return <Loader2 className="w-7 h-7 text-[#1B1B1B] animate-spin" />;
  }
  if (isPlaying) {
    return <Pause className="w-7 h-7 text-[#1B1B1B]" />;
  }
  return <Play className="w-7 h-7 text-[#1B1B1B] ml-1" />;
};

const CompactPlayPauseIcon = ({
  isLoading,
  isPlaying,
}: {
  isLoading: boolean;
  isPlaying: boolean;
}) => {
  if (isLoading) {
    return <Loader2 className="w-6 h-6 text-[#1B1B1B] animate-spin" />;
  }
  if (isPlaying) {
    return <Pause className="w-6 h-6 text-[#1B1B1B]" />;
  }
  return <Play className="w-6 h-6 text-[#1B1B1B] ml-1" />;
};

const AudioControlsComponent = ({
  isPlaying,
  volume,
  isMuted,
  progress,
  duration,
  currentTime,
  isLoading,
  error,
  noSeek,
  togglePlay,
  setVolume,
  toggleMute,
  seek,
  disabled = false,
  className,
  showVolumeControl = true,
  showProgressBar = true,
  compact = false,
}: AudioControlsProps) => {
  if (compact) {
    return (
      <button
        onClick={togglePlay}
        disabled={disabled || isLoading}
        className={cn(
          "magic-button flex items-center justify-center w-12 h-12 rounded-full",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all",
          className
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        <CompactPlayPauseIcon isLoading={isLoading} isPlaying={isPlaying} />
      </button>
    );
  }

  return (
    <Card surface="elevated" className={cn("p-4", className)}>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {showProgressBar && (
        <ProgressBar
          progress={progress}
          duration={duration}
          currentTime={currentTime}
          onSeek={seek}
          disabled={disabled || noSeek}
          className="mb-4"
        />
      )}

      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          disabled={disabled || isLoading}
          className={cn(
            "magic-button flex items-center justify-center w-14 h-14 rounded-full",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all",
            "focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2 focus:ring-offset-[var(--color-surface-base)]"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          <PlayPauseIcon isLoading={isLoading} isPlaying={isPlaying} />
        </button>

        {showVolumeControl && (
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={setVolume}
            onToggleMute={toggleMute}
            className="flex-1"
          />
        )}
      </div>

      {noSeek && showProgressBar && (
        <p className="mt-3 text-xs text-[var(--color-text-secondary)] text-center">
          Mode decouverte : le curseur de lecture est desactive
        </p>
      )}
    </Card>
  );
};

export const AudioControls = memo(AudioControlsComponent);
AudioControls.displayName = "AudioControls";

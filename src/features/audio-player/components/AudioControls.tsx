import { cn } from "@/lib/utils";
import { Pause, Play, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { ProgressBar } from "./ProgressBar";
import { VolumeControl } from "./VolumeControl";
import type { UseAudioPlayerReturn } from "../types";
import { memo } from "react";

/**
 * AudioControls Component
 *
 * Contrôles complets du lecteur audio.
 * Utilise les composants Card, ProgressBar, VolumeControl.
 *
 * @example
 * ```tsx
 * const audio = useAudioPlayer({ initialAudioUrl: "/song.mp3" });
 *
 * <AudioControls {...audio} />
 * ```
 */

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
  /** Désactivé */
  disabled?: boolean;

  /** Classes CSS additionnelles */
  className?: string;

  /** Afficher les contrôles de volume */
  showVolumeControl?: boolean;

  /** Afficher la barre de progression */
  showProgressBar?: boolean;

  /** Compact mode (bouton play/pause uniquement) */
  compact?: boolean;
}

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
    // Mode compact : bouton play/pause uniquement
    return (
      <button
        onClick={togglePlay}
        disabled={disabled || isLoading}
        className={cn(
          "flex items-center justify-center w-12 h-12 rounded-full",
          "bg-gradient-to-r from-purple-500 to-pink-500",
          "hover:from-purple-600 hover:to-pink-600",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          "transition-all shadow-lg hover:shadow-xl",
          className
        )}
        aria-label={isPlaying ? "Pause" : "Play"}
      >
        {isLoading ? (
          <Loader2 className="w-6 h-6 text-white animate-spin" />
        ) : isPlaying ? (
          <Pause className="w-6 h-6 text-white" />
        ) : (
          <Play className="w-6 h-6 text-white ml-1" />
        )}
      </button>
    );
  }

  // Mode complet
  return (
    <Card surface="elevated" className={cn("p-4", className)}>
      {/* Message d'erreur */}
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Barre de progression */}
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

      {/* Contrôles principaux */}
      <div className="flex items-center gap-4">
        {/* Bouton Play/Pause */}
        <button
          onClick={togglePlay}
          disabled={disabled || isLoading}
          className={cn(
            "flex items-center justify-center w-14 h-14 rounded-full",
            "bg-gradient-to-r from-purple-500 to-pink-500",
            "hover:from-purple-600 hover:to-pink-600",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            "transition-all shadow-lg hover:shadow-xl",
            "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-[var(--color-surface-elevated)]"
          )}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isLoading ? (
            <Loader2 className="w-7 h-7 text-white animate-spin" />
          ) : isPlaying ? (
            <Pause className="w-7 h-7 text-white" />
          ) : (
            <Play className="w-7 h-7 text-white ml-1" />
          )}
        </button>

        {/* Contrôle de volume */}
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

      {/* Note no-seek */}
      {noSeek && showProgressBar && (
        <p className="mt-3 text-xs text-gray-500 text-center">
          Mode découverte : le curseur de lecture est désactivé
        </p>
      )}
    </Card>
  );
};

export const AudioControls = memo(AudioControlsComponent);
AudioControls.displayName = "AudioControls";

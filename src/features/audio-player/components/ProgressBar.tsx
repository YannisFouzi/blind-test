import { cn } from "@/lib/utils";
import { memo, useCallback, type HTMLAttributes } from "react";

/**
 * ProgressBar Component
 *
 * Barre de progression pour le lecteur audio.
 *
 * @example
 * ```tsx
 * <ProgressBar
 *   progress={45}
 *   duration={180}
 *   currentTime={81}
 *   onSeek={(position) => seek(position)}
 *   disabled={noSeek}
 * />
 * ```
 */

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSeek"> {
  /** Progression (0-100) */
  progress: number;

  /** Durée totale en secondes */
  duration: number;

  /** Temps actuel en secondes */
  currentTime: number;

  /** Callback quand l'utilisateur clique sur la barre */
  onSeek?: (position: number) => void;

  /** Désactivé (no-seek mode) */
  disabled?: boolean;

  /** Classes CSS additionnelles */
  className?: string;
}

/**
 * Formate le temps en MM:SS
 */
const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const ProgressBarComponent = ({
  progress,
  duration,
  currentTime,
  onSeek,
  disabled = false,
  className,
  ...props
}: ProgressBarProps) => {
  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !onSeek) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const clickX = event.clientX - rect.left;
    const percentage = (clickX / rect.width) * 100;
    onSeek(Math.max(0, Math.min(100, percentage)));
  }, [disabled, onSeek]);

  return (
    <div className={cn("space-y-2", className)} {...props}>
      {/* Barre de progression */}
      <div
        className={cn(
          "relative h-2 rounded-full bg-white/10 overflow-hidden",
          !disabled && "cursor-pointer hover:h-3 transition-all"
        )}
        onClick={handleClick}
      >
        {/* Fill */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />

        {/* Glow effect */}
        {progress > 0 && (
          <div
            className="absolute inset-y-0 right-0 w-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            style={{ transform: `translateX(-${100 - progress}%)` }}
          />
        )}
      </div>

      {/* Time display */}
      <div className="flex justify-between text-sm text-gray-400">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export const ProgressBar = memo(ProgressBarComponent);
ProgressBar.displayName = "ProgressBar";

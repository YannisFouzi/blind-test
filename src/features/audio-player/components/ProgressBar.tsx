import { memo, useCallback, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const clampPercentage = (value: number) => Math.max(0, Math.min(100, value));

const formatTime = (seconds: number): string => {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export interface ProgressBarProps extends Omit<HTMLAttributes<HTMLDivElement>, "onSeek"> {
  progress: number;
  duration: number;
  currentTime: number;
  onSeek?: (position: number) => void;
  disabled?: boolean;
  className?: string;
}

const ProgressBarComponent = ({
  progress,
  duration,
  currentTime,
  onSeek,
  disabled = false,
  className,
  ...props
}: ProgressBarProps) => {
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (disabled || !onSeek) return;

      const rect = event.currentTarget.getBoundingClientRect();
      const clickX = event.clientX - rect.left;
      const percentage = (clickX / rect.width) * 100;
      onSeek(clampPercentage(percentage));
    },
    [disabled, onSeek]
  );

  const clampedProgress = clampPercentage(progress);

  return (
    <div className={cn("space-y-2", className)} {...props}>
      <div
        className={cn(
          "relative h-2 rounded-full bg-white border-2 border-black shadow-[2px_2px_0_#1B1B1B] overflow-hidden",
          !disabled && "cursor-pointer"
        )}
        onClick={handleClick}
      >
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full transition-all"
          style={{ width: `${clampedProgress}%` }}
        />

        {clampedProgress > 0 && (
          <div
            className="absolute inset-y-0 right-0 w-2 bg-black/20 rounded-full"
            style={{ transform: `translateX(-${100 - clampedProgress}%)` }}
          />
        )}
      </div>

      <div className="flex justify-between text-sm text-[var(--color-text-secondary)]">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
};

export const ProgressBar = memo(ProgressBarComponent);
ProgressBar.displayName = "ProgressBar";

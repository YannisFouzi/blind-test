import { memo, useCallback, type HTMLAttributes } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { pressable } from "@/styles/ui";

const MIN_VOLUME = 0;
const MAX_VOLUME = 100;

export interface VolumeControlProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onVolumeChange"> {
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  className?: string;
}

const clampVolume = (value: number) => Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, value));

const VolumeControlComponent = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  className,
  ...props
}: VolumeControlProps) => {
  const handleSliderChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newVolume = clampVolume(Number(event.target.value));
      onVolumeChange(newVolume);
    },
    [onVolumeChange]
  );

  const displayVolume = isMuted ? 0 : volume;

  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      <button
        onClick={onToggleMute}
        className={cn(
          "p-2 rounded-lg text-[var(--color-text-primary)] bg-white hover:bg-[var(--color-surface-overlay)]",
          pressable
        )}
        aria-label={isMuted ? "Activer le son" : "Couper le son"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>

      <div className="relative flex-1 h-2 max-w-[100px]">
        <input
          type="range"
          min={MIN_VOLUME}
          max={MAX_VOLUME}
          value={displayVolume}
          onChange={handleSliderChange}
          className={cn(
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "bg-white border-2 border-black shadow-[2px_2px_0_#1B1B1B]",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-black",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:shadow-[2px_2px_0_#1B1B1B]",
            "[&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-black",
            "[&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:cursor-pointer"
          )}
          aria-label="Volume"
        />

        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full pointer-events-none"
          style={{ width: `${displayVolume}%` }}
        />
      </div>

      <span className="text-sm text-[var(--color-text-secondary)] w-8 text-right">
        {Math.round(displayVolume)}
      </span>
    </div>
  );
};

export const VolumeControl = memo(VolumeControlComponent);
VolumeControl.displayName = "VolumeControl";

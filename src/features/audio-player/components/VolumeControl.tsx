import { memo, useCallback, type HTMLAttributes } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { cn } from "@/lib/utils";
import { RangeSlider } from "@/components/ui";
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
    (nextVolume: number) => {
      const newVolume = clampVolume(nextVolume);
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

      <RangeSlider
        min={MIN_VOLUME}
        max={MAX_VOLUME}
        value={displayVolume}
        onValueChange={handleSliderChange}
        variant="compact"
        className="flex-1 max-w-[100px]"
        aria-label="Volume"
      />

      <span className="text-sm text-[var(--color-text-secondary)] w-8 text-right">
        {Math.round(displayVolume)}
      </span>
    </div>
  );
};

export const VolumeControl = memo(VolumeControlComponent);
VolumeControl.displayName = "VolumeControl";

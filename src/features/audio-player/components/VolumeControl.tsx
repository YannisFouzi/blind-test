import { cn } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { memo, useCallback, type HTMLAttributes } from "react";

/**
 * VolumeControl Component
 *
 * Contrôle de volume avec slider et bouton mute.
 *
 * @example
 * ```tsx
 * <VolumeControl
 *   volume={70}
 *   isMuted={false}
 *   onVolumeChange={(vol) => setVolume(vol)}
 *   onToggleMute={() => toggleMute()}
 * />
 * ```
 */

export interface VolumeControlProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "onVolumeChange"> {
  /** Volume actuel (0-100) */
  volume: number;

  /** Est muet */
  isMuted: boolean;

  /** Callback changement de volume */
  onVolumeChange: (volume: number) => void;

  /** Callback toggle mute */
  onToggleMute: () => void;

  /** Classes CSS additionnelles */
  className?: string;
}

const VolumeControlComponent = ({
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  className,
  ...props
}: VolumeControlProps) => {
  const handleSliderChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(event.target.value);
    onVolumeChange(newVolume);
  }, [onVolumeChange]);

  const displayVolume = isMuted ? 0 : volume;

  return (
    <div className={cn("flex items-center gap-2", className)} {...props}>
      {/* Bouton Mute/Unmute */}
      <button
        onClick={onToggleMute}
        className="p-2 rounded-lg hover:bg-white/10 transition-colors text-white"
        aria-label={isMuted ? "Activer le son" : "Couper le son"}
      >
        {isMuted ? (
          <VolumeX className="w-5 h-5" />
        ) : (
          <Volume2 className="w-5 h-5" />
        )}
      </button>

      {/* Slider */}
      <div className="relative flex-1 h-2 max-w-[100px]">
        <input
          type="range"
          min="0"
          max="100"
          value={displayVolume}
          onChange={handleSliderChange}
          className={cn(
            "w-full h-2 rounded-full appearance-none cursor-pointer",
            "bg-white/10",
            "[&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:w-4",
            "[&::-webkit-slider-thumb]:h-4",
            "[&::-webkit-slider-thumb]:rounded-full",
            "[&::-webkit-slider-thumb]:bg-white",
            "[&::-webkit-slider-thumb]:cursor-pointer",
            "[&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(255,255,255,0.5)]",
            "[&::-moz-range-thumb]:w-4",
            "[&::-moz-range-thumb]:h-4",
            "[&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:bg-white",
            "[&::-moz-range-thumb]:border-0",
            "[&::-moz-range-thumb]:cursor-pointer"
          )}
          aria-label="Volume"
        />

        {/* Visual fill */}
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full pointer-events-none"
          style={{ width: `${displayVolume}%` }}
        />
      </div>

      {/* Volume percentage */}
      <span className="text-sm text-gray-400 w-8 text-right">
        {Math.round(displayVolume)}
      </span>
    </div>
  );
};

export const VolumeControl = memo(VolumeControlComponent);
VolumeControl.displayName = "VolumeControl";

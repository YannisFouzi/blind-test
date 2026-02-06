import { memo, type MouseEventHandler } from "react";
import {
  Check,
  Pause,
  Play as PlayIcon,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { pressable } from "@/styles/ui";
import styles from "./GameUi.module.css";

type PlayerDomeProps = {
  currentTimeLabel: string;
  durationLabel: string;
  isPlaying: boolean;
  playbackUnavailable: boolean;
  onTogglePlay: () => void;
  canGoPrev?: boolean;
  onPrev?: () => void;
  canGoNext?: boolean;
  onNext?: () => void;
  isReverseMode: boolean;
  isDoubleMode: boolean;
  progress: number;
  onTimelineClick: MouseEventHandler<HTMLDivElement>;
  roundLabel: string;
  correctCount: number;
  incorrectCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
  volume: number;
  onVolumeBarClick: MouseEventHandler<HTMLDivElement>;
};

const PlayerDomeComponent = ({
  currentTimeLabel,
  durationLabel,
  isPlaying,
  playbackUnavailable,
  onTogglePlay,
  canGoPrev = false,
  onPrev,
  canGoNext = false,
  onNext,
  isReverseMode,
  isDoubleMode,
  progress,
  onTimelineClick,
  roundLabel,
  correctCount,
  incorrectCount,
  isMuted,
  onToggleMute,
  volume,
  onVolumeBarClick,
}: PlayerDomeProps) => {
  const hasNavigation = Boolean(onPrev && onNext);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none" data-testid="player-dome">
      <div
        className={cn(
          styles.playerDome,
          "mx-auto w-[calc(100%-1.5rem)] sm:w-[calc(100%-3rem)] max-w-6xl bg-white border-[3px] border-b-0 border-[#1B1B1B] shadow-[0_-6px_0_#1B1B1B] pointer-events-auto overflow-hidden"
        )}
      >
        <div className="px-3 py-2 sm:px-6 sm:py-4">
          <div className="flex flex-col items-center gap-1.5 sm:gap-3">
            <div className={cn(styles.playerControlsCompact, "w-full max-w-4xl")}>
              <div className="flex items-center justify-between w-full text-[var(--color-text-primary)] text-[0.7rem] font-semibold mb-1.5">
                <span className="min-w-[2rem]">{currentTimeLabel}</span>

                <div className="flex items-center gap-2">
                  {hasNavigation && (
                    <button
                      onClick={onPrev}
                      disabled={!canGoPrev}
                      className={cn(
                        "magic-button p-1 rounded-full bg-white hover:bg-[var(--color-surface-overlay)]",
                        styles.playerCompactButton,
                        !canGoPrev && "opacity-60"
                      )}
                    >
                      <SkipBack className="w-3 h-3" />
                    </button>
                  )}

                  <button
                    onClick={onTogglePlay}
                    disabled={playbackUnavailable}
                    className={cn(
                      "magic-button rounded-full p-2",
                      styles.playerCompactButton,
                      playbackUnavailable && "opacity-60 cursor-not-allowed"
                    )}
                  >
                    {isPlaying ? (
                      <Pause className="w-3.5 h-3.5 text-[#1B1B1B]" />
                    ) : (
                      <PlayIcon className="w-3.5 h-3.5 text-[#1B1B1B]" />
                    )}
                  </button>

                  {hasNavigation && (
                    <button
                      onClick={onNext}
                      disabled={!canGoNext}
                      className={cn(
                        "magic-button p-1 rounded-full bg-white hover:bg-[var(--color-surface-overlay)]",
                        styles.playerCompactButton,
                        !canGoNext && "opacity-60"
                      )}
                    >
                      <SkipForward className="w-3 h-3" />
                    </button>
                  )}
                </div>

                <span className="min-w-[2rem] text-right">{durationLabel}</span>
              </div>
            </div>

            <div className={cn(styles.playerControlsStandard, "items-center justify-center gap-4")}>
              {hasNavigation && (
                <button
                  onClick={onPrev}
                  disabled={!canGoPrev}
                  className={cn(
                    "magic-button p-2 rounded-full bg-white hover:bg-[var(--color-surface-overlay)]",
                    !canGoPrev && "opacity-60"
                  )}
                >
                  <SkipBack className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={onTogglePlay}
                disabled={playbackUnavailable}
                className={cn(
                  "magic-button rounded-full p-4",
                  playbackUnavailable && "opacity-60 cursor-not-allowed"
                )}
              >
                {isPlaying ? (
                  <Pause className="w-5 h-5 text-[#1B1B1B]" />
                ) : (
                  <PlayIcon className="w-5 h-5 text-[#1B1B1B]" />
                )}
              </button>

              {hasNavigation && (
                <button
                  onClick={onNext}
                  disabled={!canGoNext}
                  className={cn(
                    "magic-button p-2 rounded-full bg-white hover:bg-[var(--color-surface-overlay)]",
                    !canGoNext && "opacity-60"
                  )}
                >
                  <SkipForward className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="w-full max-w-4xl flex flex-col items-center gap-1.5 sm:gap-3">
              <div
                className={cn(
                  styles.playerDurationsStandard,
                  "items-center justify-between w-full text-[var(--color-text-primary)] text-xs font-semibold"
                )}
              >
                <span>{currentTimeLabel}</span>
                <div className="flex items-center gap-2">
                  {isReverseMode && (
                    <span
                      className={cn(
                        styles.playerReverseCompact,
                        "inline-flex items-center gap-1 rounded-full bg-[#f97316] px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide leading-none text-[#1B1B1B] border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] whitespace-nowrap"
                      )}
                    >
                      <span className="inline-block rotate-180">
                        <PlayIcon className="w-3 h-3" />
                      </span>
                      <span>Reverse</span>
                    </span>
                  )}
                  {isDoubleMode && !isReverseMode && (
                    <span
                      className={cn(
                        styles.playerX2Compact,
                        "inline-flex items-center gap-1 rounded-full bg-[#22c55e] px-3 py-1 text-[0.65rem] font-extrabold uppercase tracking-wide leading-none text-[#1B1B1B] border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] whitespace-nowrap"
                      )}
                    >
                      <span>x2</span>
                      <span>Double</span>
                    </span>
                  )}
                </div>
                <span>{durationLabel}</span>
              </div>

              <div
                className={cn(styles.magicProgressBar, "w-full h-2 sm:h-3 cursor-pointer")}
                onClick={onTimelineClick}
              >
                <div className={cn(styles.magicProgressFill, "h-full")} style={{ width: `${progress}%` }} />
              </div>

              <div className="w-full grid grid-cols-[1fr_auto_1fr] items-center text-xs sm:text-sm gap-2 sm:gap-3 pt-0.5 sm:pt-1">
                <span className="text-[#B45309] font-semibold">{roundLabel}</span>

                <div className="flex items-center justify-center gap-2 sm:gap-3 text-xs">
                  <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#86efac] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    {correctCount}
                  </span>
                  <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#fca5a5] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1">
                    <X className="w-3 h-3" />
                    {incorrectCount}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 text-[var(--color-text-primary)] text-xs">
                  <div className={cn(styles.playerExtraCompact, "items-center gap-2")}>
                    {isReverseMode && (
                      <span
                        className={cn(
                          styles.playerReverseCompact,
                          "px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#f97316] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1 text-xs whitespace-nowrap"
                        )}
                      >
                        <span className="inline-block rotate-180">
                          <PlayIcon className="w-3 h-3" />
                        </span>
                        <span>Reverse</span>
                      </span>
                    )}
                    {isDoubleMode && !isReverseMode && (
                      <span
                        className={cn(
                          styles.playerX2Compact,
                          "px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#22c55e] text-[#1B1B1B] font-bold border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] inline-flex items-center gap-1 text-xs whitespace-nowrap"
                        )}
                      >
                        <span>x2</span>
                        <span>Double</span>
                      </span>
                    )}
                  </div>
                  <div
                    className={cn(
                      styles.playerExtraDesktop,
                      "items-center justify-end gap-3 text-[var(--color-text-primary)] text-xs"
                    )}
                  >
                    <button
                      onClick={onToggleMute}
                      className={cn(
                        "p-2 rounded-full bg-white hover:bg-[var(--color-surface-overlay)]",
                        pressable
                      )}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(styles.magicProgressBar, "w-28 h-2 cursor-pointer")}
                        onClick={onVolumeBarClick}
                      >
                        <div className={cn(styles.magicProgressFill, "h-full")} style={{ width: `${volume}%` }} />
                      </div>
                      <span className="text-[var(--color-text-primary)] text-xs w-10 text-center">
                        {Math.round(volume)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PlayerDome = memo(PlayerDomeComponent);
PlayerDome.displayName = "PlayerDome";


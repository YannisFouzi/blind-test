import type { ReactNode } from "react";
import type { DoubleWorkSelectorProps } from "@/features/game-ui/components/DoubleWorkSelector";
import type { PointsCelebrationProps } from "@/features/game-ui/components/PointsCelebration";
import type { WorkSelectorProps } from "@/features/game-ui/components/WorkSelector";

export type { WorkSelectorProps, DoubleWorkSelectorProps, PointsCelebrationProps };

export interface GameHeaderProps {
  score: number;
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  actions?: ReactNode;
}

export interface GameProgressProps {
  current: number;
  total: number;
  showBar?: boolean;
}

export interface GameControlsProps {
  isPlaying: boolean;
  volume: number;
  isMuted: boolean;
  progress: number;
  duration: number;
  noSeek: boolean;
  onTogglePlay: () => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onSeek?: (position: number) => void;
  disabled?: boolean;
}

export interface GameUIStore {
  showParticles: boolean;
  showPointsCelebration: boolean;
  celebrationPoints: number | null;
  setShowParticles: (show: boolean) => void;
  triggerPointsCelebration: (points: number) => void;
  clearPointsCelebration: () => void;
}

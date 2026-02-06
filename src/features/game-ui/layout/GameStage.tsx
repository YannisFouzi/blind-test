import { memo, type ReactNode } from "react";
import styles from "./GameStage.module.css";

const PARTICLE_POSITIONS = [
  { top: 15, left: 20 },
  { top: 35, left: 75 },
  { top: 55, left: 25 },
  { top: 70, left: 85 },
  { top: 85, left: 15 },
  { top: 20, left: 60 },
  { top: 45, left: 90 },
  { top: 65, left: 40 },
  { top: 90, left: 70 },
  { top: 25, left: 35 },
  { top: 50, left: 80 },
  { top: 75, left: 10 },
  { top: 30, left: 55 },
  { top: 60, left: 30 },
  { top: 80, left: 65 },
  { top: 40, left: 45 },
  { top: 12, left: 85 },
  { top: 67, left: 12 },
  { top: 82, left: 92 },
  { top: 38, left: 68 },
] as const;

type GameStageProps = {
  children: ReactNode;
};

const GameStageComponent = ({ children }: GameStageProps) => {
  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PARTICLE_POSITIONS.map((position) => (
          <div
            key={`${position.top}-${position.left}`}
            className={styles.particle}
            style={{
              top: `${position.top}%`,
              left: `${position.left}%`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-yellow-200/40 via-transparent to-blue-200/40 pointer-events-none" />

      {children}

      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FDE68A]/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#BFDBFE]/40 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-[#FBCFE8]/40 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export const GameStage = memo(GameStageComponent);
GameStage.displayName = "GameStage";

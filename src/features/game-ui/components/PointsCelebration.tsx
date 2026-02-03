"use client";

import { AnimatePresence, motion } from "framer-motion";

export type PointsCelebrationProps = {
  points: number | null;
  triggerKey?: number | null;
};

export const PointsCelebration = ({ points, triggerKey }: PointsCelebrationProps) => {
  const displayValue =
    points !== null && points > 0 ? `+${points}` : points === 0 ? "0" : `${points ?? ""}`;
  const pointsLabel = points !== null && points <= 1 ? "Point gagné" : "Points gagnés";

  return (
    <AnimatePresence>
      {points !== null && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center pointer-events-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            key={triggerKey ?? displayValue}
            initial={{ scale: 0.7, y: 30, opacity: 0 }}
            animate={{ scale: 1.05, y: 0, opacity: 1 }}
            exit={{ scale: 0.4, y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 14, mass: 0.8 }}
            className="relative px-10 py-8 md:px-14 md:py-10 rounded-3xl bg-white border-[3px] border-black shadow-[8px_8px_0_#1B1B1B]"
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0.6 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute inset-[-18%] rounded-full border-2 border-black/40"
            />
            <div className="relative text-center space-y-3">
              <div className="text-5xl md:text-6xl font-black text-[var(--color-text-primary)] tracking-tight">
                {displayValue}
              </div>
              <div className="text-xs md:text-sm uppercase tracking-[0.4em] text-[var(--color-text-secondary)]">
                {pointsLabel}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

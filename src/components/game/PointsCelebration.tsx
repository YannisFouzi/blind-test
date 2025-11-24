"use client";

import { AnimatePresence, motion } from "framer-motion";

type PointsCelebrationProps = {
  points: number | null;
  triggerKey?: number | null;
};

export const PointsCelebration = ({ points, triggerKey }: PointsCelebrationProps) => {
  const displayValue =
    points !== null && points > 0 ? `+${points}` : points === 0 ? "0" : `${points ?? ""}`;

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
            className="relative px-10 py-8 md:px-14 md:py-10 rounded-3xl bg-slate-900/70 border border-purple-400/40 shadow-[0_20px_90px_rgba(126,34,206,0.45)] backdrop-blur-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/25 via-fuchsia-500/20 to-amber-400/20 blur-3xl" />
            <motion.div
              initial={{ scale: 0.7, opacity: 0.6 }}
              animate={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 1.2, ease: "easeOut" }}
              className="absolute inset-[-18%] rounded-full border border-purple-300/60"
            />
            <div className="relative text-center space-y-3">
              <div className="text-5xl md:text-6xl font-black text-white drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)] tracking-tight">
                {displayValue}
              </div>
              <div className="text-xs md:text-sm uppercase tracking-[0.4em] text-purple-50/80">
                Points gagnés
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface SoloScoreDisplayProps {
  correct: number;
  incorrect: number;
}

const SoloScoreDisplayComponent = ({ correct, incorrect }: SoloScoreDisplayProps) => {
  const total = correct + incorrect;
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md mx-auto bg-white rounded-2xl border-[3px] border-[#1B1B1B] p-6 shadow-[4px_4px_0_#1B1B1B]"
    >
      <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-6 text-center">
        Vos resultats
      </h2>

      <div className="space-y-4">
        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-green-50 border-2 border-[#1B1B1B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]">
              <Check className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-semibold text-[var(--color-text-primary)]">
              Reponses correctes
            </span>
          </div>
          <span className="text-2xl font-bold text-green-600">{correct}</span>
        </div>

        <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-red-50 border-2 border-[#1B1B1B]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]">
              <X className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-semibold text-[var(--color-text-primary)]">
              Reponses incorrectes
            </span>
          </div>
          <span className="text-2xl font-bold text-red-600">{incorrect}</span>
        </div>

        <div className="pt-4 border-t-2 border-[#1B1B1B]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Total de questions
            </span>
            <span className="text-lg font-bold text-[var(--color-text-primary)]">{total}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[var(--color-text-secondary)]">
              Taux de reussite
            </span>
            <span className="text-xl font-bold text-[var(--color-text-primary)]">
              {percentage}%
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export const SoloScoreDisplay = memo(SoloScoreDisplayComponent);
SoloScoreDisplay.displayName = "SoloScoreDisplay";

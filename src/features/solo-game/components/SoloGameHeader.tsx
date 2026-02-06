"use client";

import { Check, Home as HomeIcon, X } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import chromeStyles from "@/styles/gameChrome.module.css";

export interface SoloGameHeaderProps {
  score: {
    correct: number;
    incorrect: number;
  };
  currentRoundIndex: number;
  roundCount: number;
  onGoHome?: () => void;
  universeName?: string;
}

export const SoloGameHeader = ({
  score,
  currentRoundIndex,
  roundCount,
  onGoHome,
  universeName,
}: SoloGameHeaderProps) => {
  const displayIndex = currentRoundIndex + 1;

  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-white border-b-[3px] border-[#1B1B1B] shadow-[0_4px_0_#1B1B1B]">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {onGoHome && (
            <button
              onClick={onGoHome}
              className={cn("magic-button flex items-center text-sm", chromeStyles.homeButton)}
            >
              <HomeIcon className="w-4 h-4" />
              <span className={chromeStyles.homeButtonLabel}>Accueil</span>
            </button>
          )}

          {universeName && (
            <div className="hidden md:block">
              <h1 className="text-[var(--color-text-primary)] text-lg font-bold">
                {universeName}
              </h1>
            </div>
          )}

          <div className="flex items-center gap-4">
            <Badge variant="primary" glow>
              Manche {displayIndex} / {roundCount}
            </Badge>

            <div className="flex items-center gap-2">
              <Badge variant="success" glow leftIcon={<Check className="w-3 h-3" />}>
                {score.correct}
              </Badge>
              <Badge variant="error" leftIcon={<X className="w-3 h-3" />}>
                {score.incorrect}
              </Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

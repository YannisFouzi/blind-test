"use client";

import { Home as HomeIcon } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

/**
 * Props du SoloGameHeader
 */
export interface SoloGameHeaderProps {
  /** Score actuel */
  score: {
    correct: number;
    incorrect: number;
  };

  /** Index de la chanson actuelle (0-based) */
  currentSongIndex: number;

  /** Nombre total de chansons */
  totalSongs: number;

  /** Callback pour retourner à l'accueil */
  onGoHome?: () => void;

  /** Nom de l'univers (optionnel) */
  universeName?: string;
}

/**
 * SoloGameHeader
 *
 * Header du jeu solo avec score + progression.
 *
 * @example
 * ```tsx
 * <SoloGameHeader
 *   score={{ correct: 5, incorrect: 2 }}
 *   currentSongIndex={6}
 *   totalSongs={10}
 *   onGoHome={() => router.push("/")}
 *   universeName="Disney"
 * />
 * ```
 */
export const SoloGameHeader = ({
  score,
  currentSongIndex,
  totalSongs,
  onGoHome,
  universeName,
}: SoloGameHeaderProps) => {
  return (
    <div className="fixed top-0 left-0 right-0 z-40 bg-slate-900/80 border-b border-purple-500/30 backdrop-blur-lg">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Bouton Home */}
          {onGoHome && (
            <button onClick={onGoHome} className="magic-button px-4 py-2 flex items-center gap-2 text-white font-semibold text-sm">
              <HomeIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Accueil</span>
            </button>
          )}

          {/* Titre univers (optionnel) */}
          {universeName && (
            <div className="hidden md:block">
              <h1 className="text-white text-lg font-bold">{universeName}</h1>
            </div>
          )}

          {/* Score + Progression */}
          <div className="flex items-center gap-4">
            {/* Progression */}
            <Badge variant="primary" glow>
              Morceau {currentSongIndex + 1} / {totalSongs}
            </Badge>

            {/* Score */}
            <div className="flex items-center gap-2">
              <Badge variant="success" glow>
                + {score.correct}
              </Badge>
              <Badge variant="error">- {score.incorrect}</Badge>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

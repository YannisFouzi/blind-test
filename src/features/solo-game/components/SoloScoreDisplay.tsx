"use client";

import { Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

/**
 * Props du SoloScoreDisplay
 */
export interface SoloScoreDisplayProps {
  /** Score actuel */
  score: {
    correct: number;
    incorrect: number;
  };

  /** Index de la chanson actuelle (0-based) */
  currentSongIndex: number;

  /** Nombre total de chansons */
  totalSongs: number;

  /** Affichage compact */
  compact?: boolean;
}

/**
 * SoloScoreDisplay
 *
 * Affichage du score du joueur en mode solo.
 * Peut être affiché en version compacte ou étendue.
 *
 * @example
 * ```tsx
 * <SoloScoreDisplay
 *   score={{ correct: 8, incorrect: 2 }}
 *   currentSongIndex={9}
 *   totalSongs={10}
 * />
 * ```
 */
export const SoloScoreDisplay = ({ score, currentSongIndex, totalSongs, compact = false }: SoloScoreDisplayProps) => {
  const totalAnswered = score.correct + score.incorrect;
  const accuracy = totalAnswered > 0 ? Math.round((score.correct / totalAnswered) * 100) : 0;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <Badge variant="success" glow leftIcon={<Check className="w-3 h-3" />}>
          {score.correct}
        </Badge>
        <Badge variant="error" leftIcon={<X className="w-3 h-3" />}>
          {score.incorrect}
        </Badge>
        <Badge variant="primary">{accuracy}%</Badge>
      </div>
    );
  }

  return (
    <Card surface="elevated" glow="purple" size="md">
      <CardHeader>
        <CardTitle>Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Progression */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Progression</span>
            <Badge variant="primary" glow>
              {currentSongIndex + 1} / {totalSongs}
            </Badge>
          </div>

          {/* Bonnes réponses */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Bonnes réponses</span>
            <Badge
              variant="success"
              glow
              size="lg"
              leftIcon={<Check className="w-4 h-4" />}
            >
              {score.correct}
            </Badge>
          </div>

          {/* Mauvaises réponses */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-[var(--color-text-secondary)]">Mauvaises réponses</span>
            <Badge variant="error" size="lg" leftIcon={<X className="w-4 h-4" />}>
              {score.incorrect}
            </Badge>
          </div>

          {/* Précision */}
          <div className="flex items-center justify-between pt-2 border-t border-black/20">
            <span className="text-sm text-[var(--color-text-secondary)] font-semibold">Précision</span>
            <Badge variant="magic" glow pulse size="lg">
              {accuracy}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

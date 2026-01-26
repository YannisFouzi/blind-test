"use client";

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
        <Badge variant="success" glow>
          + {score.correct}
        </Badge>
        <Badge variant="error">- {score.incorrect}</Badge>
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
            <span className="text-sm text-gray-300">Progression</span>
            <Badge variant="primary" glow>
              {currentSongIndex + 1} / {totalSongs}
            </Badge>
          </div>

          {/* Bonnes réponses */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Bonnes réponses</span>
            <Badge variant="success" glow size="lg">
              + {score.correct}
            </Badge>
          </div>

          {/* Mauvaises réponses */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Mauvaises réponses</span>
            <Badge variant="error" size="lg">
              - {score.incorrect}
            </Badge>
          </div>

          {/* Précision */}
          <div className="flex items-center justify-between pt-2 border-t border-purple-500/30">
            <span className="text-sm text-gray-300 font-semibold">Précision</span>
            <Badge variant="magic" glow pulse size="lg">
              {accuracy}%
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

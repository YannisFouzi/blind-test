import { useEffect, useState } from "react";
import { GameSession } from "../../../types";

interface GameScoreProps {
  gameSession: GameSession;
}

export const GameScore = ({ gameSession }: GameScoreProps) => {
  const [animatedCorrect, setAnimatedCorrect] = useState(0);
  const [animatedIncorrect, setAnimatedIncorrect] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Animation des compteurs
  useEffect(() => {
    if (
      gameSession.score.correct !== animatedCorrect ||
      gameSession.score.incorrect !== animatedIncorrect
    ) {
      setIsAnimating(true);

      const interval = setInterval(() => {
        if (animatedCorrect < gameSession.score.correct) {
          setAnimatedCorrect((prev) => prev + 1);
        } else if (animatedCorrect > gameSession.score.correct) {
          setAnimatedCorrect((prev) => prev - 1);
        }

        if (animatedIncorrect < gameSession.score.incorrect) {
          setAnimatedIncorrect((prev) => prev + 1);
        } else if (animatedIncorrect > gameSession.score.incorrect) {
          setAnimatedIncorrect((prev) => prev - 1);
        }

        if (
          animatedCorrect === gameSession.score.correct &&
          animatedIncorrect === gameSession.score.incorrect
        ) {
          setIsAnimating(false);
          clearInterval(interval);
        }
      }, 50);

      return () => clearInterval(interval);
    }
  }, [
    gameSession.score.correct,
    gameSession.score.incorrect,
    animatedCorrect,
    animatedIncorrect,
  ]);

  // const totalQuestions = gameSession.score.correct + gameSession.score.incorrect;

  return (
    <div className="text-center">
      {/* Barre de progression du taux de réussite */}
      {/*   {totalQuestions > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between text-white text-sm mb-2">
            <span className="text-purple-300">Taux de réussite</span>
            <span className="font-bold">{Math.round(successRate)}%</span>
          </div>
          <div className="magic-progress-bar h-3">
            <div
              className="magic-progress-fill h-full transition-all duration-1000 ease-out"
              style={{ width: `${successRate}%` }}
            />
          </div>
        </div>
      )} */}

      {/* Particules magiques pour les bonnes réponses */}
      {isAnimating && gameSession.score.correct > animatedCorrect && (
        <>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full"
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
              }}
            />
          ))}
        </>
      )}
    </div>
  );
};

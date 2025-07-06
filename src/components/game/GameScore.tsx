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

      const animateCounter = (
        target: number,
        current: number,
        setter: (value: number) => void
      ) => {
        const diff = target - current;
        const increment = diff > 0 ? 1 : -1;
        const duration = 50;

        if (diff !== 0) {
          setTimeout(() => {
            setter(current + increment);
          }, duration);
        }
      };

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

  const totalQuestions =
    gameSession.score.correct + gameSession.score.incorrect;
  const successRate =
    totalQuestions > 0 ? (gameSession.score.correct / totalQuestions) * 100 : 0;

  return (
    <div className="text-center">
      {/* Titre magique */}
      <div className="mb-6">
        <h3 className="fantasy-text text-3xl md:text-4xl font-bold mb-2">
          Morceau {gameSession.currentSongIndex + 1} /{" "}
          {gameSession.songs.length}
        </h3>
        <div className="w-16 h-1 bg-gradient-to-r from-yellow-400 to-purple-500 mx-auto rounded-full" />
      </div>

      {/* Statistiques avec design moderne */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Réponses correctes */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300" />
          <div className="relative bg-slate-800/40 backdrop-blur-lg rounded-2xl p-6 border border-green-500/30 hover:border-green-400/50 transition-all duration-300">
            <div className="flex items-center justify-center mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">✓</span>
              </div>
            </div>
            <div
              className={`text-3xl font-bold text-green-400 mb-2 ${
                isAnimating ? "score-animation" : ""
              }`}
            >
              {animatedCorrect}
            </div>
            <div className="text-green-300 text-sm font-medium">Trouvés</div>
          </div>
        </div>

        {/* Réponses incorrectes */}
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-pink-500/20 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-300" />
          <div className="relative bg-slate-800/40 backdrop-blur-lg rounded-2xl p-6 border border-red-500/30 hover:border-red-400/50 transition-all duration-300">
            <div className="flex items-center justify-center mb-2">
              <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-pink-500 rounded-full flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-lg">✗</span>
              </div>
            </div>
            <div
              className={`text-3xl font-bold text-red-400 mb-2 ${
                isAnimating ? "score-animation" : ""
              }`}
            >
              {animatedIncorrect}
            </div>
            <div className="text-red-300 text-sm font-medium">Ratés</div>
          </div>
        </div>
      </div>

      {/* Barre de progression du taux de réussite */}
      {totalQuestions > 0 && (
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
      )}

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

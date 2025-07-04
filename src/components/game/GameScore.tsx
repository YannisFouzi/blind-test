import { GameSession } from "../../../types";

interface GameScoreProps {
  gameSession: GameSession;
}

export const GameScore = ({ gameSession }: GameScoreProps) => {
  return (
    <div className="bg-slate-800/50 rounded-2xl p-6 text-center border border-gray-700/50">
      <h3 className="text-2xl font-bold text-yellow-400 mb-4">
        Morceau {gameSession.currentSongIndex + 1} / {gameSession.songs.length}
      </h3>
      <div className="flex justify-center gap-8 text-lg">
        <span className="text-green-400">
          ✓ {gameSession.score.correct} trouvés
        </span>
        <span className="text-red-400">
          ✗ {gameSession.score.incorrect} ratés
        </span>
      </div>
    </div>
  );
};

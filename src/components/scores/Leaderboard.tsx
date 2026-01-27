"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Crown, Trophy } from "lucide-react";
import type { RoomPlayer } from "@/types";

interface LeaderboardProps {
  players: Array<RoomPlayer & { rank?: number }>;
  currentPlayerId?: string;
}

const LeaderboardRow = memo(
  ({
    player,
    isCurrentPlayer,
    rank,
  }: {
    player: RoomPlayer & { rank?: number };
    isCurrentPlayer: boolean;
    rank: number;
  }) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: rank * 0.05 }}
        className={`
          relative flex items-center gap-4 px-4 py-3 rounded-xl
          ${isCurrentPlayer 
            ? "bg-yellow-100 border-2 border-black shadow-[3px_3px_0_#1B1B1B]" 
            : "bg-white border-2 border-black shadow-[2px_2px_0_#1B1B1B]"
          }
        `}
      >
        {/* Rang */}
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white border-2 border-black text-sm font-bold text-[var(--color-text-primary)] shadow-[2px_2px_0_#1B1B1B]">
          {rank === 1 ? (
            <Crown className="w-5 h-5 text-yellow-400" />
          ) : rank === 2 ? (
            <Trophy className="w-5 h-5 text-gray-400" />
          ) : rank === 3 ? (
            <Trophy className="w-5 h-5 text-amber-600" />
          ) : (
            rank
          )}
        </div>

        {/* Nom */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-[var(--color-text-primary)] truncate">
              {player.displayName}
            </span>
            {isCurrentPlayer && (
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-yellow-200 text-[var(--color-text-primary)] rounded border border-black">
                Toi
              </span>
            )}
            {player.isHost && (
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-blue-200 text-[var(--color-text-primary)] rounded border border-black">
                Hôte
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4">
          {/* Correct */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-[var(--color-text-secondary)]">Correct</span>
            <span className="text-lg font-bold text-green-600">{player.correct ?? 0}</span>
          </div>
          
          {/* Incorrect */}
          <div className="flex flex-col items-center">
            <span className="text-xs text-[var(--color-text-secondary)]">Incorrect</span>
            <span className="text-lg font-bold text-red-600">{player.incorrect ?? 0}</span>
          </div>

          {/* Points totaux */}
          <div className="flex flex-col items-center min-w-[60px]">
            <span className="text-xs text-[var(--color-text-secondary)]">Points</span>
            <span className="text-xl font-bold text-[var(--color-text-primary)]">{player.score}</span>
          </div>
        </div>
      </motion.div>
    );
  }
);

LeaderboardRow.displayName = "LeaderboardRow";

const LeaderboardComponent = ({ players, currentPlayerId }: LeaderboardProps) => {
  // Trier les joueurs par score décroissant et assigner les rangs
  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter((p) => p.connected !== false)
      .sort((a, b) => b.score - a.score)
      .map((player, index) => ({
        ...player,
        rank: index + 1,
      }));
  }, [players]);

  if (sortedPlayers.length === 0) {
    return (
      <div className="text-center text-[var(--color-text-secondary)] py-8">
        Aucun joueur
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      {sortedPlayers.map((player) => (
        <LeaderboardRow
          key={player.id}
          player={player}
          isCurrentPlayer={player.id === currentPlayerId}
          rank={player.rank ?? 1}
        />
      ))}
    </div>
  );
};

export const Leaderboard = memo(LeaderboardComponent);
Leaderboard.displayName = "Leaderboard";

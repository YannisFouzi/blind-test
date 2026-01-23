"use client";

import { memo, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Clock, Crown } from "lucide-react";
import type { RoomPlayer } from "@/types";

interface PlayersScoreboardProps {
  players: RoomPlayer[];
  currentPlayerId: string;
  isVisible?: boolean;
}

const PlayerRow = memo(
  ({
    player,
    isCurrentPlayer,
    rank,
  }: {
    player: RoomPlayer;
    isCurrentPlayer: boolean;
    rank: number;
  }) => {
    const hasAnswered = player.hasAnsweredCurrentSong ?? false;

    return (
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.2 }}
        className={`
          relative flex items-center gap-3 px-3 py-2.5 rounded-xl
          ${isCurrentPlayer 
            ? "bg-purple-500/20 border border-purple-500/40" 
            : "bg-slate-800/50 border border-slate-700/50"
          }
          ${!player.connected ? "opacity-50" : ""}
        `}
      >
        {/* Rang */}
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-700/50 text-xs font-bold text-slate-300">
          {rank === 1 && player.score > 0 ? (
            <Crown className="w-3.5 h-3.5 text-yellow-400" />
          ) : (
            rank
          )}
        </div>

        {/* Nom */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {player.displayName}
            </span>
            {isCurrentPlayer && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-purple-500/30 text-purple-300 rounded">
                Toi
              </span>
            )}
            {player.isHost && (
              <span className="px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-yellow-500/30 text-yellow-300 rounded">
                Hôte
              </span>
            )}
          </div>
          
          {/* Statut de réponse */}
          <div className="flex items-center gap-1 mt-0.5">
            {hasAnswered ? (
              <span className="text-[10px] text-green-400 flex items-center gap-1">
                <Check className="w-2.5 h-2.5" />
                A répondu
              </span>
            ) : (
              <span className="text-[10px] text-white flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                En attente
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        <div className="flex flex-col items-end">
          <motion.span
            key={player.score}
            initial={{ scale: 1.3, color: "#22c55e" }}
            animate={{ scale: 1, color: "#ffffff" }}
            transition={{ duration: 0.3 }}
            className="text-lg font-bold text-white"
          >
            {player.score}
          </motion.span>
          <span className="text-[10px] text-white">
            pts
          </span>
        </div>

      </motion.div>
    );
  }
);

PlayerRow.displayName = "PlayerRow";

const PlayersScoreboardComponent = ({
  players,
  currentPlayerId,
  isVisible = true,
}: PlayersScoreboardProps) => {
  // Trier les joueurs par score décroissant
  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter((p) => p.connected !== false)
      .sort((a, b) => b.score - a.score);
  }, [players]);

  if (!isVisible || sortedPlayers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xs bg-slate-900/80 backdrop-blur-lg rounded-2xl border border-purple-500/30 overflow-hidden shadow-xl"
    >
      {/* Liste des joueurs */}
      <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
        <AnimatePresence mode="popLayout">
          {sortedPlayers.map((player, index) => (
            <PlayerRow
              key={player.id}
              player={player}
              isCurrentPlayer={player.id === currentPlayerId}
              rank={index + 1}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export const PlayersScoreboard = memo(PlayersScoreboardComponent);
PlayersScoreboard.displayName = "PlayersScoreboard";

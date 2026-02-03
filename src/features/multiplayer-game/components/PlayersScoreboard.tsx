"use client";

import { memo, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Crown } from "lucide-react";
import type { RoomPlayer } from "@/types";
import { cn } from "@/lib/utils";

interface PlayersScoreboardProps {
  players: RoomPlayer[];
  currentPlayerId: string;
  isVisible?: boolean;
}

interface PlayerRowProps {
  player: RoomPlayer;
  isCurrentPlayer: boolean;
  rank: number;
}

const PlayerRow = memo(({ player, isCurrentPlayer, rank }: PlayerRowProps) => {
  const hasAnswered = player.hasAnsweredCurrentSong ?? false;
  const showCrown = rank === 1 && player.score > 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className={cn(
        "relative flex items-center gap-3 px-3 py-2.5 rounded-2xl border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B]",
        isCurrentPlayer ? "bg-[var(--color-brand-primary-light)]" : "bg-white",
        !player.connected && "opacity-60"
      )}
    >
      <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-[#1B1B1B] text-xs font-bold text-[var(--color-text-primary)]">
        {showCrown ? <Crown className="w-3.5 h-3.5 text-[#B45309]" /> : rank}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[var(--color-text-primary)] truncate">
            {player.displayName}
          </span>
          {isCurrentPlayer && (
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[var(--color-brand-primary)] text-[#1B1B1B] border-2 border-[#1B1B1B] rounded">
              Toi
            </span>
          )}
          {player.isHost && (
            <span className="px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#FDE68A] text-[#1B1B1B] border-2 border-[#1B1B1B] rounded">
              Hote
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 mt-0.5">
          {hasAnswered ? (
            <span className="text-[10px] text-green-700 flex items-center gap-1 font-semibold">
              <Check className="w-2.5 h-2.5" />
              A repondu
            </span>
          ) : (
            <span className="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-1 font-semibold">
              <Clock className="w-2.5 h-2.5" />
              En attente
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col items-end">
        <motion.span
          key={player.score}
          initial={{ scale: 1.3, color: "#166534" }}
          animate={{ scale: 1, color: "#1B1B1B" }}
          transition={{ duration: 0.3 }}
          className="text-lg font-black"
        >
          {player.score}
        </motion.span>
        <span className="text-[10px] text-[var(--color-text-secondary)]">pts</span>
      </div>
    </motion.div>
  );
});

PlayerRow.displayName = "PlayerRow";

const PlayersScoreboardComponent = ({
  players,
  currentPlayerId,
  isVisible = true,
}: PlayersScoreboardProps) => {
  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter((player) => player.connected !== false)
      .sort((a, b) => b.score - a.score);
  }, [players]);

  if (!isVisible || sortedPlayers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-xs bg-white rounded-2xl border-[3px] border-[#1B1B1B] overflow-hidden shadow-[4px_4px_0_#1B1B1B]"
    >
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

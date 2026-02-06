"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Clock, Crown } from "lucide-react";
import type { RoomPlayer } from "@/types";
import { cn } from "@/lib/utils";

const AUTO_SCROLL_SPEED_PX_PER_SEC = 30;
const AUTO_SCROLL_EDGE_PAUSE_MS = 700;
const AUTO_SCROLL_RESUME_DELAY_MS = 900;

interface PlayersScoreboardProps {
  players: RoomPlayer[];
  currentPlayerId: string;
  isVisible?: boolean;
  compact?: boolean;
}

interface PlayerRowProps {
  player: RoomPlayer;
  isCurrentPlayer: boolean;
  rank: number;
  compact?: boolean;
}

const PlayerRow = memo(({
  player,
  isCurrentPlayer,
  rank,
  compact = false,
}: PlayerRowProps) => {
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
        compact && "px-2.5 py-2 gap-1.5 rounded-xl w-fit",
        isCurrentPlayer ? "bg-[var(--color-brand-primary-light)]" : "bg-white",
        !player.connected && "opacity-60"
      )}
    >
      {!compact && (
        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white border-2 border-[#1B1B1B] text-xs font-bold text-[var(--color-text-primary)]">
          {showCrown ? <Crown className="w-3.5 h-3.5 text-[#B45309]" /> : rank}
        </div>
      )}

      <div className={cn("min-w-0", !compact && "flex-1")}>
        <div className={cn("flex items-center gap-2", compact && "gap-1.5")}>
          <span
            className={cn(
              "text-sm font-bold text-[var(--color-text-primary)] truncate",
              compact && "text-xs"
            )}
          >
            {player.displayName}
          </span>
          {player.isHost && !isCurrentPlayer && (
            <span
              className={cn(
                "px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-[#FDE68A] text-[#1B1B1B] border-2 border-[#1B1B1B] rounded",
                compact && "text-[9px] px-1 py-0"
              )}
            >
              Hote
            </span>
          )}
          {compact && (
            <span
              className={cn(
                "inline-flex items-center",
                hasAnswered ? "text-green-700" : "text-[var(--color-text-secondary)]"
              )}
            >
              {hasAnswered ? <Check className="w-2.5 h-2.5" /> : <Clock className="w-2.5 h-2.5" />}
            </span>
          )}
        </div>

        {!compact && (
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
        )}
      </div>

      <div className="flex flex-col items-end">
        <motion.span
          key={player.score}
          initial={{ scale: 1.3, color: "#166534" }}
          animate={{ scale: 1, color: "#1B1B1B" }}
          transition={{ duration: 0.3 }}
          className={cn("text-lg font-black", compact && "text-base leading-none")}
        >
          {player.score}
        </motion.span>
        {!compact && (
          <span className="text-[10px] text-[var(--color-text-secondary)]">pts</span>
        )}
      </div>
    </motion.div>
  );
});

PlayerRow.displayName = "PlayerRow";

const PlayersScoreboardComponent = ({
  players,
  currentPlayerId,
  isVisible = true,
  compact = false,
}: PlayersScoreboardProps) => {
  const sortedPlayers = useMemo(() => {
    return [...players]
      .filter((player) => player.connected !== false)
      .sort((a, b) => b.score - a.score);
  }, [players]);

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const pauseUntilRef = useRef<number>(0);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartXRef = useRef(0);
  const dragStartScrollLeftRef = useRef(0);
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isOverflowing, setIsOverflowing] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);

  const stopAutoScroll = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    lastTsRef.current = null;
  }, []);

  const clearResumeTimer = useCallback(() => {
    if (resumeTimerRef.current !== null) {
      clearTimeout(resumeTimerRef.current);
      resumeTimerRef.current = null;
    }
  }, []);

  const beginManualInteraction = useCallback(() => {
    clearResumeTimer();
    setIsInteracting(true);
  }, [clearResumeTimer]);

  const scheduleAutoScrollResume = useCallback((delayMs = AUTO_SCROLL_RESUME_DELAY_MS) => {
    clearResumeTimer();
    resumeTimerRef.current = setTimeout(() => {
      setIsInteracting(false);
      resumeTimerRef.current = null;
    }, delayMs);
  }, [clearResumeTimer]);

  const updateOverflow = useCallback(() => {
    const viewport = viewportRef.current;
    if (!viewport || !compact) {
      setIsOverflowing(false);
      return;
    }

    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    const hasOverflow = maxScroll > 1;
    setIsOverflowing(hasOverflow);

    if (!hasOverflow) {
      viewport.scrollLeft = 0;
      dragPointerIdRef.current = null;
      clearResumeTimer();
      setIsInteracting(false);
    }
  }, [clearResumeTimer, compact]);

  useEffect(() => {
    if (!compact) return;

    updateOverflow();

    const onResize = () => updateOverflow();
    window.addEventListener("resize", onResize);

    if (typeof ResizeObserver === "undefined") {
      return () => {
        window.removeEventListener("resize", onResize);
      };
    }

    const observer = new ResizeObserver(() => {
      updateOverflow();
    });

    if (viewportRef.current) {
      observer.observe(viewportRef.current);
    }

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [compact, updateOverflow, sortedPlayers.length]);

  useEffect(() => {
    return () => {
      clearResumeTimer();
    };
  }, [clearResumeTimer]);

  useEffect(() => {
    if (!compact || !isOverflowing || isInteracting) {
      stopAutoScroll();
      return;
    }

    const viewport = viewportRef.current;
    if (!viewport) return;

    pauseUntilRef.current = performance.now() + AUTO_SCROLL_EDGE_PAUSE_MS;

    const tick = (ts: number) => {
      const node = viewportRef.current;
      if (!node) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const maxScroll = Math.max(0, node.scrollWidth - node.clientWidth);
      if (maxScroll <= 1) {
        node.scrollLeft = 0;
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      if (document.visibilityState !== "visible") {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      const prevTs = lastTsRef.current ?? ts;
      const dt = Math.min(64, ts - prevTs);
      lastTsRef.current = ts;

      if (ts < pauseUntilRef.current) {
        frameRef.current = requestAnimationFrame(tick);
        return;
      }

      let next = node.scrollLeft + (directionRef.current * AUTO_SCROLL_SPEED_PX_PER_SEC * dt) / 1000;

      if (next >= maxScroll) {
        next = maxScroll;
        directionRef.current = -1;
        pauseUntilRef.current = ts + AUTO_SCROLL_EDGE_PAUSE_MS;
      } else if (next <= 0) {
        next = 0;
        directionRef.current = 1;
        pauseUntilRef.current = ts + AUTO_SCROLL_EDGE_PAUSE_MS;
      }

      node.scrollLeft = next;
      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    return () => {
      stopAutoScroll();
    };
  }, [compact, isInteracting, isOverflowing, stopAutoScroll]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!compact || !isOverflowing) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    dragPointerIdRef.current = event.pointerId;
    dragStartXRef.current = event.clientX;
    dragStartScrollLeftRef.current = viewport.scrollLeft;
    beginManualInteraction();
    event.currentTarget.setPointerCapture(event.pointerId);
  }, [beginManualInteraction, compact, isOverflowing]);

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;

    const viewport = viewportRef.current;
    if (!viewport) return;

    const deltaX = event.clientX - dragStartXRef.current;
    viewport.scrollLeft = dragStartScrollLeftRef.current - deltaX;
  }, []);

  const handlePointerEnd = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragPointerIdRef.current !== event.pointerId) return;

    dragPointerIdRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    scheduleAutoScrollResume();
  }, [scheduleAutoScrollResume]);

  if (!isVisible || sortedPlayers.length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      data-testid="players-scoreboard"
      className={cn(
        "w-full max-w-xs bg-white rounded-2xl border-[3px] border-[#1B1B1B] overflow-hidden shadow-[4px_4px_0_#1B1B1B]",
        compact && "max-w-[min(92vw,34rem)]"
      )}
    >
      {compact ? (
        <div
          ref={viewportRef}
          className="p-2.5 overflow-x-auto overflow-y-hidden scrollbar-hide cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: "pan-x" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onMouseEnter={() => beginManualInteraction()}
          onMouseLeave={() => scheduleAutoScrollResume(250)}
          onWheel={() => {
            beginManualInteraction();
            scheduleAutoScrollResume(450);
          }}
        >
          <div className="flex items-stretch gap-2 min-w-max">
            {sortedPlayers.map((player, index) => (
              <PlayerRow
                key={player.id}
                player={player}
                isCurrentPlayer={player.id === currentPlayerId}
                rank={index + 1}
                compact
              />
            ))}
          </div>
        </div>
      ) : (
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
      )}
    </motion.div>
  );
};

export const PlayersScoreboard = memo(PlayersScoreboardComponent);
PlayersScoreboard.displayName = "PlayersScoreboard";

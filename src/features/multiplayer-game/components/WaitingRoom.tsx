"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Crown, Users } from "lucide-react";
import type { RoomPlayer } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";

export interface WaitingRoomProps {
  roomId: string;
  players: RoomPlayer[];
  currentPlayerId: string;
  isHost: boolean;
  onStartGame?: () => void;
  onCopyInvite?: () => void;
  minPlayers?: number;
  universeName?: string;
  songsCount?: number;
}

const COPY_RESET_DELAY_MS = 2000;

const getPlayerInitial = (displayName: string) => {
  const trimmed = displayName.trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
};

const WaitingRoomComponent = ({
  roomId,
  players,
  currentPlayerId,
  isHost,
  onStartGame,
  onCopyInvite,
  minPlayers = 1,
  universeName,
  songsCount,
}: WaitingRoomProps) => {
  const [copied, setCopied] = useState(false);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectedPlayers = useMemo(
    () => players.filter((player) => player.connected !== false),
    [players]
  );
  const canStart = useMemo(
    () => connectedPlayers.length >= minPlayers && isHost,
    [connectedPlayers.length, minPlayers, isHost]
  );
  const remainingPlayers = Math.max(minPlayers - connectedPlayers.length, 0);

  const handleCopyInvite = useCallback(() => {
    if (!onCopyInvite) return;

    onCopyInvite();
    setCopied(true);

    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }

    copyTimeoutRef.current = setTimeout(() => {
      setCopied(false);
    }, COPY_RESET_DELAY_MS);
  }, [onCopyInvite]);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
        copyTimeoutRef.current = null;
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-6">
      <Card
        surface="elevated"
        size="lg"
        className="w-full max-w-2xl border-[3px] border-[#1B1B1B] shadow-[6px_6px_0_#1B1B1B]"
      >
        <CardHeader>
          <CardTitle className="text-center text-3xl font-extrabold">
            Salle d&apos;attente
          </CardTitle>
          <div className="flex justify-center mt-4">
            <Badge variant="primary" size="lg">
              Room: {roomId}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {universeName && (
              <div className="text-center">
                <p className="text-[var(--color-text-secondary)] text-sm mb-2">
                  Univers selectionne
                </p>
                <Badge variant="primary" size="lg">
                  {universeName}
                </Badge>
                {songsCount !== undefined && (
                  <p className="text-[var(--color-text-secondary)] text-xs mt-2">
                    {songsCount} chansons
                  </p>
                )}
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[var(--color-text-primary)] font-bold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Joueurs ({connectedPlayers.length})
                </h3>
                {minPlayers > 1 && (
                  <span className="text-xs text-[var(--color-text-secondary)]">
                    Min: {minPlayers} joueurs
                  </span>
                )}
              </div>

              <div className="space-y-2">
                {connectedPlayers.map((player) => {
                  const isCurrentPlayer = player.id === currentPlayerId;

                  return (
                    <div
                      key={player.id}
                      className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 border-[#1B1B1B] shadow-[2px_2px_0_#1B1B1B] ${
                        isCurrentPlayer
                          ? "bg-[var(--color-brand-primary-light)]"
                          : "bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--color-brand-primary)] border-2 border-[#1B1B1B] flex items-center justify-center text-[#1B1B1B] font-black">
                          {getPlayerInitial(player.displayName)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[var(--color-text-primary)] font-bold">
                              {player.displayName}
                            </span>
                            {player.isHost && !isCurrentPlayer && (
                              <Badge
                                variant="warning"
                                size="sm"
                                leftIcon={<Crown className="w-3 h-3" />}
                              >
                                Hote
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-[var(--color-text-secondary)]">
                            {player.connected ? "Connecte" : "Deconnecte"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {remainingPlayers > 0 && (
                <div className="mt-4 p-3 bg-[#FFF1C9] border-2 border-[#1B1B1B] rounded-xl shadow-[2px_2px_0_#1B1B1B]">
                  <p className="text-[#92400E] text-sm text-center font-semibold">
                    En attente de {remainingPlayers} joueur(s) supplementaire(s)...
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {onCopyInvite && (
                <Button
                  variant="secondary"
                  className="w-full flex items-center justify-center gap-2"
                  onClick={handleCopyInvite}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? "Lien copie !" : "Copier le lien d&apos;invitation"}
                </Button>
              )}

              {isHost && (
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!canStart}
                  onClick={onStartGame}
                >
                  {canStart
                    ? "Demarrer la partie"
                    : `En attente de ${minPlayers} joueurs`}
                </Button>
              )}

              {!isHost && (
                <div className="p-3 bg-white border-2 border-[#1B1B1B] rounded-xl shadow-[2px_2px_0_#1B1B1B]">
                  <p className="text-[var(--color-text-secondary)] text-sm text-center font-semibold">
                    En attente que l&apos;hote demarre la partie...
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export const WaitingRoom = memo(WaitingRoomComponent);
WaitingRoom.displayName = "WaitingRoom";

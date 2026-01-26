"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui";
import { Badge } from "@/components/ui/Badge";
import { Users, Crown, Copy, Check } from "lucide-react";
import type { RoomPlayer } from "@/types";
import { memo, useCallback, useMemo, useState } from "react";

/**
 * Props du WaitingRoom
 */
export interface WaitingRoomProps {
  /** ID de la room */
  roomId: string;

  /** Liste des joueurs dans la room */
  players: RoomPlayer[];

  /** ID du joueur actuel */
  currentPlayerId: string;

  /** Le joueur actuel est-il l'hôte ? */
  isHost: boolean;

  /** Callback pour démarrer la partie (host only) */
  onStartGame?: () => void;

  /** Callback pour copier le lien d'invitation */
  onCopyInvite?: () => void;

  /** Nombre minimum de joueurs pour démarrer */
  minPlayers?: number;

  /** Nom de l'univers (optionnel) */
  universeName?: string;

  /** Nombre de chansons configurées */
  songsCount?: number;
}

/**
 * WaitingRoom
 *
 * Écran de lobby multiplayer avant que la partie démarre.
 * Affiche les joueurs connectés, permet de copier le lien d'invitation,
 * et permet à l'hôte de démarrer la partie.
 *
 * @example
 * ```tsx
 * <WaitingRoom
 *   roomId="abc123"
 *   players={players}
 *   currentPlayerId="player-1"
 *   isHost={true}
 *   onStartGame={() => startGame()}
 *   onCopyInvite={() => copyToClipboard(inviteLink)}
 *   universeName="Disney"
 *   songsCount={10}
 * />
 * ```
 */
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

  const connectedPlayers = useMemo(
    () => players.filter((player) => player.connected !== false),
    [players]
  );
  const canStart = useMemo(
    () => connectedPlayers.length >= minPlayers && isHost,
    [connectedPlayers.length, minPlayers, isHost]
  );

  const handleCopyInvite = useCallback(() => {
    if (onCopyInvite) {
      onCopyInvite();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [onCopyInvite]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center p-6">
      <Card surface="elevated" glow="purple" size="lg" className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-center text-3xl">Salle d&apos;attente</CardTitle>
          <div className="flex justify-center mt-4">
            <Badge variant="magic" size="lg" glow pulse>
              Room: {roomId}
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          <div className="space-y-6">
            {/* Informations univers */}
            {universeName && (
              <div className="text-center">
                <p className="text-gray-300 text-sm mb-2">Univers sélectionné</p>
                <Badge variant="primary" size="lg">
                  {universeName}
                </Badge>
                {songsCount !== undefined && (
                  <p className="text-gray-400 text-xs mt-2">{songsCount} chansons</p>
                )}
              </div>
            )}

            {/* Liste des joueurs */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Joueurs ({connectedPlayers.length})
                </h3>
                {minPlayers > 1 && (
                  <span className="text-xs text-gray-400">
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
                      className={`
                        flex items-center justify-between px-4 py-3 rounded-xl
                        ${isCurrentPlayer
                          ? "bg-purple-500/20 border border-purple-500/40"
                          : "bg-slate-800/50 border border-slate-700/50"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                          {player.displayName[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">
                              {player.displayName}
                            </span>
                            {isCurrentPlayer && (
                              <Badge variant="primary" size="sm">
                                Toi
                              </Badge>
                            )}
                            {player.isHost && (
                              <Badge variant="magic" size="sm" leftIcon={<Crown className="w-3 h-3" />}>
                                Hôte
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">
                            {player.connected ? "Connecté" : "Déconnecté"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message si pas assez de joueurs */}
              {connectedPlayers.length < minPlayers && (
                <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <p className="text-yellow-300 text-sm text-center">
                    En attente de {minPlayers - connectedPlayers.length} joueur(s) supplémentaire(s)...
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Bouton copier invitation */}
              {onCopyInvite && (
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  onClick={handleCopyInvite}
                >
                  {copied ? "Lien copié !" : "Copier le lien d'invitation"}
                </Button>
              )}

              {/* Bouton démarrer (host only) */}
              {isHost && (
                <Button
                  variant="magic"
                  fullWidth
                  size="lg"
                  glow
                  disabled={!canStart}
                  onClick={onStartGame}
                >
                  {canStart ? "Démarrer la partie" : `En attente de ${minPlayers} joueurs`}
                </Button>
              )}

              {/* Message pour les non-hôtes */}
              {!isHost && (
                <div className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-xl">
                  <p className="text-gray-300 text-sm text-center">
                    En attente que l&apos;hôte démarre la partie...
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

"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Home as HomeIcon } from "lucide-react";
import { usePartyKitRoom } from "@/features/multiplayer-game/hooks/usePartyKitRoom";
import { useIdentity } from "@/features/game-ui/hooks/useIdentity";
import { Leaderboard } from "@/features/scores/components/Leaderboard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { QuitRoomButton } from "@/components/ui/QuitRoomButton";
import { ConfirmActionButton } from "@/components/ui/ConfirmActionButton";
import type { RoomPlayer } from "@/types";

export default function MultiScoresPage() {
  const router = useRouter();
  const params = useParams<{ roomId: string }>();
  const searchParams = useSearchParams();
  const roomId = params?.roomId;

  const { playerId, displayName, ready: identityReady } = useIdentity();
  const queryPlayerId = searchParams?.get("player");
  const queryDisplayName = searchParams?.get("name");

  const {
    players,
    state,
    isConnected,
    isHost,
    leaveRoom,
    resetToWaiting,
    authRequired,
    authError,
  } = usePartyKitRoom(
    identityReady && playerId && roomId
      ? {
          roomId,
          playerId: queryPlayerId || playerId,
          displayName: queryDisplayName || displayName || `Joueur-${playerId.slice(0, 4)}`,
          navigate: (url) => router.push(url),
        }
      : {}
  );

  const currentPlayerId = useMemo(
    () => queryPlayerId || playerId || "",
    [queryPlayerId, playerId]
  );

  const storedScores = useMemo(() => {
    if (typeof window === "undefined" || !roomId || state !== "results") return null;
    try {
      const raw = sessionStorage.getItem(`blindtest_scores_${roomId}`);
      if (!raw) return null;
      return JSON.parse(raw) as Array<RoomPlayer & { rank?: number }>;
    } catch {
      return null;
    }
  }, [roomId, state]);

  const playersToShow = useMemo(
    () => (storedScores && storedScores.length > 0 ? storedScores : players),
    [storedScores, players]
  );

  const handleLeaveRoom = useCallback(() => {
    leaveRoom?.();
    router.push("/");
  }, [leaveRoom, router]);

  if (!roomId || !identityReady || !playerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--color-surface-base)] text-[var(--color-text-primary)]">
        {!identityReady ? <LoadingSpinner /> : <ErrorMessage message="Room introuvable" />}
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-[var(--color-text-primary)] mt-4 font-semibold">
            Connexion au serveur...
          </p>
        </div>
      </div>
    );
  }

  if (authRequired) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-4">
        <div className="w-full max-w-sm magic-card p-6 space-y-4">
          <div className="text-center">
            <p className="text-lg font-bold text-[var(--color-text-primary)]">
              Room protegee
            </p>
            <p className="text-sm text-[var(--color-text-secondary)] mt-2">
              Entrez le mot de passe pour voir les scores.
            </p>
          </div>
          {authError && (
            <div className="text-xs text-red-600 text-center">{authError}</div>
          )}
          <QuitRoomButton
            onConfirm={handleLeaveRoom}
            title="Quitter la salle ?"
            className="w-full"
          />
        </div>
      </div>
    );
  }

  if (state !== "results") {
    return (
      <div className="min-h-screen bg-[var(--color-surface-base)] flex items-center justify-center p-4">
        <div className="text-center">
          <ErrorMessage message="La partie n'est pas encore terminee" />
          <QuitRoomButton
            onConfirm={handleLeaveRoom}
            title="Quitter la partie ?"
            className="mt-6"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-surface-base)] relative overflow-hidden">
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#FDE68A]/40 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#BFDBFE]/40 rounded-full blur-3xl" />
      </div>

      <div className="fixed top-3 left-2 sm:top-6 sm:left-6 z-50 flex flex-col items-start gap-2">
        {isHost && (
          <ConfirmActionButton
            buttonLabel="Accueil"
            title="Retour a la salle d'attente ?"
            message="Vous allez revenir a la salle d'attente. La partie restera configuree."
            confirmText="Oui, retour"
            cancelText="Annuler"
            onConfirm={() => void resetToWaiting?.()}
            variant="warning"
            className="magic-button home-button px-3 py-2 sm:px-6 sm:py-3 flex items-center gap-1 sm:gap-2 text-sm sm:text-base"
          >
            <HomeIcon className="text-base sm:text-lg" />
            <span className="home-button-label hidden sm:inline">Accueil</span>
          </ConfirmActionButton>
        )}
        <QuitRoomButton onConfirm={handleLeaveRoom} title="Quitter la partie ?" />
      </div>

      <div className="container mx-auto px-4 py-8 pb-24 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-extrabold text-[var(--color-text-primary)] mb-2">
              Tableau des scores
            </h1>
          </div>

          <div className="bg-white rounded-2xl border-[3px] border-[#1B1B1B] p-6 shadow-[4px_4px_0_#1B1B1B]">
            {playersToShow.length === 0 ? (
              <div className="text-center text-[var(--color-text-secondary)] py-8">
                Aucun joueur
              </div>
            ) : (
              <Leaderboard players={playersToShow} currentPlayerId={currentPlayerId} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

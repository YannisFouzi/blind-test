"use client";

import { useEffect, useMemo, useState } from "react";
import type { GameAnswer, Song } from "@/types";
import { usePartyKitRoom } from "@/hooks/usePartyKitRoom";
import { useWorksQuery } from "@/hooks/queries";

/**
 * Options pour useMultiplayerGame
 */
export interface UseMultiplayerGameOptions {
  /** ID de l'univers musical */
  universeId: string;

  /** ID de la room PartyKit */
  roomId?: string;

  /** ID du joueur */
  playerId?: string;

  /** Nom d'affichage du joueur */
  displayName?: string;

  /** Callback pour précharger la prochaine chanson */
  preloadNextTrack?: (song: Song) => void;
}

/**
 * Hook useMultiplayerGame
 *
 * Gère toute la logique du mode multiplayer :
 * - Connexion WebSocket via PartyKit
 * - Synchronisation avec les autres joueurs
 * - Gestion des réponses et validation
 * - Navigation (next song, start game)
 * - Calcul du score en temps réel
 *
 * @example
 * ```tsx
 * const game = useMultiplayerGame({
 *   universeId: "disney",
 *   roomId: "abc123",
 *   playerId: "player-1",
 *   displayName: "Alice",
 *   preloadNextTrack: (song) => console.log("Preload", song.audioUrl),
 * });
 *
 * return (
 *   <div>
 *     <button onClick={() => game.handleAnswer(workId)}>Répondre</button>
 *     {game.isHost && <button onClick={game.handleNextSong}>Suivant</button>}
 *   </div>
 * );
 * ```
 */
export const useMultiplayerGame = ({
  universeId,
  roomId,
  playerId,
  displayName,
  preloadNextTrack,
}: UseMultiplayerGameOptions) => {
  // ============================================================
  // WebSocket Connection (PartyKit)
  // ============================================================

  const {
    room,
    players,
    responses,
    currentSong,
    currentSongIndex,
    state,
    canGoNext,
    goNextSong,
    showScores,
    submitAnswer,
    startGame,
    options,
    allowedWorks,
    configureRoom,
    isConnected,
    isHost: isHostFromRoom,
    authRequired,
    authError,
    submitPassword,
    allPlayersAnswered,
  } = usePartyKitRoom({ roomId, playerId, displayName });

  // ============================================================
  // Works Data (TanStack Query avec cache)
  // ============================================================

  const { data: works = [], isLoading: isLoadingWorks } = useWorksQuery(universeId);

  // ============================================================
  // Local UI State
  // ============================================================

  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [gameAnswer, setGameAnswer] = useState<GameAnswer | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [lastGain, setLastGain] = useState<{ points: number; key: number } | null>(null);

  // ============================================================
  // Computed Values
  // ============================================================

  /**
   * Réponse du joueur actuel pour la chanson actuelle
   */
  const currentSongAnswer = useMemo(() => {
    if (!currentSong || !playerId) return null;
    return responses.find((r) => r.playerId === playerId && r.songId === currentSong.id) ?? null;
  }, [responses, playerId, currentSong]);

  /**
   * Le joueur a-t-il déjà répondu à la chanson actuelle ?
   */
  const isCurrentSongAnswered = Boolean(currentSongAnswer);

  /**
   * Works filtrés selon allowedWorks (si défini)
   */
  const filteredWorks = useMemo(() => {
    if (allowedWorks && allowedWorks.length) {
      return works.filter((w) => allowedWorks.includes(w.id));
    }
    return works;
  }, [works, allowedWorks]);

  /**
   * Le joueur est-il l'hôte ?
   */
  const isHost = useMemo(() => {
    return isHostFromRoom;
  }, [isHostFromRoom]);

  /**
   * Peut-on revenir en arrière ? (Non en multiplayer)
   */
  const canGoPrev = false; // Multiplayer = pas de prev

  // ============================================================
  // Effects
  // ============================================================

  /**
   * Reset l'état local quand la chanson change
   */
  useEffect(() => {
    setSelectedWork(null);
    setGameAnswer(null);
    setShowAnswer(false);
    setLastGain(null);
  }, [currentSong?.id]);

  /**
   * Masquer l'animation des points apres 1s
   */
  useEffect(() => {
    if (!lastGain) return;
    const timeoutId = setTimeout(() => setLastGain(null), 2000);
    return () => clearTimeout(timeoutId);
  }, [lastGain]);

  /**
   * Reset la sélection si l'œuvre n'est plus autorisée
   */
  useEffect(() => {
    if (selectedWork && allowedWorks && allowedWorks.length && !allowedWorks.includes(selectedWork)) {
      setSelectedWork(null);
    }
  }, [allowedWorks, selectedWork]);

  /**
   * Précharger la prochaine chanson
   */
  useEffect(() => {
    if (currentSong && preloadNextTrack && room && room.songs[currentSongIndex + 1]) {
      const nextSong = room.songs[currentSongIndex + 1];
      setTimeout(() => preloadNextTrack(nextSong), 1000);
    }
  }, [currentSong, preloadNextTrack, room, currentSongIndex]);

  /**
   * Log state snapshot (debug)
   */
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.info("[useMultiplayerGame] state snapshot", {
        roomId: room?.id,
        state,
        songs: room?.songs?.length ?? 0,
        currentSongId: currentSong?.id,
        players: players.length,
        isHost,
        isConnected,
      });
    }
  }, [room?.id, state, room?.songs?.length, currentSong?.id, players.length, isHost, isConnected]);

  // ============================================================
  // Actions
  // ============================================================

  /**
   * Sélectionner une œuvre (réponse)
   */
  const handleAnswer = (workId: string) => {
    if (showAnswer || isCurrentSongAnswered) return;
    setSelectedWork(workId);
  };

  /**
   * Valider la réponse
   */
  const validateAnswer = async () => {
    if (!currentSong || !selectedWork) return;

    if (state !== "playing") {
      setSubmitError("La partie n'a pas démarré");
      return;
    }

    const isCorrect = selectedWork === currentSong.workId;

    try {
      console.log("[useMultiplayerGame] submit answer", {
        roomId,
        songId: currentSong.id,
        playerId,
        selectedWork,
        isCorrect,
      });

      const result = await submitAnswer(selectedWork, isCorrect);

      if (result.success) {
        const pointsEarned = result.data?.points ?? 0;
        const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();

        setLastGain({ points: pointsEarned, key: timestamp });
        setSubmitError(null);
        setGameAnswer({
          songId: currentSong.id,
          workId: currentSong.workId,
          selectedWorkId: selectedWork,
          isCorrect,
          answeredAt: new Date(),
        });
        setShowAnswer(true);
      } else {
        console.error("[useMultiplayerGame] submit answer error", result.error);
        setSubmitError(result.error || "Impossible d'enregistrer la réponse");
      }
    } catch (error) {
      console.error("[useMultiplayerGame] submit answer exception", error);
      setSubmitError(error instanceof Error ? error.message : "Erreur inconnue lors de la validation");
    }
  };

  /**
   * Passer à la chanson suivante (host only)
   */
  const nextSong = async () => {
    if (!canGoNext) return;
    await goNextSong();
  };

  /**
   * Afficher les scores (host only)
   */
  const handleShowScores = async () => {
    if (!isHost) return;
    await showScores();
  };

  /**
   * Démarrer la partie (host only)
   */
  const handleStartGame = async () => {
    if (!isHost) return;
    await startGame();
  };

  /**
   * Configurer la room avec songs (host only)
   */
  const handleConfigureRoom = async (songs: Song[], universeIdParam: string, allowedWorksParam?: string[], optionsParam?: { noSeek: boolean }) => {
    if (!isHost) return;
    await configureRoom(universeIdParam, songs, allowedWorksParam, optionsParam);
  };

  // ============================================================
  // Return
  // ============================================================

  return {
    // Mode
    mode: "multiplayer" as const,

    // Room state
    room,
    players,
    responses,
    state,
    isConnected,
    isHost,
    canGoNext,
    canGoPrev,

    // Works
    works: filteredWorks,
    isLoadingWorks,
    allowedWorks,

    // Current song
    currentSong,
    currentSongIndex,
    totalSongs: room?.songs?.length ?? 0,

    // Answer state
    selectedWork,
    showAnswer,
    gameAnswer,
    currentSongAnswer,
    isCurrentSongAnswered,
    submitError,

    // Score
    lastGain,

    // Options
    options,

    // Actions
    handleAnswer,
    validateAnswer,
    nextSong,
    showScores: handleShowScores,
    startGame: handleStartGame,
    configureRoom: handleConfigureRoom,
    authRequired,
    authError,
    submitPassword,
    allPlayersAnswered,
  };
};

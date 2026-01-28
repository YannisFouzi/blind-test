"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { GameAnswer, Song } from "@/types";
import { usePartyKitRoom } from "@/hooks/usePartyKitRoom";
import { useWorksQuery } from "@/hooks/queries";
import { getCurrentRound, type GameRound } from "@/utils/mysteryEffects";

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
  // Sélections en mode double : songId -> selectedWorkId
  const [doubleSelections, setDoubleSelections] = useState<Record<string, string | null>>({});

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

  /**
   * Round actuel (modèle "rounds" pour effets mystères)
   */
  const currentRound = useMemo<GameRound | undefined>(() => {
    return room?.currentRound;
  }, [room?.currentRound]);

  /**
   * Mode reverse activé ?
   */
  const isReverseMode = useMemo(() => {
    return currentRound?.type === "reverse";
  }, [currentRound]);

  /**
   * Mode double activé ?
   */
  const isDoubleMode = useMemo(() => {
    return currentRound?.type === "double";
  }, [currentRound]);

  /**
   * Chansons du round actuel (pour mode double : 2 chansons, sinon 1)
   */
  const currentRoundSongs = useMemo<Song[]>(() => {
    if (!room?.songs || !currentRound) {
      return currentSong ? [currentSong] : [];
    }

    const songsForRound = currentRound.songIds
      .map((id) => room.songs.find((s) => s.id === id))
      .filter((s): s is Song => Boolean(s));

    if (!songsForRound.length && currentSong) {
      return [currentSong];
    }

    return songsForRound;
  }, [room?.songs, currentRound, currentSong]);

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
    setDoubleSelections({});
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
    console.log("[useMultiplayerGame] 🔍 STATE SNAPSHOT", {
      roomId: room?.id,
      state,
      songs: room?.songs?.length ?? 0,
      currentSongId: currentSong?.id,
      currentSongTitle: currentSong?.title,
      players: players.length,
      isHost,
      isConnected,
      works: works.length,
      filteredWorks: filteredWorks.length,
      isLoadingWorks,
      allowedWorks: allowedWorks?.length ?? 0,
      timestamp: Date.now(),
    });
  }, [room?.id, state, room?.songs?.length, currentSong?.id, currentSong?.title, players.length, isHost, isConnected, works.length, filteredWorks.length, isLoadingWorks, allowedWorks?.length]);

  // ============================================================
  // Actions
  // ============================================================

  /**
   * Sélectionner une œuvre (réponse)
   */
  const handleAnswer = (workId: string) => {
    if (showAnswer || isCurrentSongAnswered) return;

    // En mode double, la sélection passe par un handler dédié
    if (isDoubleMode) {
      return;
    }

    setSelectedWork(workId);
  };

  /**
   * Valider la réponse
   */
  const validateAnswer = async () => {
    // Mode double : utiliser validateAnswerDouble
    if (isDoubleMode) {
      return validateAnswerDouble();
    }

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
  const handleConfigureRoom = async (
    songs: Song[],
    universeIdParam: string,
    allowedWorksParam?: string[],
    optionsParam?: { noSeek: boolean },
    mysteryEffectsConfig?: {
      enabled: boolean;
      frequency: number;
      effects: ("double" | "reverse")[];
    }
  ) => {
    if (!isHost) return;
    await configureRoom(universeIdParam, songs, allowedWorksParam, optionsParam, mysteryEffectsConfig);
  };

  /**
   * Sélectionner une œuvre pour un slot en mode double
   */
  const handleDoubleSelection = useCallback(
    (slotIndex: 0 | 1, workId: string) => {
      if (showAnswer || isCurrentSongAnswered || !currentRound || currentRound.type !== "double") {
        return;
      }

      const songId = currentRound.songIds[slotIndex];
      if (!songId) return;

      // Vérifier si une réponse est déjà enregistrée pour cette chanson (via responses)
      const hasAnswered = responses.some(
        (r) => r.songId === songId && r.playerId === playerId
      );
      if (hasAnswered) {
        return;
      }

      setDoubleSelections((prev) => ({
        ...prev,
        [songId]: workId,
      }));
    },
    [showAnswer, isCurrentSongAnswered, currentRound, responses, playerId]
  );

  /**
   * Retirer une sélection pour une œuvre en mode double (un slot à la fois)
   */
  const clearDoubleSelectionForWork = useCallback(
    (workId: string) => {
      if (!currentRound || currentRound.type !== "double" || showAnswer) return;

      setDoubleSelections((prev) => {
        const songIds = currentRound.songIds;
        const newSelections = { ...prev };

        // Trouver un songId du round actuel qui pointe sur cette œuvre
        const targetSongId = songIds.find((id) => newSelections[id] === workId);
        if (!targetSongId) {
          return prev;
        }

        newSelections[targetSongId] = null;
        return newSelections;
      });
    },
    [currentRound, showAnswer]
  );

  /**
   * Valider les réponses en mode double
   * ⭐ Utilise un multi-set (ordre-indépendant) comme en solo pour corriger le mapping
   */
  const validateAnswerDouble = useCallback(async () => {
    if (!currentRound || currentRound.type !== "double" || !currentRoundSongs || currentRoundSongs.length < 2) {
      return;
    }

    if (state !== "playing") {
      setSubmitError("La partie n'a pas démarré");
      return;
    }

    // Préparer les infos chansons + sélections
    const songInfos = currentRoundSongs
      .map((song) => {
        return {
          songId: song.id,
          song,
          selectedId: doubleSelections[song.id] ?? null,
        };
      })
      .filter((info) => Boolean(info.song));

    if (songInfos.length < 2) {
      setSubmitError("Veuillez sélectionner deux œuvres");
      return;
    }

    // Vérifier que les 2 slots sont remplis
    const allSelected = songInfos.every((info) => info.selectedId !== null);
    if (!allSelected) {
      setSubmitError("Veuillez sélectionner deux œuvres");
      return;
    }

    try {
      // Ensemble des œuvres correctes (ordre-indépendant, avec multiplicité)
      const remainingCorrectWorks: string[] = songInfos.map((info) => info.song.workId);

      // Construire le mapping explicite songId → workId avec multi-set
      const answers: Array<{ songId: string; workId: string | null }> = [];

      songInfos.forEach((info) => {
        const selectedId = info.selectedId;
        let matchedWorkId: string | null = null;

        if (selectedId) {
          const matchIndex = remainingCorrectWorks.indexOf(selectedId);
          if (matchIndex !== -1) {
            // On consomme une occurrence de cette œuvre correcte (multi-set)
            remainingCorrectWorks.splice(matchIndex, 1);
            matchedWorkId = selectedId;
          } else {
            // Sélection incorrecte, mais on l'envoie quand même
            matchedWorkId = selectedId;
          }
        }

        answers.push({
          songId: info.songId,
          workId: matchedWorkId,
        });
      });

      console.log("[useMultiplayerGame] submit double answer", {
        roomId,
        answers,
        playerId,
      });

      const result = await submitAnswer(null, false, answers);

      if (result.success) {
        const pointsEarned = result.data?.points ?? 0;
        const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();

        setLastGain({ points: pointsEarned, key: timestamp });
        setSubmitError(null);
        setShowAnswer(true);
      } else {
        console.error("[useMultiplayerGame] submit double answer error", result.error);
        setSubmitError(result.error || "Impossible d'enregistrer les réponses");
      }
    } catch (error) {
      console.error("[useMultiplayerGame] submit double answer exception", error);
      setSubmitError(error instanceof Error ? error.message : "Erreur inconnue lors de la validation");
    }
  }, [currentRound, currentRoundSongs, doubleSelections, state, submitAnswer, roomId, playerId]);

  // Sélections actuelles pour les deux chansons du round double (slot 1 / slot 2)
  const doubleSelectedWorkSlot1: string | null = useMemo(() => {
    if (!currentRound || currentRound.type !== "double" || !currentRoundSongs || currentRoundSongs.length < 1) {
      return null;
    }
    const [songId1] = currentRound.songIds;
    return doubleSelections[songId1] ?? null;
  }, [currentRound, currentRoundSongs, doubleSelections]);

  const doubleSelectedWorkSlot2: string | null = useMemo(() => {
    if (!currentRound || currentRound.type !== "double" || !currentRoundSongs || currentRoundSongs.length < 2) {
      return null;
    }
    const [, songId2] = currentRound.songIds;
    return songId2 ? doubleSelections[songId2] ?? null : null;
  }, [currentRound, currentRoundSongs, doubleSelections]);

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
    displayedSongIndex: room?.displayedSongIndex ?? currentSongIndex + 1,
    displayedTotalSongs: room?.displayedTotalSongs ?? room?.songs?.length ?? 0,

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

    // Effets mystères (multi)
    currentRound,
    isReverseMode,
    isDoubleMode,
    currentRoundSongs,
    doubleSelectedWorkSlot1,
    doubleSelectedWorkSlot2,
    handleDoubleSelection,
    clearDoubleSelectionForWork,

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

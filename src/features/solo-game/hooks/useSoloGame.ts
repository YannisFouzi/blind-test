"use client";

import { useCallback, useEffect, useState } from "react";
import type { Song, Work, GameSession, GameAnswer } from "@/types";
import { getSongsByWork, getWorksByUniverse, getWorksByIds } from "@/services/firebase";
import { generateId, shuffleArray } from "@/utils/formatters";

/**
 * ID spécial pour le mode custom
 */
export const CUSTOM_UNIVERSE_ID = "__custom__";

/**
 * Options du hook useSoloGame
 */
export interface UseSoloGameOptions {
  /** ID de l'univers (ex: "disney", "90s") ou "__custom__" pour mode custom */
  universeId: string;

  /** Callback pour précharger la prochaine chanson */
  preloadNextTrack?: (song: Song) => void;

  /** Liste des œuvres autorisées (pour filtrage custom) */
  allowedWorks?: string[];

  /** Nombre maximum de chansons */
  maxSongs?: number;
}

/**
 * Hook useSoloGame
 *
 * Gère toute la logique du mode solo :
 * - Chargement des works et songs
 * - Gestion des réponses
 * - Navigation (next/prev)
 * - Calcul du score
 *
 * @example
 * ```tsx
 * const game = useSoloGame({
 *   universeId: "disney",
 *   preloadNextTrack: (song) => console.log("Preload", song.audioUrl),
 *   maxSongs: 10
 * });
 *
 * return (
 *   <div>
 *     <button onClick={() => game.handleAnswer(workId)}>Répondre</button>
 *     <button onClick={game.nextSong}>Suivant</button>
 *   </div>
 * );
 * ```
 */
export const useSoloGame = ({
  universeId,
  preloadNextTrack,
  allowedWorks,
  maxSongs,
}: UseSoloGameOptions) => {
  // État principal
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [gameAnswer, setGameAnswer] = useState<GameAnswer | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [lastGain, setLastGain] = useState<{ points: number; key: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Initialiser le jeu : charger works + songs + créer session
   */
  const initializeGame = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      let fetchedWorks: Work[] = [];
      let filteredWorks: Work[] = [];

      // Mode Custom : charger les works par leurs IDs directement
      if (universeId === CUSTOM_UNIVERSE_ID && allowedWorks && allowedWorks.length > 0) {
        const worksResult = await getWorksByIds(allowedWorks);
        fetchedWorks = worksResult.success && worksResult.data ? worksResult.data : [];
        filteredWorks = fetchedWorks; // Tous les works récupérés sont déjà filtrés
      } else {
        // Mode normal : charger les works de l'univers
        const worksResult = await getWorksByUniverse(universeId);
        fetchedWorks = worksResult.success && worksResult.data ? worksResult.data : [];

        filteredWorks =
          allowedWorks && allowedWorks.length
            ? fetchedWorks.filter((w) => allowedWorks.includes(w.id))
            : fetchedWorks;
      }

      if (!fetchedWorks.length) {
        setError(`Aucune œuvre trouvée pour l'univers "${universeId}"`);
        setLoading(false);
        return;
      }

      setWorks(filteredWorks);

      const songsSource = filteredWorks.length ? filteredWorks : fetchedWorks;

      // Charger toutes les chansons de toutes les œuvres
      const songs = songsSource.length
        ? (
            await Promise.all(
              songsSource.map(async (work) => {
                const result = await getSongsByWork(work.id);
                return result.success && result.data ? result.data : [];
              })
            )
          ).flat()
        : [];

      if (!songs.length) {
        setError(`Aucune chanson trouvée pour l'univers "${universeId}"`);
        setLoading(false);
        return;
      }

      // Mélanger et limiter
      const shuffledSongs = shuffleArray(songs);
      const limitedSongs =
        maxSongs && maxSongs > 0 && maxSongs < shuffledSongs.length
          ? shuffledSongs.slice(0, maxSongs)
          : shuffledSongs;

      // Créer la session
      const newGameSession: GameSession = {
        id: generateId(),
        universeId,
        songs: limitedSongs,
        currentSongIndex: 0,
        score: { correct: 0, incorrect: 0 },
        answers: [],
        createdAt: new Date(),
      };

      setGameSession(newGameSession);
      setCurrentSong(limitedSongs[0]);
      setLoading(false);
    } catch (err) {
      console.error("[useSoloGame] Erreur lors de l'initialisation:", err);
      setError("Erreur lors du chargement du jeu");
      setLoading(false);
    }
  }, [universeId, allowedWorks, maxSongs]);

  /**
   * Sélectionner une œuvre (réponse)
   */
  const handleAnswer = useCallback(
    (workId: string) => {
      if (showAnswer || !gameSession || !currentSong) return;

      // Vérifier si déjà répondu
      const existingAnswer = gameSession.answers.find((answer) => answer.songId === currentSong.id);
      if (existingAnswer) {
        return;
      }

      const isCorrect = workId === currentSong.workId;

      setSelectedWork(workId);
      setGameAnswer({
        songId: currentSong.id,
        workId: currentSong.workId,
        selectedWorkId: workId,
        isCorrect,
        answeredAt: new Date(),
      });
    },
    [showAnswer, gameSession, currentSong]
  );

  /**
   * Valider la réponse
   */
  const validateAnswer = useCallback(() => {
    if (!gameSession || !currentSong || !gameAnswer) return;

    // Vérifier si déjà répondu
    if (gameSession.answers.some((answer) => answer.songId === currentSong.id)) {
      return;
    }

    // Mettre à jour la session
    const updatedSession: GameSession = {
      ...gameSession,
      answers: [...gameSession.answers, gameAnswer],
      score: {
        correct: gameAnswer.isCorrect ? gameSession.score.correct + 1 : gameSession.score.correct,
        incorrect: gameAnswer.isCorrect ? gameSession.score.incorrect : gameSession.score.incorrect + 1,
      },
    };

    // Animation de points
    const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();
    setLastGain({ points: gameAnswer.isCorrect ? 1 : 0, key: timestamp });

    setGameSession(updatedSession);
    setShowAnswer(true);
  }, [gameSession, currentSong, gameAnswer]);

  /**
   * Réinitialiser l'état pour la chanson actuelle
   */
  const resetGameState = useCallback(() => {
    if (!gameSession || !currentSong) {
      setSelectedWork(null);
      setGameAnswer(null);
      setShowAnswer(false);
      return;
    }

    const existingAnswer = gameSession.answers.find((answer) => answer.songId === currentSong.id);

    if (existingAnswer) {
      setSelectedWork(existingAnswer.selectedWorkId);
      setGameAnswer(existingAnswer);
      setShowAnswer(true);
    } else {
      setSelectedWork(null);
      setGameAnswer(null);
      setShowAnswer(false);
    }
  }, [gameSession, currentSong]);

  /**
   * Passer à la chanson suivante
   */
  const nextSong = useCallback(() => {
    if (!gameSession) return;

    const nextIndex = gameSession.currentSongIndex + 1;

    if (nextIndex < gameSession.songs.length) {
      setGameSession({
        ...gameSession,
        currentSongIndex: nextIndex,
      });
      setCurrentSong(gameSession.songs[nextIndex]);
      resetGameState();
    }
  }, [gameSession, resetGameState]);

  /**
   * Revenir à la chanson précédente
   */
  const prevSong = useCallback(() => {
    if (!gameSession) return;

    const prevIndex = gameSession.currentSongIndex - 1;

    if (prevIndex >= 0) {
      setGameSession({
        ...gameSession,
        currentSongIndex: prevIndex,
      });
      setCurrentSong(gameSession.songs[prevIndex]);
      resetGameState();
    }
  }, [gameSession, resetGameState]);

  /**
   * Recommencer le jeu
   */
  const restartGame = useCallback(() => {
    initializeGame();
  }, [initializeGame]);

  // ========================================
  // EFFECTS
  // ========================================

  /**
   * Initialiser le jeu au montage
   */
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  /**
   * Réinitialiser l'état quand la chanson change
   */
  useEffect(() => {
    if (gameSession && currentSong) {
      resetGameState();
    }
  }, [gameSession, currentSong, resetGameState]);

  /**
   * Reset lastGain quand chanson change
   */
  useEffect(() => {
    setLastGain(null);
  }, [currentSong?.id]);

  /**
   * Précharger la prochaine chanson
   */
  useEffect(() => {
    if (gameSession && currentSong && preloadNextTrack) {
      const nextIndex = gameSession.currentSongIndex + 1;
      if (nextIndex < gameSession.songs.length) {
        const nextSong = gameSession.songs[nextIndex];
        setTimeout(() => {
          preloadNextTrack(nextSong);
        }, 1000);
      }
    }
  }, [gameSession, currentSong, preloadNextTrack]);

  // ========================================
  // COMPUTED VALUES
  // ========================================

  const correctWork = works.find((work) => work.id === currentSong?.workId);
  const canGoNext = gameSession ? gameSession.currentSongIndex < gameSession.songs.length - 1 : false;
  const canGoPrev = gameSession ? gameSession.currentSongIndex > 0 : false;

  const isCurrentSongAnswered = Boolean(
    gameSession && currentSong && gameSession.answers.some((answer) => answer.songId === currentSong.id)
  );

  const currentSongAnswer =
    gameSession && currentSong
      ? gameSession.answers.find((answer) => answer.songId === currentSong.id) || null
      : null;

  const gameState: "idle" | "playing" | "finished" = !gameSession
    ? "idle"
    : gameSession.currentSongIndex >= gameSession.songs.length - 1 && isCurrentSongAnswered
    ? "finished"
    : "playing";

  // ========================================
  // RETURN
  // ========================================

  return {
    // État
    gameSession,
    works,
    currentSong,
    selectedWork,
    gameAnswer,
    showAnswer,
    lastGain,
    loading,
    error,
    gameState,

    // Computed
    correctWork,
    canGoNext,
    canGoPrev,
    isCurrentSongAnswered,
    currentSongAnswer,
    currentSongIndex: gameSession?.currentSongIndex ?? 0,
    totalSongs: gameSession?.songs.length ?? 0,
    score: gameSession?.score ?? { correct: 0, incorrect: 0 },

    // Actions
    handleAnswer,
    validateAnswer,
    nextSong,
    prevSong,
    restartGame,
    resetGameState,
  };
};

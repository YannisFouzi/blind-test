"use client";

import { useCallback, useEffect, useState } from "react";
import { GameAnswer, GameSession, Song, Work } from "@/types";
import { getSongsByWork, getWorksByUniverse, getWorksByIds } from "@/services/firebase";
import { generateId, shuffleArray } from "../utils/formatters";

// ID spécial pour le mode custom
export const CUSTOM_UNIVERSE_ID = "__custom__";

export const useGame = (
  universeId: string,
  preloadNextTrack?: (song: Song) => void,
  allowedWorks?: string[],
  maxSongs?: number
) => {
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [gameAnswer, setGameAnswer] = useState<GameAnswer | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [usingDemoData, setUsingDemoData] = useState(false);
  const [lastGain, setLastGain] = useState<{ points: number; key: number } | null>(null);

  const initializeGame = useCallback(async () => {
    try {
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

      if (!fetchedWorks.length && process.env.NODE_ENV === "development") {
        console.warn(
          `Aucune oeuvre trouvee pour l'univers "${universeId}". Creez des oeuvres dans l'admin panel.`
        );
      }

      setWorks(filteredWorks);

      const songsSource = filteredWorks.length ? filteredWorks : fetchedWorks;

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
        setUsingDemoData(false);
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `Aucune chanson trouvee pour l'univers "${universeId}". Ajoutez des chansons dans l'admin panel.`
          );
        }
        return;
      }

      setUsingDemoData(false);

      const shuffledSongs = shuffleArray(songs);
      // Limiter le nombre de chansons si maxSongs est défini
      const limitedSongs = maxSongs && maxSongs > 0 && maxSongs < shuffledSongs.length
        ? shuffledSongs.slice(0, maxSongs)
        : shuffledSongs;
      
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
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur lors de l'initialisation du jeu:", error);
      }
    }
  }, [universeId, allowedWorks, maxSongs]);

  const handleWorkSelection = (workId: string) => {
    if (showAnswer || !gameSession || !currentSong) return;

    const existingAnswer = gameSession.answers.find((answer) => answer.songId === currentSong.id);
    if (existingAnswer) {
      return;
    }

    setSelectedWork(workId);
    setGameAnswer({
      songId: currentSong.id,
      workId: currentSong.workId,
      selectedWorkId: workId,
      isCorrect: workId === currentSong.workId,
      answeredAt: new Date(),
    });
  };

  const handleValidateAnswer = () => {
    if (!gameSession || !currentSong || !gameAnswer) return;

    if (gameSession.answers.some((answer) => answer.songId === currentSong.id)) {
      return;
    }

    const updatedSession: GameSession = {
      ...gameSession,
      answers: [...gameSession.answers, gameAnswer],
      score: {
        correct: gameAnswer.isCorrect ? gameSession.score.correct + 1 : gameSession.score.correct,
        incorrect: gameAnswer.isCorrect ? gameSession.score.incorrect : gameSession.score.incorrect + 1,
      },
    };

    const timestamp = typeof performance !== "undefined" ? performance.now() : Date.now();
    setLastGain({ points: gameAnswer.isCorrect ? 1 : 0, key: timestamp });
    setGameSession(updatedSession);
    setShowAnswer(true);
  };

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

  const handleNextSong = () => {
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
  };

  const handlePrevSong = () => {
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
  };

  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  useEffect(() => {
    if (gameSession && currentSong) {
      resetGameState();
    }
  }, [gameSession, currentSong, resetGameState]);

  useEffect(() => {
    setLastGain(null);
  }, [currentSong?.id]);

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

  return {
    gameSession,
    works,
    currentSong,
    selectedWork,
    gameAnswer,
    showAnswer,
    usingDemoData,
    handleWorkSelection,
    handleValidateAnswer,
    handleNextSong,
    handlePrevSong,
    resetGameState,
    correctWork: works.find((work) => work.id === currentSong?.workId),
    canGoNext: gameSession ? gameSession.currentSongIndex < gameSession.songs.length - 1 : false,
    canGoPrev: gameSession ? gameSession.currentSongIndex > 0 : false,
    isCurrentSongAnswered: Boolean(
      gameSession &&
        currentSong &&
        gameSession.answers.some((answer) => answer.songId === currentSong.id)
    ),
    currentSongAnswer:
      gameSession && currentSong
        ? gameSession.answers.find((answer) => answer.songId === currentSong.id) || null
        : null,
    lastGain,
  };
};

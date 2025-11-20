import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import { useCallback, useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { GameAnswer, GameSession, Song, Work } from "@/types";
import { generateId, shuffleArray } from "../utils/formatters";

export const useGame = (
  universeId: string,
  preloadNextVideo?: (videoId: string) => void
) => {
  // État du jeu
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [gameAnswer, setGameAnswer] = useState<GameAnswer | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [usingDemoData, setUsingDemoData] = useState(false);

  // Initialisation du jeu
  const initializeGame = useCallback(async () => {
    try {
      // Charger les œuvres de l'univers
      const worksQuery = query(
        collection(db, "works"),
        where("universeId", "==", universeId),
        orderBy("order", "asc")
      );
      const worksSnapshot = await getDocs(worksQuery);

      // Charger les works depuis Firebase
      const fetchedWorks: Work[] = worksSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as Work[];

      if (fetchedWorks.length === 0) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `Aucune œuvre trouvée pour l'univers "${universeId}". Créez des œuvres dans l'admin panel.`
          );
        }
      }

      setWorks(fetchedWorks);

      // Charger les chansons depuis Firebase
      let songs: Song[] = [];

      try {
        // Charger toutes les chansons liées aux œuvres de cet univers
        const workIds = fetchedWorks.map((work) => work.id);
        if (workIds.length > 0) {
          const songsQuery = query(
            collection(db, "songs"),
            where("workId", "in", workIds)
          );
          const songsSnapshot = await getDocs(songsQuery);

          if (!songsSnapshot.empty) {
            songs = songsSnapshot.docs.map((doc) => ({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate() || new Date(),
            })) as Song[];
          }
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.error("Erreur lors du chargement des chansons:", error);
        }
      }

      // Vérifier qu'on a bien des chansons
      if (songs.length === 0) {
        if (process.env.NODE_ENV === "development") {
          console.warn(
            `Aucune chanson trouvée pour l'univers "${universeId}". Ajoutez des chansons dans l'admin panel.`
          );
        }
        setUsingDemoData(false);
      }

      // Mélanger les chansons
      const shuffledSongs = shuffleArray(songs);

      if (shuffledSongs.length === 0) {
        if (process.env.NODE_ENV === "development") {
          console.error("Aucune chanson trouvée pour cet univers");
        }
        return;
      }

      if (process.env.NODE_ENV === "development") {
        console.log(
          `${shuffledSongs.length} chanson(s) chargée(s) pour le jeu`
        );
        console.log("Première chanson:", shuffledSongs[0]);
      }

      const newGameSession: GameSession = {
        id: generateId(),
        universeId,
        songs: shuffledSongs,
        currentSongIndex: 0,
        score: { correct: 0, incorrect: 0 },
        answers: [],
        createdAt: new Date(),
      };

      setGameSession(newGameSession);
      setCurrentSong(shuffledSongs[0]);
    } catch (error) {
      if (process.env.NODE_ENV === "development") {
        console.error("Erreur lors de l'initialisation du jeu:", error);
      }
    }
  }, [universeId]);

  // Actions du jeu
  const handleWorkSelection = (workId: string) => {
    if (showAnswer) return;

    // Vérifier si la chanson actuelle a déjà été répondue
    if (gameSession && currentSong) {
      const existingAnswer = gameSession.answers.find(
        (answer) => answer.songId === currentSong.id
      );
      if (existingAnswer) {
        // Chanson déjà répondue, empêcher la re-sélection
        return;
      }
    }

    setSelectedWork(workId);
  };

  const handleValidateAnswer = () => {
    if (!selectedWork || !currentSong || !gameSession) return;

    const isCorrect = selectedWork === currentSong.workId;

    const answer: GameAnswer = {
      songId: currentSong.id,
      workId: currentSong.workId,
      selectedWorkId: selectedWork,
      isCorrect,
      answeredAt: new Date(),
    };

    setGameAnswer(answer);
    setShowAnswer(true);

    // Mettre à jour le score
    const newScore = {
      ...gameSession.score,
      [isCorrect ? "correct" : "incorrect"]:
        gameSession.score[isCorrect ? "correct" : "incorrect"] + 1,
    };

    setGameSession({
      ...gameSession,
      score: newScore,
      answers: [...gameSession.answers, answer],
    });
  };

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

  const resetGameState = useCallback(() => {
    if (!gameSession || !currentSong) {
      setSelectedWork(null);
      setGameAnswer(null);
      setShowAnswer(false);
      return;
    }

    // Vérifier si cette chanson a déjà été répondue
    const existingAnswer = gameSession.answers.find(
      (answer) => answer.songId === currentSong.id
    );

    if (existingAnswer) {
      // Charger l'état depuis l'historique
      setSelectedWork(existingAnswer.selectedWorkId);
      setGameAnswer(existingAnswer);
      setShowAnswer(true);
    } else {
      // Nouvelle chanson, état vierge
      setSelectedWork(null);
      setGameAnswer(null);
      setShowAnswer(false);
    }
  }, [gameSession, currentSong]);

  // Utilitaires
  const isCurrentSongAnswered = () => {
    if (!gameSession || !currentSong) return false;
    return gameSession.answers.some(
      (answer) => answer.songId === currentSong.id
    );
  };

  const getCurrentSongAnswer = () => {
    if (!gameSession || !currentSong) return null;
    return (
      gameSession.answers.find((answer) => answer.songId === currentSong.id) ||
      null
    );
  };

  // Initialisation au montage du composant
  useEffect(() => {
    initializeGame();
  }, [initializeGame]);

  // Effet pour charger l'état quand la chanson change
  useEffect(() => {
    if (gameSession && currentSong) {
      resetGameState();
    }
  }, [gameSession, currentSong, resetGameState]);

  // Effet pour précharger la chanson suivante dès l'arrivée sur une question
  useEffect(() => {
    if (gameSession && currentSong && preloadNextVideo) {
      const nextIndex = gameSession.currentSongIndex + 1;
      if (nextIndex < gameSession.songs.length) {
        const nextSong = gameSession.songs[nextIndex];
        if (process.env.NODE_ENV === "development") {
          console.log(
            `🎯 Préchargement automatique de la chanson suivante: ${nextSong.youtubeId}`
          );
        }
        // Délai léger pour laisser le lecteur principal se stabiliser
        setTimeout(() => {
          preloadNextVideo(nextSong.youtubeId);
        }, 1000);
      }
    }
  }, [gameSession, currentSong, preloadNextVideo]);

  return {
    // État
    gameSession,
    works,
    currentSong,
    selectedWork,
    gameAnswer,
    showAnswer,
    usingDemoData,

    // Actions
    handleWorkSelection,
    handleValidateAnswer,
    handleNextSong,
    handlePrevSong,
    resetGameState,

    // Getters
    correctWork: works.find((work) => work.id === currentSong?.workId),
    canGoNext: gameSession
      ? gameSession.currentSongIndex < gameSession.songs.length - 1
      : false,
    canGoPrev: gameSession ? gameSession.currentSongIndex > 0 : false,
    isCurrentSongAnswered: isCurrentSongAnswered(),
    currentSongAnswer: getCurrentSongAnswer(),
  };
};

import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { db } from "../../lib/firebase";
import { GameAnswer, GameSession, Song, Work } from "../../types";
import { createDemoSongs, defaultSongs, defaultWorks } from "../utils/demoData";
import { generateId, shuffleArray } from "../utils/formatters";

export const useGame = (universeId: string) => {
  // État du jeu
  const [gameSession, setGameSession] = useState<GameSession | null>(null);
  const [works, setWorks] = useState<Work[]>([]);
  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [gameAnswer, setGameAnswer] = useState<GameAnswer | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [usingDemoData, setUsingDemoData] = useState(false);

  // Initialisation du jeu
  const initializeGame = async () => {
    try {
      // Charger les œuvres de l'univers
      const worksQuery = query(
        collection(db, "works"),
        where("universeId", "==", universeId)
      );
      const worksSnapshot = await getDocs(worksQuery);

      let fetchedWorks: Work[];
      if (!worksSnapshot.empty) {
        fetchedWorks = worksSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
        })) as Work[];
      } else {
        // Utiliser les données par défaut pour le développement
        fetchedWorks = defaultWorks.filter(
          (work) => work.universeId === universeId
        );
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

      // Si aucune chanson n'est trouvée, créer des chansons de démonstration
      if (songs.length === 0) {
        songs = defaultSongs.filter((song) =>
          fetchedWorks.some((work) => work.id === song.workId)
        );

        if (songs.length === 0 && fetchedWorks.length > 0) {
          if (process.env.NODE_ENV === "development") {
            console.log(
              "Création de chansons de démonstration pour les œuvres trouvées"
            );
          }
          setUsingDemoData(true);
          songs = createDemoSongs(fetchedWorks);
        } else {
          setUsingDemoData(false);
        }
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
  };

  // Actions du jeu
  const handleWorkSelection = (workId: string) => {
    if (showAnswer) return;
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

  const resetGameState = () => {
    setSelectedWork(null);
    setGameAnswer(null);
    setShowAnswer(false);
  };

  // Initialisation au montage du composant
  useEffect(() => {
    initializeGame();
  }, [universeId]);

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
  };
};

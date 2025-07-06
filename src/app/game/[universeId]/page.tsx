"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaHome } from "react-icons/fa";
import { GameControls } from "../../../components/game/GameControls";
import { WorkSelector } from "../../../components/game/WorkSelector";
import { ErrorMessage } from "../../../components/ui/ErrorMessage";
import { LoadingSpinner } from "../../../components/ui/LoadingSpinner";
import { useAuth } from "../../../hooks/useAuth";
import { useGame } from "../../../hooks/useGame";
import { useYouTube } from "../../../hooks/useYouTube";
import "../../../styles/gameAnimations.css";

export default function GamePage() {
  const router = useRouter();
  const params = useParams();
  const universeId = params.universeId as string;
  const { user } = useAuth();

  const {
    gameSession,
    works,
    currentSong,
    selectedWork,
    showAnswer,
    usingDemoData,
    handleWorkSelection,
    handleValidateAnswer,
    handleNextSong,
    handlePrevSong,
    correctWork,
    canGoNext,
    canGoPrev,
    isCurrentSongAnswered,
  } = useGame(universeId);

  const {
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    youtubeError,
    handlePlayPause,
    handleVolumeChange,
    toggleMute,
    handleProgressClick,
    handleYoutubeError,
    handleYoutubeReady,
    handleYoutubeStateChange,
    formatTime,
  } = useYouTube();

  const [isLoaded, setIsLoaded] = useState(false);
  const [clickSound, setClickSound] = useState<HTMLAudioElement | null>(null);
  const [successSound, setSuccessSound] = useState<HTMLAudioElement | null>(
    null
  );

  useEffect(() => {
    // Charger les sons (sons subtils)
    const loadSounds = () => {
      const click = new Audio();
      click.volume = 0.3;
      setClickSound(click);

      const success = new Audio();
      success.volume = 0.5;
      setSuccessSound(success);
    };

    loadSounds();

    // Animation d'entrée
    const timer = setTimeout(() => {
      setIsLoaded(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const playClickSound = () => {
    if (clickSound) {
      clickSound.currentTime = 0;
      clickSound.play().catch(() => {});
    }
  };

  const playSuccessSound = () => {
    if (successSound) {
      successSound.currentTime = 0;
      successSound.play().catch(() => {});
    }
  };

  const handleNextSongWithReset = () => {
    playClickSound();
    handleNextSong();
  };

  const handlePrevSongWithReset = () => {
    playClickSound();
    handlePrevSong();
  };

  const handleWorkSelectionWithSound = (workId: string) => {
    playClickSound();
    handleWorkSelection(workId);
  };

  const handleValidateAnswerWithSound = () => {
    playSuccessSound();
    handleValidateAnswer();
  };

  if (!gameSession || !currentSong) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner />
          <p className="text-white mt-4 font-medium">
            Chargement de l'univers magique...
          </p>
        </div>
      </div>
    );
  }

  if (works.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <ErrorMessage message="Aucune œuvre trouvée pour cet univers" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-900 to-slate-900 relative overflow-hidden">
      {/* Particules flottantes d'arrière-plan */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
          />
        ))}
      </div>

      {/* Effet de brume magique */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-800/20 via-transparent to-blue-800/20 pointer-events-none" />

      {/* Navigation */}
      <div
        className={`fixed top-6 left-6 z-50 ${
          isLoaded ? "slide-in-left" : "opacity-0"
        }`}
      >
        <button
          onClick={() => {
            playClickSound();
            router.push("/");
          }}
          className="magic-button px-6 py-3 flex items-center gap-2 text-white font-semibold"
        >
          <FaHome className="text-lg" />
          <span className="hidden sm:inline">Accueil</span>
        </button>
      </div>

      {/* Conteneur principal */}
      <div className="container mx-auto px-4 py-8 relative z-10">
        {/* Grille principale responsive */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 max-w-7xl mx-auto">
          {/* Lecteur audio - Position centrale avec effet lumineux */}
          <div
            className={`xl:col-span-1 ${
              isLoaded ? "slide-in-left" : "opacity-0"
            }`}
            style={{ animationDelay: "0.3s" }}
          >
            <div className="magic-card p-8">
              <GameControls
                isPlaying={isPlaying}
                currentTime={currentTime}
                duration={duration}
                volume={volume}
                isMuted={isMuted}
                canGoPrev={canGoPrev}
                canGoNext={canGoNext}
                currentSongTitle={currentSong.title}
                currentSongVideoId={currentSong.youtubeId}
                showAnswer={showAnswer}
                usingDemoData={usingDemoData}
                youtubeError={youtubeError}
                gameSession={gameSession}
                onPlayPause={handlePlayPause}
                onPrevSong={handlePrevSongWithReset}
                onNextSong={handleNextSongWithReset}
                onVolumeChange={handleVolumeChange}
                onToggleMute={toggleMute}
                onProgressClick={handleProgressClick}
                onError={handleYoutubeError}
                onReady={handleYoutubeReady}
                onStateChange={handleYoutubeStateChange}
                formatTime={formatTime}
              />
            </div>
          </div>

          {/* Sélecteur d'œuvres - Cartes interactives */}
          <div
            className={`xl:col-span-1 ${
              isLoaded ? "slide-in-right" : "opacity-0"
            }`}
            style={{ animationDelay: "0.6s" }}
          >
            <WorkSelector
              works={works}
              currentSongWorkId={currentSong.workId}
              selectedWork={selectedWork}
              showAnswer={showAnswer}
              canValidate={!!selectedWork && !showAnswer}
              canGoNext={canGoNext}
              isCurrentSongAnswered={isCurrentSongAnswered}
              onWorkSelection={handleWorkSelectionWithSound}
              onValidateAnswer={handleValidateAnswerWithSound}
              onNextSong={handleNextSongWithReset}
            />
          </div>
        </div>
      </div>

      {/* Effets de lumière d'ambiance */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
}

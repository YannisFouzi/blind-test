"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  FaHome,
  FaPause,
  FaPlay,
  FaStepBackward,
  FaStepForward,
  FaVolumeMute,
  FaVolumeUp,
} from "react-icons/fa";
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

      {/* Conteneur principal avec padding bottom pour la barre de lecteur */}
      <div className="container mx-auto px-4 py-8 pb-24 relative z-10">
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

      {/* Barre de lecteur fixe en bas - Style Spotify */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 border-t border-purple-500/30">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            {/* Section gauche - Contrôles et scores */}
            <div className="flex flex-col items-center gap-3">
              {/* Contrôles principaux - Version compacte */}
              <div className="flex items-center gap-4">
                {/* Bouton précédent */}
                <button
                  onClick={handlePrevSongWithReset}
                  disabled={!canGoPrev}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    canGoPrev
                      ? "bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white shadow-lg hover:shadow-purple-500/50 hover:scale-110"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <FaStepBackward size={16} />
                </button>

                {/* Bouton play/pause principal - Version compacte */}
                <button
                  onClick={handlePlayPause}
                  className="relative p-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 rounded-full text-white shadow-xl hover:shadow-yellow-500/50 transition-all duration-300 transform hover:scale-105"
                >
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 blur-md opacity-50" />
                  <div className="relative z-10">
                    {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
                  </div>
                </button>

                {/* Bouton suivant */}
                <button
                  onClick={handleNextSongWithReset}
                  disabled={!canGoNext}
                  className={`p-2 rounded-full transition-all duration-300 ${
                    canGoNext
                      ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-blue-500/50 hover:scale-110"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  <FaStepForward size={16} />
                </button>
              </div>

              {/* Scores compacts */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <span className="text-green-400 text-sm">✓</span>
                  <span className="text-white text-sm font-semibold">
                    {gameSession.score.correct}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-400 text-sm">✗</span>
                  <span className="text-white text-sm font-semibold">
                    {gameSession.score.incorrect}
                  </span>
                </div>
              </div>
            </div>

            {/* Barre de progression centrale avec indicateur de morceau */}
            <div className="flex-1 max-w-md mx-4">
              <div className="flex items-center justify-between text-white text-xs mb-1">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
              <div
                className="magic-progress-bar h-2 cursor-pointer hover:h-3 transition-all duration-300"
                onClick={handleProgressClick}
              >
                <div
                  className="magic-progress-fill h-full"
                  style={{
                    width: `${duration ? (currentTime / duration) * 100 : 0}%`,
                  }}
                />
              </div>
              {/* Indicateur de morceau */}
              <div className="text-center mt-2">
                <span className="text-yellow-400 text-sm font-semibold">
                  Morceau {gameSession.currentSongIndex + 1} /{" "}
                  {gameSession.songs.length}
                </span>
              </div>
            </div>

            {/* Contrôle du volume - Masqué sur mobile */}
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={toggleMute}
                className="p-2 rounded-full bg-slate-800/50 text-white hover:bg-slate-700/50 transition-all duration-300 hover:scale-110"
              >
                {isMuted ? (
                  <FaVolumeMute size={16} />
                ) : (
                  <FaVolumeUp size={16} />
                )}
              </button>

              <div className="flex items-center gap-2">
                <div
                  className="w-20 magic-progress-bar h-2 cursor-pointer hover:h-3 transition-all duration-300"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percentage = (clickX / rect.width) * 100;
                    const newVolume = Math.max(0, Math.min(100, percentage));
                    handleVolumeChange(newVolume);
                  }}
                >
                  <div
                    className="magic-progress-fill h-full"
                    style={{ width: `${volume}%` }}
                  />
                </div>
                <span className="text-white text-xs w-8 text-center">
                  {Math.round(volume)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { usePartyKitRoom } from "@/hooks/usePartyKitRoom";
import { Song } from "@/types";

/**
 * Page de test pour le hook usePartyKitRoom
 * Accessible via /test-partykit
 */

export default function TestPartyKitPage() {
  const [roomId, setRoomId] = useState(`test-${Date.now()}`);
  const [playerId] = useState(`player_${Math.random().toString(36).substr(2, 9)}`);
  const [displayName, setDisplayName] = useState("Test Player");
  const [isJoined, setIsJoined] = useState(false);

  const {
    room,
    players,
    currentSong,
    state,
    isConnected,
    isHost,
    allPlayersAnswered,
    canGoNext,
    playerScore,
    startGame,
    goNextSong,
    submitAnswer,
    configureRoom,
  } = usePartyKitRoom({
    roomId: isJoined ? roomId : undefined,
    playerId: isJoined ? playerId : undefined,
    displayName: isJoined ? displayName : undefined,
  });

  const handleJoin = () => {
    setIsJoined(true);
  };

  const handleConfigure = async () => {
    // Générer des songs de test
    const fakeSongs: Song[] = Array.from({ length: 3 }, (_, i) => ({
      id: `song_${i + 1}`,
      title: `Opening ${i + 1}`,
      artist: `Artist ${i + 1}`,
      workId: `work_${i % 3}`,
      youtubeId: `fake_${i}`,
      audioUrl: undefined,
      duration: 90,
      createdAt: new Date(),
    }));

    const result = await configureRoom("test-universe", fakeSongs);
    console.log("Configure result:", result);
  };

  const handleStart = async () => {
    const result = await startGame();
    console.log("Start result:", result);
  };

  const handleAnswerCorrect = async () => {
    if (!currentSong) return;
    const result = await submitAnswer(currentSong.workId, true);
    console.log("Answer result:", result);
  };

  const handleAnswerWrong = async () => {
    const result = await submitAnswer("wrong_work", false);
    console.log("Answer result:", result);
  };

  const handleNext = async () => {
    const result = await goNextSong();
    console.log("Next result:", result);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-blue-400">
          🎈 Test usePartyKitRoom Hook
        </h1>

        {/* Connexion */}
        {!isJoined ? (
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Connexion</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Room ID</label>
                <input
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded"
                />
              </div>

              <div className="text-xs text-gray-500">Player ID: {playerId}</div>

              <button
                onClick={handleJoin}
                className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded font-medium"
              >
                Se connecter
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* État */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">État</h2>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Connecté:</span>{" "}
                  <span className={isConnected ? "text-green-400" : "text-red-400"}>
                    {isConnected ? "✓ Oui" : "✗ Non"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Host:</span>{" "}
                  <span className={isHost ? "text-yellow-400" : "text-gray-400"}>
                    {isHost ? "✓ Oui" : "Non"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">État du jeu:</span>{" "}
                  <span className="text-blue-400 uppercase font-medium">{state}</span>
                </div>
                <div>
                  <span className="text-gray-400">Morceau:</span>{" "}
                  <span className="text-blue-400">
                    {room.currentSongIndex! + 1} / {room.songs?.length || 0}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Tous répondu:</span>{" "}
                  <span className={allPlayersAnswered ? "text-green-400" : "text-gray-400"}>
                    {allPlayersAnswered ? "✓ Oui" : "Non"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">Can go next:</span>{" "}
                  <span className={canGoNext ? "text-green-400" : "text-gray-400"}>
                    {canGoNext ? "✓ Oui" : "Non"}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-700">
                <div className="text-sm">
                  <span className="text-gray-400">Score:</span>{" "}
                  <span className="text-green-400">✓ {playerScore.correct}</span>
                  {" | "}
                  <span className="text-red-400">✗ {playerScore.incorrect}</span>
                </div>
              </div>
            </div>

            {/* Joueurs */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                Joueurs ({players.length})
              </h2>

              {players.length === 0 ? (
                <p className="text-gray-500 text-sm">Aucun joueur</p>
              ) : (
                <div className="space-y-2">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className={`p-3 rounded ${
                        player.isHost ? "bg-yellow-900/20 border border-yellow-700" : "bg-gray-800"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium text-blue-300">
                            {player.displayName}
                          </span>
                          {player.isHost && (
                            <span className="ml-2 text-xs bg-yellow-600 px-2 py-0.5 rounded">
                              HOST
                            </span>
                          )}
                          {player.id === playerId && (
                            <span className="ml-2 text-xs bg-blue-600 px-2 py-0.5 rounded">
                              VOUS
                            </span>
                          )}
                        </div>
                        <div className="text-sm">
                          <span className="text-green-400">✓ {player.score}</span>
                          {" | "}
                          <span className="text-red-400">✗ {player.incorrect}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Morceau actuel */}
            {currentSong && (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Morceau actuel</h2>

                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-400">Titre:</span>{" "}
                    <span className="text-blue-300">{currentSong.title}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Artiste:</span>{" "}
                    <span className="text-blue-300">{currentSong.artist}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Work ID:</span>{" "}
                    <span className="text-gray-500 font-mono text-xs">{currentSong.workId}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Actions</h2>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleConfigure}
                  disabled={!isHost || state !== "idle"}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium col-span-2"
                >
                  ⚙️ Configurer (3 morceaux)
                </button>

                <button
                  onClick={handleStart}
                  disabled={!isHost || state !== "idle" || !room.songs || room.songs.length === 0}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium"
                >
                  ▶️ Démarrer
                </button>

                <button
                  onClick={handleNext}
                  disabled={!isHost || state !== "playing" || !canGoNext}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium"
                >
                  ⏭️ Suivant
                </button>

                <button
                  onClick={handleAnswerCorrect}
                  disabled={state !== "playing"}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium"
                >
                  ✅ Correct
                </button>

                <button
                  onClick={handleAnswerWrong}
                  disabled={state !== "playing"}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded font-medium"
                >
                  ❌ Faux
                </button>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                <p>💡 Pour tester en multiplayer, ouvrez cette page dans 2 onglets avec le même Room ID</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

"use client";

import { useLobby } from "@/hooks/useLobby";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Composant RoomsBrowser - Phase 9
 *
 * Affiche la liste des rooms disponibles via le Lobby Party
 * Alternative simple à la gestion Firebase complexe de HomeContent
 *
 * Utilise le hook useLobby (Phase 8) pour recevoir la liste en temps réel
 *
 * @example
 * <RoomsBrowser universeId="P3iE45PQXeqT5h2uUAzc" />
 */
export function RoomsBrowser({ universeId }: { universeId: string }) {
  const { rooms, isConnected } = useLobby();
  const router = useRouter();
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null);

  const handleJoinRoom = (roomId: string) => {
    const playerName = prompt("Entrez votre pseudo :");
    if (!playerName || playerName.trim().length === 0) {
      return;
    }

    setJoiningRoomId(roomId);

    // Rediriger vers la room
    router.push(
      `/game/${universeId}?mode=multi&room=${roomId}&name=${encodeURIComponent(
        playerName.trim()
      )}`
    );
  };

  const handleCreateRoom = () => {
    const playerName = prompt("Entrez votre pseudo :");
    if (!playerName || playerName.trim().length === 0) {
      return;
    }

    // Générer un ID de room unique
    const roomId = `room-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    // Rediriger vers la nouvelle room
    // PartyKit créera automatiquement la room au premier connect
    router.push(
      `/game/${universeId}?mode=multi&room=${roomId}&name=${encodeURIComponent(
        playerName.trim()
      )}&host=1`
    );
  };

  // État de connexion
  if (!isConnected) {
    return (
      <div className="p-6 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="mt-2 text-gray-500">Connexion au lobby...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header avec bouton Créer */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Parties disponibles</h3>
        <button
          onClick={handleCreateRoom}
          className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        >
          + Créer une partie
        </button>
      </div>

      {/* Liste des rooms */}
      {rooms.length === 0 ? (
        <div className="text-center p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 mb-4">Aucune partie disponible pour le moment</p>
          <button
            onClick={handleCreateRoom}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Créer la première partie
          </button>
        </div>
      ) : (
        <ul className="space-y-3">
          {rooms.map((room) => (
            <li
              key={room.id}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-center">
                <div className="flex-1">
                  <p className="font-medium text-lg">{room.hostName}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <span className="text-sm text-gray-500">
                      👥 {room.playersCount} joueur{room.playersCount > 1 ? "s" : ""}
                    </span>
                    <span className="text-xs text-gray-400">
                      Room: {room.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleJoinRoom(room.id)}
                  disabled={joiningRoomId === room.id}
                  className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {joiningRoomId === room.id ? "Connexion..." : "Rejoindre"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Info */}
      <p className="text-xs text-gray-400 text-center mt-4">
        🔄 Mise à jour en temps réel • {rooms.length} partie{rooms.length > 1 ? "s" : ""}{" "}
        disponible{rooms.length > 1 ? "s" : ""}
      </p>
    </div>
  );
}

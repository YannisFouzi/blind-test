import { useState, useEffect } from "react";
import PartySocket from "partysocket";

/**
 * Métadonnées d'une room de jeu
 *
 * Correspond exactement à l'interface RoomMetadata du Lobby Party
 */
export interface RoomMetadata {
  id: string;
  hostName: string;
  state: "idle" | "configured" | "playing" | "results";
  playersCount: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Hook pour se connecter au Lobby Party et recevoir la liste des rooms
 *
 * Se connecte au Lobby Party via WebSocket pour recevoir en temps réel
 * la liste des rooms disponibles.
 *
 * Responsabilités :
 * - Établir et maintenir la connexion WebSocket
 * - Recevoir et parser les messages du lobby
 * - Exposer la liste des rooms et l'état de connexion
 * - Nettoyer la connexion au démontage
 *
 * @example
 * function RoomsList() {
 *   const { rooms, isConnected } = useLobby();
 *
 *   if (!isConnected) return <p>Connexion au lobby...</p>;
 *
 *   return (
 *     <ul>
 *       {rooms.map(room => (
 *         <li key={room.id}>
 *           {room.hostName} - {room.playersCount} joueur(s)
 *         </li>
 *       ))}
 *     </ul>
 *   );
 * }
 */
export const useLobby = () => {
  const [rooms, setRooms] = useState<RoomMetadata[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Configuration de l'hôte PartyKit
    const partyHost =
      process.env.NEXT_PUBLIC_PARTYKIT_HOST || "http://127.0.0.1:1999";

    console.log("[useLobby] Connecting to lobby at", partyHost);

    // Créer la connexion WebSocket au Lobby Party
    const socket = new PartySocket({
      host: partyHost,
      party: "lobby", // Nom du party (correspond à party/lobby.ts)
      room: "main", // Room ID du lobby (singleton)
    });

    // Handler: Connexion établie
    socket.addEventListener("open", () => {
      console.log("[useLobby] Connected to lobby");
      setIsConnected(true);
    });

    // Handler: Message reçu du lobby
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data as string);

        if (message.type === "rooms_list") {
          setRooms(message.rooms || []);
          console.log(`[useLobby] Received ${message.rooms?.length || 0} rooms`);
        }
      } catch (error) {
        console.error("[useLobby] Parse error:", error);
      }
    });

    // Handler: Connexion fermée
    socket.addEventListener("close", () => {
      console.log("[useLobby] Disconnected from lobby");
      setIsConnected(false);
    });

    // Handler: Erreur de connexion
    socket.addEventListener("error", (error) => {
      console.error("[useLobby] Error:", error);
      setIsConnected(false);
    });

    // Cleanup: Fermer la connexion au démontage du composant
    return () => {
      console.log("[useLobby] Closing connection");
      socket.close();
    };
  }, []); // Pas de dépendances : se connecte une seule fois

  return {
    /**
     * Liste des rooms disponibles
     * Mise à jour en temps réel par le Lobby Party
     */
    rooms,

    /**
     * État de la connexion WebSocket
     * true si connecté au lobby, false sinon
     */
    isConnected,
  };
};

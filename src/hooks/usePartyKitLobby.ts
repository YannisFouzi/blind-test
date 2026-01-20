import { useState, useEffect, useCallback } from "react";
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
  universeId?: string;
}

/**
 * Hook amélioré pour gérer le Lobby PartyKit
 *
 * Fonctionnalités :
 * - Connexion temps réel au Lobby Party
 * - Affichage de la liste des rooms disponibles
 * - Création de room (génération d'ID unique)
 * - État de connexion et erreurs
 *
 * Remplace complètement les fonctions Firebase :
 * - subscribeIdleRooms() → rooms en temps réel
 * - createRoom() → createRoom() locale (pas d'appel serveur)
 *
 * @example
 * function Lobby() {
 *   const { rooms, isConnected, createRoom, isCreating, error } = usePartyKitLobby();
 *
 *   const handleCreate = async () => {
 *     const roomId = await createRoom("Alice", "universe-123");
 *     router.push(`/game/universe-123?mode=multi&room=${roomId}&name=Alice&host=1`);
 *   };
 *
 *   return (
 *     <div>
 *       <button onClick={handleCreate}>Créer une partie</button>
 *       {rooms.map(room => <div key={room.id}>{room.hostName}</div>)}
 *     </div>
 *   );
 * }
 */
export const usePartyKitLobby = () => {
  // ============================================================================
  // STATE
  // ============================================================================

  const [rooms, setRooms] = useState<RoomMetadata[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ============================================================================
  // WEBSOCKET CONNECTION - LOBBY
  // ============================================================================

  useEffect(() => {
    // Configuration de l'hôte PartyKit
    const partyHost =
      process.env.NEXT_PUBLIC_PARTYKIT_HOST || "http://127.0.0.1:1999";

    // Créer la connexion WebSocket au Lobby Party
    const socket = new PartySocket({
      host: partyHost,
      party: "lobby", // Nom du party (correspond à party/lobby.ts)
      room: "main", // Room ID du lobby (singleton)
    });

    // Handler: Connexion établie
    socket.addEventListener("open", () => {
      setIsConnected(true);
      setError(null);
    });

    // Handler: Message reçu du lobby
    socket.addEventListener("message", (event) => {
      try {
        const message = JSON.parse(event.data as string);

        if (message.type === "rooms_list") {
          setRooms(message.rooms || []);
        }
      } catch (error) {
        console.error("[usePartyKitLobby] Parse error:", error);
        setError("Erreur de parsing des données du lobby");
      }
    });

    // Handler: Connexion fermée
    socket.addEventListener("close", () => {
      setIsConnected(false);
    });

    // Handler: Erreur de connexion
    socket.addEventListener("error", (error) => {
      console.error("[usePartyKitLobby] Error:", error);
      setIsConnected(false);
      setError("Erreur de connexion au lobby");
    });

    // Cleanup: Fermer la connexion au démontage du composant
    return () => {
      socket.close();
    };
  }, []); // Pas de dépendances : se connecte une seule fois

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Créer une room PartyKit
   *
   * Génère un ID unique localement (pas d'appel serveur)
   * La room sera créée automatiquement par le Game Party au premier connect
   *
   * Remplace : Firebase createRoom()
   *
   * @param hostName Pseudo de l'hôte
   * @param universeId ID de l'univers sélectionné
   * @returns Promise<string> ID de la room créée
   *
   * @example
   * const roomId = await createRoom("Alice", "P3iE45PQXeqT5h2uUAzc");
   * router.push(`/game/${universeId}?mode=multi&room=${roomId}&name=Alice&host=1`);
   */
  const createRoom = useCallback(
    async (hostName: string, _universeId: string): Promise<string> => {
      setIsCreating(true);
      setError(null);

      void _universeId; // not used yet

      try {
        // Générer un ID unique
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const roomId = `room-${timestamp}-${random}`;

        // Notifier le lobby imm?diatement pour rendre la room visible avant la connexion WS
        const partyHost =
          process.env.NEXT_PUBLIC_PARTYKIT_HOST || "http://127.0.0.1:1999";
        try {
          await fetch(`${partyHost}/parties/lobby/main`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "room_created",
              roomId,
              hostName,
              playersCount: 1,
            }),
          });
        } catch (notifyError) {
          console.error("[usePartyKitLobby] Failed to notify lobby", notifyError);
        }

        setIsCreating(false);

        // Retourner l'ID immédiatement
        // Le Game Party créera la room automatiquement au premier connect
        // et notifiera le Lobby Party via HTTP POST
        return roomId;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        setIsCreating(false);
        throw err;
      }
    },
    []
  );

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    /**
     * Liste des rooms disponibles
     * Mise à jour en temps réel par le Lobby Party
     * Filtrée automatiquement (uniquement rooms "idle" ou "configured")
     */
    rooms,

    /**
     * État de la connexion WebSocket au Lobby
     * true si connecté, false sinon
     */
    isConnected,

    /**
     * Créer une nouvelle room
     * Génère un ID unique et retourne immédiatement
     * La room sera créée par Game Party au premier connect
     */
    createRoom,

    /**
     * État de création en cours
     * true pendant la génération de l'ID (instantané en pratique)
     */
    isCreating,

    /**
     * Erreur éventuelle
     * null si pas d'erreur
     */
    error,
  };
};

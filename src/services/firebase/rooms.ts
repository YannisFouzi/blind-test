import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type DocumentReference,
} from "firebase/firestore";
import { z } from "zod";
import { db } from "@/lib/firebase";
import { formatError, ServiceResponse } from "./base";
import {
  Room,
  RoomPlayer,
  RoomPlayerSchema,
  RoomResponse,
  RoomResponseSchema,
  RoomSchema,
  Song,
} from "@/types";

const roomsCollection = collection(db, "rooms");

export type CreateRoomPayload = {
  roomId?: string;
  universeId?: string;
  hostId: string;
  hostDisplayName: string;
  songs?: Song[];
  allowedWorks?: string[];
  options?: { noSeek?: boolean };
};

export type JoinRoomPayload = {
  roomId: string;
  playerId: string;
  displayName: string;
};

const roomResponseInput = z.object({
  roomId: z.string().min(1),
  songId: z.string().min(1),
  playerId: z.string().min(1),
  selectedWorkId: z.string().min(1).nullable(),
  isCorrect: z.boolean(),
});

const computePoints = (rank: number, activePlayers: number) => {
  if (activePlayers <= 0) return 0;
  return Math.max(1, activePlayers - rank + 1);
};

export const createRoom = async (payload: CreateRoomPayload): Promise<ServiceResponse<{ id: string }>> => {
  try {
    const roomData: Omit<Room, "id"> = {
      hostId: payload.hostId,
      hostName: payload.hostDisplayName,
      universeId: payload.universeId || "__pending__",
      songs: payload.songs || [],
      currentSongIndex: 0,
      state: "idle",
      startedAt: null,
      createdAt: new Date(),
    };

    const roomRef =
      payload.roomId && payload.roomId.length > 0
        ? doc(db, "rooms", payload.roomId) as DocumentReference
        : undefined;

    const newRoomRef = roomRef ?? (await addDoc(roomsCollection, roomData));

    await setDoc(doc(newRoomRef, "players", payload.hostId), {
      id: payload.hostId,
      displayName: payload.hostDisplayName,
      score: 0,
      incorrect: 0,
      connected: true,
      lastSeen: serverTimestamp(),
      isHost: true,
    });

    return { success: true, data: { id: newRoomRef.id } };
  } catch (error) {
    return { success: false, error: formatError(error, "Erreur lors de la création de la room") };
  }
};

export const joinRoom = async (payload: JoinRoomPayload): Promise<ServiceResponse> => {
  try {
    const playerRef = doc(db, "rooms", payload.roomId, "players", payload.playerId);
    await setDoc(playerRef, {
      id: payload.playerId,
      displayName: payload.displayName,
      score: 0,
      incorrect: 0,
      connected: true,
      lastSeen: serverTimestamp(),
      isHost: false,
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: formatError(error, "Erreur lors de la connexion à la room") };
  }
};

export const leaveRoom = async (roomId: string, playerId: string): Promise<ServiceResponse> => {
  try {
    const playerRef = doc(db, "rooms", roomId, "players", playerId);
    await updateDoc(playerRef, { connected: false, lastSeen: serverTimestamp() });
    console.info("[rooms] leaveRoom", { roomId, playerId });
    return { success: true };
  } catch (error) {
    return { success: false, error: formatError(error, "Erreur lors de la déconnexion de la room") };
  }
};

export const heartbeatPlayer = async (roomId: string, playerId: string): Promise<void> => {
  const playerRef = doc(db, "rooms", roomId, "players", playerId);
  try {
    await updateDoc(playerRef, { connected: true, lastSeen: serverTimestamp() });
  } catch {
    // pas bloquant
  }
};

export const startGame = async (roomId: string): Promise<ServiceResponse> => {
  try {
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, {
      state: "playing",
      currentSongIndex: 0,
      startedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: formatError(error, "Impossible de démarrer la partie") };
  }
};

export const nextSong = async (roomId: string): Promise<ServiceResponse> => {
  try {
    const roomRef = doc(db, "rooms", roomId);
    await runTransaction(db, async (transaction) => {
      const snapshot = await transaction.get(roomRef);
      if (!snapshot.exists()) {
        throw new Error("Room introuvable");
      }
      const room = RoomSchema.parse({ id: snapshot.id, ...snapshot.data() });
      const nextIndex = room.currentSongIndex + 1;
      if (nextIndex >= room.songs.length) {
        throw new Error("Plus de morceaux disponibles");
      }
      transaction.update(roomRef, {
        currentSongIndex: nextIndex,
        state: "playing",
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: formatError(error, "Impossible de passer au morceau suivant") };
  }
};

export const configureRoomPlaylist = async (
  roomId: string,
  universeId: string,
  songs: Song[],
  allowedWorks?: string[],
  options?: { noSeek?: boolean }
): Promise<ServiceResponse> => {
  try {
    const roomRef = doc(db, "rooms", roomId);
    await updateDoc(roomRef, {
      universeId,
      songs,
      currentSongIndex: 0,
      state: "idle",
      startedAt: null,
      updatedAt: serverTimestamp(),
      allowedWorks: allowedWorks && allowedWorks.length ? allowedWorks : null,
      options: {
        noSeek: options?.noSeek ?? false,
      },
    });
    return { success: true };
  } catch (error) {
    return { success: false, error: formatError(error, "Impossible de configurer la room") };
  }
};

export const submitAnswer = async (
  input: z.infer<typeof roomResponseInput>
): Promise<ServiceResponse<{ rank: number; points: number }>> => {
  let parsed: z.infer<typeof roomResponseInput>;
  try {
    parsed = roomResponseInput.parse(input);
  } catch (error) {
    console.error("[rooms] submitAnswer invalid payload", input, error);
    return { success: false, error: "Données de réponse invalides" };
  }

  try {
    if (!parsed.roomId || !parsed.songId || !parsed.playerId) {
      console.error("[rooms] submitAnswer missing ids", parsed);
      return { success: false, error: "Identifiants manquants pour la réponse" };
    }

    const roomRef = doc(db, "rooms", parsed.roomId);
    const responsesCol = collection(db, "rooms", parsed.roomId, "responses");
    const playersCol = collection(db, "rooms", parsed.roomId, "players");

    const roomSnapshot = await getDoc(roomRef);
    if (!roomSnapshot.exists()) {
      return { success: false, error: "Room introuvable" };
    }

    // Unicité: a-t-il déjà répondu ?
    const existingResponseSnap = await getDocs(
      query(responsesCol, where("songId", "==", parsed.songId), where("playerId", "==", parsed.playerId))
    );
    if (!existingResponseSnap.empty) {
      const existing = RoomResponseSchema.parse({
        id: existingResponseSnap.docs[0].id,
        ...existingResponseSnap.docs[0].data(),
      });
      return { success: true, data: { rank: existing.rank, points: existing.points } };
    }

    // Rang / points
    const correctResponsesSnap = await getDocs(
      query(responsesCol, where("songId", "==", parsed.songId), where("isCorrect", "==", true))
    );
    const rank = correctResponsesSnap.size + 1;

    const playersSnap = await getDocs(query(playersCol, where("connected", "==", true)));
    const activePlayers = playersSnap.size > 0 ? playersSnap.size : 1;
    const points = parsed.isCorrect ? computePoints(rank, activePlayers) : 0;

    // Enregistrer la réponse (doc auto-id)
    const responseRef = doc(responsesCol);
    await setDoc(responseRef, {
      roomId: parsed.roomId,
      songId: parsed.songId,
      playerId: parsed.playerId,
      selectedWorkId: parsed.selectedWorkId,
      isCorrect: parsed.isCorrect,
      answeredAt: serverTimestamp(),
      rank,
      points,
    });

    // Mettre à jour le score du joueur (merge)
    const playerRef = doc(playersCol, parsed.playerId);
    const playerSnapshot = await getDoc(playerRef);
    const currentScore = playerSnapshot.exists() ? (playerSnapshot.data()?.score as number) || 0 : 0;
    const currentIncorrect = playerSnapshot.exists() ? (playerSnapshot.data()?.incorrect as number) || 0 : 0;
    await setDoc(
      playerRef,
      {
        id: parsed.playerId,
        score: currentScore + points,
        incorrect: parsed.isCorrect ? currentIncorrect : currentIncorrect + 1,
        connected: true,
        lastSeen: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, data: { rank, points } };
  } catch (error) {
    console.error("[rooms] submitAnswer failure", { parsed, error });
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : JSON.stringify(error);
    return { success: false, error: formatError(message, "Erreur lors de l'envoi de la reponse") };
  }
};

export const subscribeRoom = (
  roomId: string,
  onData: (room: Room | null) => void
) => {
  const roomRef = doc(db, "rooms", roomId);
  return onSnapshot(
    roomRef,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const parsed = RoomSchema.parse({ id: snap.id, ...snap.data() });
      onData(parsed);
    },
    () => onData(null)
  );
};

export const subscribeIdleRooms = (
  onData: (rooms: Room[]) => void,
  maxAgeMinutes = 60
) => {
  const cutoff = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
  const q = query(
    roomsCollection,
    where("state", "==", "idle"),
    where("createdAt", ">=", cutoff),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    q,
    (snap) => {
      const rooms: Room[] = [];
      snap.forEach((docSnap) => {
        try {
          rooms.push(RoomSchema.parse({ id: docSnap.id, ...docSnap.data() }));
        } catch {
          // ignore invalid room
        }
      });
      onData(rooms);
    },
    (err) => {
      console.error("[rooms] subscribeIdleRooms error", err);
      onData([]);
    }
  );
};

export const subscribePlayers = (
  roomId: string,
  onData: (players: RoomPlayer[]) => void
) => {
  const playersRef = collection(db, "rooms", roomId, "players");
  let lastPlayers: RoomPlayer[] = [];
  return onSnapshot(
    playersRef,
    (snap) => {
      // Ignore snapshots provenant uniquement du cache sans écritures en attente
      if (snap.metadata.fromCache && !snap.metadata.hasPendingWrites) {
        return;
      }

      const players: RoomPlayer[] = [];
      snap.forEach((docSnap) => {
        try {
          players.push(RoomPlayerSchema.parse({ id: docSnap.id, ...docSnap.data() }));
        } catch {
          // ignore invalid
        }
      });
      const activePlayers = players.filter((p) => p.connected !== false);
      // Ne pas propager un snapshot vide transitoire si on a déjà une liste connue
      const toEmit = activePlayers.length === 0 && lastPlayers.length > 0 ? lastPlayers : activePlayers;
      lastPlayers = toEmit;

      console.info("[rooms] subscribePlayers snapshot", {
        roomId,
        count: toEmit.length,
        ids: toEmit.map((p) => p.id),
      });
      onData(toEmit);
    },
    () => onData(lastPlayers)
  );
};

export const subscribeResponsesForSong = (
  roomId: string,
  songId: string,
  onData: (responses: RoomResponse[]) => void
) => {
  const responsesRef = collection(db, "rooms", roomId, "responses");
  const q = query(responsesRef, where("songId", "==", songId));
  return onSnapshot(
    q,
    (snap) => {
      const responses: RoomResponse[] = [];
      snap.forEach((docSnap) => {
        try {
          responses.push(RoomResponseSchema.parse({ id: docSnap.id, ...docSnap.data() }));
        } catch {
          // ignore invalid
        }
      });
      onData(responses);
    },
    () => onData([])
  );
};


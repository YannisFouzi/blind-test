import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { SongSchema, type Song } from "@/types";
import {
  createDocument,
  fetchDocuments,
  formatError,
  removeDocument,
  updateDocument,
  type ServiceResponse,
} from "./base";
import { db } from "@/lib/firebase";

const COLLECTION = "songs";

type PlaylistSong = {
  id: string;
  title: string;
  description?: string;
  duration: number;
  artist?: string;
  audioUrl?: string;
};

const buildSongPayload = (
  workId: string,
  playlistSong: PlaylistSong
): Omit<Song, "id" | "createdAt"> => ({
  title: playlistSong.title,
  artist: playlistSong.artist || "Artiste YouTube",
  youtubeId: playlistSong.id,
  audioUrl: playlistSong.audioUrl,
  duration: playlistSong.duration,
  workId,
});

const unknownErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur inconnue";

export const getSongsByWork = async (
  workId: string
): Promise<ServiceResponse<Song[]>> => {
  try {
    const data = await fetchDocuments<Song>(
      COLLECTION,
      [where("workId", "==", workId)],
      SongSchema
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors du chargement des chansons"),
    };
  }
};

export const getSongCountByWork = async (
  workId: string
): Promise<ServiceResponse<number>> => {
  try {
    const q = query(collection(db, COLLECTION), where("workId", "==", workId));
    const snapshot = await getCountFromServer(q);
    return { success: true, data: snapshot.data().count };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors du comptage des chansons"),
    };
  }
};

export const addSong = async (
  song: Omit<Song, "id" | "createdAt">
): Promise<ServiceResponse<{ id: string }>> => {
  try {
    const id = await createDocument(COLLECTION, { ...song, createdAt: new Date() });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de la creation de la chanson"),
    };
  }
};

export const updateSong = async (
  id: string,
  payload: Partial<Song>
): Promise<ServiceResponse> => {
  try {
    await updateDocument<Song>(COLLECTION, id, payload);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de la mise a jour de la chanson"),
    };
  }
};

export const deleteSong = async (id: string): Promise<ServiceResponse> => {
  try {
    await removeDocument(COLLECTION, id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de la suppression de la chanson"),
    };
  }
};

export const importSongsFromPlaylist = async (
  workId: string,
  playlistSongs: PlaylistSong[]
): Promise<
  ServiceResponse<{
    imported: number;
    skipped: number;
    errors?: string[];
  }>
> => {
  try {
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    const existingSongsResult = await getSongsByWork(workId);
    const existingSongs = existingSongsResult.success
      ? existingSongsResult.data || []
      : [];
    const existingIds = new Set(existingSongs.map((song) => song.youtubeId));

    for (const playlistSong of playlistSongs) {
      if (existingIds.has(playlistSong.id)) {
        skipped += 1;
        continue;
      }

      try {
        const songData = buildSongPayload(workId, playlistSong);
        const result = await addSong(songData);

        if (result.success) {
          imported += 1;
        } else {
          errors.push(
            `Erreur pour "${playlistSong.title}": ${result.error ?? "erreur inconnue"}`
          );
        }
      } catch (error) {
        errors.push(
          `Erreur pour "${playlistSong.title}": ${unknownErrorMessage(error)}`
        );
      }
    }

    return {
      success: true,
      data: {
        imported,
        skipped,
        errors: errors.length ? errors : undefined,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de l'import des chansons"),
    };
  }
};

import { where } from "firebase/firestore";
import {
  createDocument,
  fetchDocuments,
  formatError,
  removeDocument,
  ServiceResponse,
  updateDocument,
} from "./base";
import { Song, SongSchema } from "@/types";

const COLLECTION = "songs";

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

export const addSong = async (
  song: Omit<Song, "id" | "createdAt">
): Promise<ServiceResponse<{ id: string }>> => {
  try {
    const id = await createDocument(COLLECTION, { ...song, createdAt: new Date() });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de la création de la chanson"),
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
      error: formatError(error, "Erreur lors de la mise à jour de la chanson"),
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
  playlistSongs: Array<{
    id: string;
    title: string;
    description: string;
    duration: number;
  }>
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
    const existingSongs = existingSongsResult.success ? existingSongsResult.data || [] : [];
    const existingIds = new Set(existingSongs.map((song) => song.youtubeId));

    for (const playlistSong of playlistSongs) {
      if (existingIds.has(playlistSong.id)) {
        skipped += 1;
        continue;
      }

      try {
        const songData: Omit<Song, "id" | "createdAt"> = {
          title: playlistSong.title,
          artist: "Artiste YouTube",
          youtubeId: playlistSong.id,
          duration: playlistSong.duration,
          workId,
        };

        const result = await addSong(songData);
        if (result.success) {
          imported += 1;
        } else {
          errors.push(
            `Erreur pour "${playlistSong.title}": ${result.error || "erreur inconnue"}`
          );
        }
      } catch (error) {
        errors.push(
          `Erreur pour "${playlistSong.title}": ${
            error instanceof Error ? error.message : "Erreur inconnue"
          }`
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

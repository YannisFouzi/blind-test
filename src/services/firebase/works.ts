import { orderBy, where } from "firebase/firestore";
import {
  createDocument,
  fetchDocuments,
  formatError,
  removeDocument,
  ServiceResponse,
  updateDocument,
} from "./base";
import { Work, WorkSchema } from "@/types";
import { getSongsByWork, deleteSong } from "./songs";

const COLLECTION = "works";

export const getWorksByUniverse = async (
  universeId: string
): Promise<ServiceResponse<Work[]>> => {
  try {
    const data = await fetchDocuments<Work>(
      COLLECTION,
      [where("universeId", "==", universeId), orderBy("order", "asc")],
      WorkSchema
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors du chargement des œuvres"),
    };
  }
};

export const addWork = async (
  work: Omit<Work, "id" | "createdAt">
): Promise<ServiceResponse<{ id: string }>> => {
  try {
    const id = await createDocument(COLLECTION, { ...work, createdAt: new Date() });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de la création de l'œuvre"),
    };
  }
};

export const updateWork = async (
  id: string,
  payload: Partial<Work>
): Promise<ServiceResponse> => {
  try {
    await updateDocument<Work>(COLLECTION, id, payload);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de la mise à jour de l'œuvre"),
    };
  }
};

export const deleteWork = async (id: string): Promise<ServiceResponse> => {
  try {
    const songsResult = await getSongsByWork(id);
    const songs = songsResult.success ? songsResult.data || [] : [];

    await Promise.all(songs.map(async (song) => deleteSong(song.id)));

    await removeDocument(COLLECTION, id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de la suppression de l'œuvre"),
    };
  }
};

export const reorderWorks = async (
  works: { id: string; order: number }[]
): Promise<ServiceResponse> => {
  try {
    await Promise.all(
      works.map((work, index) =>
        updateDocument<Work>(COLLECTION, work.id, { order: index })
      )
    );
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors du tri des œuvres"),
    };
  }
};

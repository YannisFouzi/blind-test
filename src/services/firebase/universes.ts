import { orderBy, where } from "firebase/firestore";
import {
  createDocument,
  fetchDocuments,
  formatError,
  removeDocument,
  ServiceResponse,
  updateDocument,
} from "./base";
import type { Universe } from "@/types";
import { UniverseSchema, Work } from "@/types";
import { getWorksByUniverse, deleteWork } from "./works";

const COLLECTION = "universes";

export const getUniverses = async (): Promise<ServiceResponse<Universe[]>> => {
  try {
    const data = await fetchDocuments<Universe>(
      COLLECTION,
      [orderBy("createdAt", "desc")],
      UniverseSchema
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors du chargement des univers"),
    };
  }
};

export const getActiveUniverses = async (): Promise<ServiceResponse<Universe[]>> => {
  try {
    const data = await fetchDocuments<Universe>(
      COLLECTION,
      [where("active", "==", true), orderBy("createdAt", "desc")],
      UniverseSchema
    );
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors du chargement des univers"),
    };
  }
};

export const addUniverse = async (
  universe: Omit<Universe, "id" | "createdAt">
): Promise<ServiceResponse<{ id: string }>> => {
  try {
    const id = await createDocument(COLLECTION, { ...universe, createdAt: new Date() });
    return { success: true, data: { id } };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de la création de l'univers"),
    };
  }
};

export const updateUniverse = async (
  id: string,
  payload: Partial<Universe>
): Promise<ServiceResponse> => {
  try {
    await updateDocument<Universe>(COLLECTION, id, payload);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de la mise à jour de l'univers"),
    };
  }
};

export const deleteUniverse = async (id: string): Promise<ServiceResponse> => {
  try {
    const worksResult = await getWorksByUniverse(id);
    const works = worksResult.success ? worksResult.data || [] : [];

    await Promise.all(
      works.map(async (work: Work) => {
        await deleteWork(work.id);
      })
    );

    await removeDocument(COLLECTION, id);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: formatError(error, "Erreur lors de la suppression de l'univers"),
    };
  }
};

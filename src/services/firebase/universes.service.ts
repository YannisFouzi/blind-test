import { orderBy, where } from "firebase/firestore";
import { UniverseSchema, type Universe, type Work } from "@/types";
import {
  createDocument,
  fetchDocuments,
  formatError,
  removeDocument,
  updateDocument,
  type ServiceResponse,
} from "./base";
import { deleteWork, getWorksByUniverse } from "./works.service";

const COLLECTION = "universes";

export const getUniverses = async (): Promise<ServiceResponse<Universe[]>> => {
  try {
    const data = await fetchDocuments<Universe>(
      COLLECTION,
      [orderBy("createdAt", "desc")],
      UniverseSchema
    );
    if (process.env.NODE_ENV === "development") {
      console.info("[UNIVERS-INCONNU] getUniverses() OK", {
        count: data.length,
        sample: data.slice(0, 3).map((universe) => ({
          id: universe.id,
          name: universe.name,
        })),
      });
    }
    return { success: true, data };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[UNIVERS-INCONNU] getUniverses() erreur", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
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
      error: formatError(error, "Erreur lors de la creation de l'univers"),
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
      error: formatError(error, "Erreur lors de la mise a jour de l'univers"),
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

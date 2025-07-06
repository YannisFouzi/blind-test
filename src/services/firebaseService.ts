import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  QueryConstraint,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { Song, Universe, Work } from "../../types";

/**
 * Service pour gérer les interactions avec Firebase
 */
export class FirebaseService {
  /**
   * Ajoute un document à une collection
   */
  static async addDocument<T>(
    collectionName: string,
    data: Omit<T, "id" | "createdAt">
  ): Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }> {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date(),
      });

      return { success: true, id: docRef.id };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'ajout du document",
      };
    }
  }

  /**
   * Met à jour un document
   */
  static async updateDocument<T>(
    collectionName: string,
    id: string,
    data: Partial<T>
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, data);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la mise à jour",
      };
    }
  }

  /**
   * Supprime un document
   */
  static async deleteDocument(
    collectionName: string,
    id: string
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la suppression",
      };
    }
  }

  /**
   * Récupère un document par son ID
   */
  static async getDocument<T>(
    collectionName: string,
    id: string
  ): Promise<{
    success: boolean;
    data?: T;
    error?: string;
  }> {
    try {
      const docRef = doc(db, collectionName, id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return { success: false, error: "Document non trouvé" };
      }

      const data = {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate() || new Date(),
      } as T;

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la récupération",
      };
    }
  }

  /**
   * Récupère tous les documents d'une collection avec des filtres optionnels
   */
  static async getDocuments<T>(
    collectionName: string,
    constraints: QueryConstraint[] = []
  ): Promise<{
    success: boolean;
    data?: T[];
    error?: string;
  }> {
    try {
      const q = query(collection(db, collectionName), ...constraints);
      const querySnapshot = await getDocs(q);

      const data = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
      })) as T[];

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la récupération",
      };
    }
  }

  /**
   * Méthodes spécifiques pour les univers
   */
  static async getUniverses(): Promise<{
    success: boolean;
    data?: Universe[];
    error?: string;
  }> {
    return this.getDocuments<Universe>("universes", [
      orderBy("createdAt", "desc"),
    ]);
  }

  static async addUniverse(
    universe: Omit<Universe, "id" | "createdAt">
  ): Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }> {
    return this.addDocument<Universe>("universes", universe);
  }

  static async updateUniverse(
    id: string,
    data: Partial<Universe>
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.updateDocument<Universe>("universes", id, data);
  }

  /**
   * Méthodes spécifiques pour les œuvres
   */
  static async getWorksByUniverse(universeId: string): Promise<{
    success: boolean;
    data?: Work[];
    error?: string;
  }> {
    return this.getDocuments<Work>("works", [
      where("universeId", "==", universeId),
      orderBy("order", "asc"),
    ]);
  }

  static async addWork(work: Omit<Work, "id" | "createdAt">): Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }> {
    return this.addDocument<Work>("works", work);
  }

  static async updateWork(
    id: string,
    data: Partial<Work>
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.updateDocument<Work>("works", id, data);
  }

  static async reorderWorks(
    works: Array<{ id: string; order: number }>
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // Mettre à jour toutes les œuvres en parallèle
      const updatePromises = works.map((work) =>
        this.updateDocument<Work>("works", work.id, { order: work.order })
      );

      const results = await Promise.all(updatePromises);

      // Vérifier si toutes les mises à jour ont réussi
      const failedUpdate = results.find((result) => !result.success);
      if (failedUpdate) {
        return {
          success: false,
          error: failedUpdate.error || "Erreur lors de la réorganisation",
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la réorganisation des œuvres",
      };
    }
  }

  /**
   * Méthodes spécifiques pour les chansons
   */
  static async getSongsByWork(workId: string): Promise<{
    success: boolean;
    data?: Song[];
    error?: string;
  }> {
    return this.getDocuments<Song>("songs", [
      where("workId", "==", workId),
      orderBy("createdAt", "desc"),
    ]);
  }

  static async addSong(song: Omit<Song, "id" | "createdAt">): Promise<{
    success: boolean;
    id?: string;
    error?: string;
  }> {
    return this.addDocument<Song>("songs", song);
  }

  static async updateSong(
    id: string,
    data: Partial<Song>
  ): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.updateDocument<Song>("songs", id, data);
  }

  static async deleteSong(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    return this.deleteDocument("songs", id);
  }

  static async deleteWork(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // 1. Supprimer toutes les chansons de cette œuvre
      const songsResult = await this.getDocuments<Song>("songs", [
        where("workId", "==", id),
      ]);

      if (songsResult.success && songsResult.data) {
        for (const song of songsResult.data) {
          await this.deleteDocument("songs", song.id);
        }
      }

      // 2. Supprimer l'œuvre elle-même
      return this.deleteDocument("works", id);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la suppression de l'œuvre",
      };
    }
  }

  static async deleteUniverse(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      // 1. Récupérer toutes les œuvres de cet univers
      const worksResult = await this.getDocuments<Work>("works", [
        where("universeId", "==", id),
      ]);

      if (worksResult.success && worksResult.data) {
        // 2. Supprimer chaque œuvre (qui supprimera ses chansons)
        for (const work of worksResult.data) {
          await this.deleteWork(work.id);
        }
      }

      // 3. Supprimer l'univers lui-même
      return this.deleteDocument("universes", id);
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de la suppression de l'univers",
      };
    }
  }

  /**
   * Importe plusieurs chansons depuis une playlist YouTube
   */
  static async importSongsFromPlaylist(
    workId: string,
    playlistSongs: Array<{
      id: string;
      title: string;
      description: string;
      duration: number;
    }>
  ): Promise<{
    success: boolean;
    imported?: number;
    skipped?: number;
    errors?: string[];
    error?: string;
  }> {
    try {
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];

      // Récupérer les chansons existantes pour éviter les doublons
      const existingSongsResult = await this.getDocuments<Song>("songs", [
        where("workId", "==", workId),
      ]);

      const existingYouTubeIds = existingSongsResult.success
        ? existingSongsResult.data!.map((song) => song.youtubeId)
        : [];

      for (const playlistSong of playlistSongs) {
        try {
          // Vérifier si la chanson existe déjà
          if (existingYouTubeIds.includes(playlistSong.id)) {
            skipped++;
            continue;
          }

          // Créer la chanson
          const songData: Omit<Song, "id" | "createdAt"> = {
            title: playlistSong.title,
            artist: "Artiste YouTube", // Valeur par défaut pour import automatique
            youtubeId: playlistSong.id,
            duration: playlistSong.duration,
            workId: workId,
          };

          const result = await this.addDocument<Song>("songs", songData);

          if (result.success) {
            imported++;
          } else {
            errors.push(`Erreur pour "${playlistSong.title}": ${result.error}`);
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
        imported,
        skipped,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur lors de l'import des chansons",
      };
    }
  }
}

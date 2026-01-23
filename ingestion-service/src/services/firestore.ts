import admin from "firebase-admin";

// Initialisation Firebase Admin (une seule fois)
let initialized = false;

const initializeFirebase = () => {
  if (initialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn(
      "[Firestore] Variables d'environnement Firebase manquantes. Écriture Firestore désactivée."
    );
    return;
  }

  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    initialized = true;
    console.log("[Firestore] Firebase Admin initialisé avec succès");
  } catch (error) {
    console.error("[Firestore] Erreur d'initialisation Firebase Admin:", error);
  }
};

// Initialiser au chargement du module
initializeFirebase();

const getFirestore = () => {
  if (!initialized) {
    return null;
  }
  return admin.firestore();
};

export interface SongData {
  title: string;
  artist: string;
  youtubeId: string;
  audioUrl: string;
  duration: number;
  workId: string;
}

/**
 * Vérifie si une chanson existe déjà dans Firestore (par youtubeId + workId)
 */
export const songExistsInFirestore = async (
  workId: string,
  youtubeId: string
): Promise<boolean> => {
  const db = getFirestore();
  if (!db) return false;

  try {
    const snapshot = await db
      .collection("songs")
      .where("workId", "==", workId)
      .where("youtubeId", "==", youtubeId)
      .limit(1)
      .get();

    return !snapshot.empty;
  } catch (error) {
    console.error("[Firestore] Erreur vérification existence:", error);
    return false;
  }
};

/**
 * Ajoute une chanson dans Firestore
 * Retourne l'ID du document créé ou null si échec/déjà existant
 */
export const addSongToFirestore = async (
  songData: SongData
): Promise<string | null> => {
  const db = getFirestore();
  if (!db) {
    console.warn("[Firestore] Base de données non initialisée, skip écriture");
    return null;
  }

  try {
    // Vérifier si la chanson existe déjà
    const exists = await songExistsInFirestore(songData.workId, songData.youtubeId);
    if (exists) {
      console.log(
        `[Firestore] Chanson déjà existante: ${songData.title} (${songData.youtubeId})`
      );
      return null;
    }

    // Créer le document
    const docRef = await db.collection("songs").add({
      ...songData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(
      `[Firestore] ✅ Chanson ajoutée: ${songData.title} (${docRef.id})`
    );
    return docRef.id;
  } catch (error) {
    console.error(
      `[Firestore] ❌ Erreur ajout chanson "${songData.title}":`,
      error
    );
    return null;
  }
};

/**
 * Vérifie si Firebase est configuré et prêt
 */
export const isFirestoreEnabled = (): boolean => {
  return initialized;
};

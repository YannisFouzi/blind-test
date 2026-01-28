import fs from "fs-extra";
import tmp from "tmp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { uploadToR2 } from "../services/cloudflare.js";
import admin from "firebase-admin";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "[migration] Variables d'environnement Firebase manquantes. Impossible de démarrer la migration."
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
};

const getFirestore = () => {
  initializeFirebase();
  return admin.firestore();
};

const convertToReversedMp3 = (input: string, output: string) => {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(input)
      .audioBitrate(128)
      .format("mp3")
      .audioFilters("areverse")
      .outputOptions(["-metadata", "comment=BlindTest-Reverse"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(output);
  });
};

const downloadExistingAudio = async (audioUrl: string, outputPath: string) => {
  const response = await fetch(audioUrl);
  if (!response.ok) {
    throw new Error(`Échec du téléchargement de ${audioUrl} (status ${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  await fs.writeFile(outputPath, buffer);
};

const extractKeyFromAudioUrl = (audioUrl: string) => {
  const url = new URL(audioUrl);
  return url.pathname.replace(/^\//, "");
};

const run = async () => {
  const db = getFirestore();

  console.log("[migration] Démarrage de la migration des fichiers reverse…");

  const targetSongId = process.env.TARGET_SONG_ID;

  let songsSnapshot;
  if (targetSongId) {
    console.log(`[migration] Mode ciblé: traitement uniquement du document ${targetSongId}`);
    const doc = await db.collection("songs").doc(targetSongId).get();
    if (!doc.exists) {
      console.error(`[migration] Le document ${targetSongId} n'existe pas dans "songs".`);
      return;
    }
    // On simule un snapshot avec un seul doc pour réutiliser la boucle existante
    songsSnapshot = { docs: [doc], size: 1 } as const;
  } else {
    songsSnapshot = await db.collection("songs").get();
  }

  console.log(`[migration] ${songsSnapshot.size} documents trouvés dans la collection "songs".`);

  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const doc of songsSnapshot.docs) {
    processed += 1;
    const data = doc.data() as {
      audioUrl?: string;
      audioUrlReversed?: string;
      title?: string;
      workId?: string;
    };

    const title = data.title || doc.id;

    if (!data.audioUrl) {
      console.warn(`[migration] [${doc.id}] Pas de audioUrl, skip.`);
      skipped += 1;
      continue;
    }

    if (data.audioUrlReversed) {
      console.log(`[migration] [${doc.id}] audioUrlReversed déjà présent, skip.`);
      skipped += 1;
      continue;
    }

    console.log(`[migration] [${doc.id}] Traitement du reverse pour "${title}"…`);

    const tmpInput = tmp.tmpNameSync({ postfix: ".mp3" });
    const tmpOutputReversed = tmp.tmpNameSync({ postfix: ".mp3" });

    try {
      await downloadExistingAudio(data.audioUrl, tmpInput);

      await convertToReversedMp3(tmpInput, tmpOutputReversed);

      const originalKey = extractKeyFromAudioUrl(data.audioUrl);
      // Exemple: workId/oceiros-the-consumed-king.mp3 -> workId/oceiros-the-consumed-king_reversed.mp3
      const reversedKey = originalKey.replace(/\.mp3$/i, "_reversed.mp3");

      const upload = await uploadToR2(tmpOutputReversed, reversedKey);

      await doc.ref.update({
        audioUrlReversed: upload.url,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      updated += 1;
      console.log(`[migration] [${doc.id}] ✅ Reverse généré et URL mise à jour.`);
    } catch (error) {
      errors += 1;
      console.error(
        `[migration] [${doc.id}] ❌ Erreur lors de la génération du reverse:`,
        error instanceof Error ? error.message : error
      );
    } finally {
      await Promise.allSettled([fs.remove(tmpInput), fs.remove(tmpOutputReversed)]);
      // Petit sleep pour éviter de spammer R2
      await sleep(100);
    }
  }

  console.log("[migration] Terminé.");
  console.log(
    `[migration] Processed: ${processed}, updated: ${updated}, skipped: ${skipped}, errors: ${errors}`
  );
};

run().catch((error) => {
  console.error("[migration] Erreur fatale lors de la migration:", error);
  process.exit(1);
});


import fs from "fs-extra";
import tmp from "tmp";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import { uploadToR2 } from "../services/cloudflare.js";
import admin from "firebase-admin";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const LOG_PREFIX = "[migration]";
const SLEEP_BETWEEN_UPLOADS_MS = 100;

const initializeFirebase = () => {
  if (admin.apps.length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      `${LOG_PREFIX} Variables d'environnement Firebase manquantes. Impossible de demarrer la migration.`
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
    throw new Error(`Echec du telechargement de ${audioUrl} (status ${response.status})`);
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

  console.log(`${LOG_PREFIX} Demarrage de la migration des fichiers reverse...`);

  const targetSongId = process.env.TARGET_SONG_ID;

  let songsSnapshot;
  if (targetSongId) {
    console.log(`${LOG_PREFIX} Mode cible: traitement uniquement du document ${targetSongId}`);
    const doc = await db.collection("songs").doc(targetSongId).get();
    if (!doc.exists) {
      console.error(`${LOG_PREFIX} Le document ${targetSongId} n'existe pas dans "songs".`);
      return;
    }
    songsSnapshot = { docs: [doc], size: 1 } as const;
  } else {
    songsSnapshot = await db.collection("songs").get();
  }

  console.log(`${LOG_PREFIX} ${songsSnapshot.size} documents trouves dans la collection "songs".`);

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
      console.warn(`${LOG_PREFIX} [${doc.id}] Pas de audioUrl, skip.`);
      skipped += 1;
      continue;
    }

    if (data.audioUrlReversed) {
      console.log(`${LOG_PREFIX} [${doc.id}] audioUrlReversed deja present, skip.`);
      skipped += 1;
      continue;
    }

    console.log(`${LOG_PREFIX} [${doc.id}] Traitement du reverse pour "${title}"...`);

    const tmpInput = tmp.tmpNameSync({ postfix: ".mp3" });
    const tmpOutputReversed = tmp.tmpNameSync({ postfix: ".mp3" });

    try {
      await downloadExistingAudio(data.audioUrl, tmpInput);
      await convertToReversedMp3(tmpInput, tmpOutputReversed);

      const originalKey = extractKeyFromAudioUrl(data.audioUrl);
      const reversedKey = originalKey.replace(/\.mp3$/i, "_reversed.mp3");

      const upload = await uploadToR2(tmpOutputReversed, reversedKey);

      await doc.ref.update({
        audioUrlReversed: upload.url,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      updated += 1;
      console.log(`${LOG_PREFIX} [${doc.id}] OK: reverse genere et URL mise a jour.`);
    } catch (error: unknown) {
      errors += 1;
      console.error(
        `${LOG_PREFIX} [${doc.id}] Erreur lors de la generation du reverse:`,
        error instanceof Error ? error.message : error
      );
    } finally {
      await Promise.allSettled([fs.remove(tmpInput), fs.remove(tmpOutputReversed)]);
      await sleep(SLEEP_BETWEEN_UPLOADS_MS);
    }
  }

  console.log(`${LOG_PREFIX} Termine.`);
  console.log(
    `${LOG_PREFIX} Processed: ${processed}, updated: ${updated}, skipped: ${skipped}, errors: ${errors}`
  );
};

run().catch((error: unknown) => {
  console.error(`${LOG_PREFIX} Erreur fatale lors de la migration:`, error);
  process.exit(1);
});

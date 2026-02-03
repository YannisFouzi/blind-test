import fs from "fs-extra";
import path from "path";
import tmp from "tmp";
import { spawnSync } from "child_process";
import { create } from "youtube-dl-exec";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import pLimit from "p-limit";
import { uploadToR2, buildObjectKey } from "../services/cloudflare.js";
import { fetchPlaylistVideos } from "../services/youtube.js";
import { addSongToFirestore, isFirestoreEnabled } from "../services/firestore.js";

// Railway: /app/bin/yt-dlp | Local: yt-dlp in PATH
const ytdlpPath =
  process.env.YT_DLP_PATH || (fs.existsSync("/app/bin/yt-dlp") ? "/app/bin/yt-dlp" : "yt-dlp");
const youtubedl = create(ytdlpPath);

const cookiesPath = "/app/cookies/cookies.txt";

const parsePlayerClients = (value?: string) => {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((client) => client.trim())
    .filter(Boolean);
};

const defaultPlayerClients = "web,mweb";
const playerClientsEnv = process.env.YT_DLP_PLAYER_CLIENTS || defaultPlayerClients;
const poToken = process.env.YT_DLP_PO_TOKEN;
const configuredClients = parsePlayerClients(playerClientsEnv);
const effectiveClients = poToken
  ? configuredClients
  : configuredClients.filter((client) => client !== "android");
const extractorArgsValue = effectiveClients.length
  ? `youtube:player_client=${effectiveClients.join(",")}${poToken ? `;po_token=android.gvs+${poToken}` : ""}`
  : undefined;

const ytdlpBaseOptions: Record<string, unknown> = {
  sleepInterval: 3,
  maxSleepInterval: 5,
  sleepRequests: 2,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ...(fs.existsSync(cookiesPath) ? { cookies: cookiesPath } : {}),
  retries: 3,
  fragmentRetries: 3,
  jsRuntimes: "node",
  remoteComponents: "ejs:github",
  ...(extractorArgsValue ? { extractorArgs: extractorArgsValue } : {}),
};
const ytdlpPrimaryFormat = "bestaudio/best";
const ytdlpFallbackFormat = "bestaudio/best";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface ProcessPlaylistResult {
  success: boolean;
  imported: number;
  skipped: number;
  firestoreWrites: number;
  errors: string[];
  songs: Array<{
    id: string;
    title: string;
    description: string;
    duration: number;
    artist: string;
    audioUrl: string;
    audioUrlReversed?: string;
  }>;
}

export type ProgressUpdate = {
  total: number;
  processed: number;
  imported: number;
  errors: number;
};

export type ProcessPlaylistOptions = {
  onProgress?: (progress: ProgressUpdate) => void;
};

type YtdlpMetadata = {
  artist?: string;
  artists?: string[];
  track?: string;
  title?: string;
  uploader?: string;
};

const fetchVideoMetadata = async (videoId: string): Promise<YtdlpMetadata> => {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  try {
    const info = (await youtubedl(url, {
      dumpSingleJson: true,
      skipDownload: true,
      noWarnings: true,
      quiet: true,
      ...ytdlpBaseOptions,
    })) as YtdlpMetadata;
    return info;
  } catch (error) {
    console.warn("[yt-dlp] Could not fetch metadata, using fallbacks:", error);
    return {};
  }
};

export const processPlaylist = async (
  workId: string,
  playlistId: string,
  options: ProcessPlaylistOptions = {}
): Promise<ProcessPlaylistResult> => {
  const videos = await fetchPlaylistVideos(playlistId);
  if (!videos.length) {
    return { success: true, imported: 0, skipped: 0, firestoreWrites: 0, errors: [], songs: [] };
  }

  const total = videos.length;
  let processed = 0;
  let imported = 0;
  let errorsCount = 0;
  let firestoreWrites = 0;

  // Log si Firestore est activé
  if (isFirestoreEnabled()) {
    console.log("[ingestion] Firestore activé - écriture directe après chaque upload R2");
  } else {
    console.warn("[ingestion] Firestore NON activé - les songs ne seront PAS écrites en BDD");
  }

  options.onProgress?.({
    total,
    processed,
    imported,
    errors: errorsCount,
  });

  const concurrency = Number(process.env.INGESTION_CONCURRENCY || "2");
  const limit = pLimit(Math.max(1, concurrency));

  const errors: string[] = [];
  const songs: ProcessPlaylistResult["songs"] = [];

  await Promise.all(
    videos.map((video) =>
      limit(async () => {
        try {
          const meta = await fetchVideoMetadata(video.id);
          const artist =
            (meta.artists && meta.artists.length
              ? meta.artists.join(", ")
              : meta.artist) ||
            video.channelTitle ||
            "Artiste YouTube";
          const trackTitle = meta.track || meta.title || video.title;

          // 1. Télécharger et uploader sur R2 (normal + reverse)
          const uploadResult = await downloadUploadAudio(
            workId,
            video.id,
            trackTitle,
            artist,
            video.duration
          );

          // 2. Écrire IMMÉDIATEMENT dans Firestore après upload R2
          const firestoreId = await addSongToFirestore({
            title: trackTitle,
            artist,
            youtubeId: video.id,
            audioUrl: uploadResult.url,
            audioUrlReversed: uploadResult.reversedUrl,
            duration: video.duration,
            workId,
          });

          if (firestoreId) {
            firestoreWrites += 1;
          }

          // 3. Garder en mémoire pour le résultat (compatibilité frontend)
          songs.push({
            id: video.id,
            title: trackTitle,
            description: video.description,
            duration: video.duration,
            artist,
            audioUrl: uploadResult.url,
            audioUrlReversed: uploadResult.reversedUrl,
          });
          imported += 1;
        } catch (error) {
          const message =
            error instanceof Error
              ? `${video.title} - ${error.message}`
              : `${video.title} - Erreur inconnue`;
          errors.push(message);
          errorsCount += 1;
          console.error("[ingestion] erreur piste", message);
        } finally {
          processed += 1;
          options.onProgress?.({
            total,
            processed,
            imported,
            errors: errorsCount,
          });
        }
      })
    )
  );

  console.log(`[ingestion] Terminé: ${imported} importés, ${firestoreWrites} écrits en Firestore`);

  return {
    success: true,
    imported,
    skipped: total - imported,
    firestoreWrites,
    errors,
    songs,
  };
};

const downloadUploadAudio = async (
  workId: string,
  videoId: string,
  title: string,
  artist: string,
  duration: number
) => {
  const tmpInputBase = tmp.tmpNameSync();
  const tmpOutput = tmp.tmpNameSync({ postfix: ".mp3" });
  const tmpOutputReversed = tmp.tmpNameSync({ postfix: ".mp3" });
  let tmpInput: string | null = null;

  try {
    const downloadedPath = await downloadAudioStream(videoId, tmpInputBase);
    tmpInput = downloadedPath;
    await convertToMp3(downloadedPath, tmpOutput);

    // Générer la version reversed à partir du MP3 normal
    await convertToMp3(tmpOutput, tmpOutputReversed, { reverse: true });

    const key = buildObjectKey(workId, videoId, title);
    const reversedKey = key.replace(/\.mp3$/i, "_reversed.mp3");

    const upload = await uploadToR2(tmpOutput, key);
    const reversedUpload = await uploadToR2(tmpOutputReversed, reversedKey);

    return {
      ...upload,
      reversedUrl: reversedUpload.url,
    };
  } finally {
    await Promise.allSettled([
      tmpInput ? fs.remove(tmpInput) : Promise.resolve(),
      fs.remove(tmpOutput),
      fs.remove(tmpOutputReversed),
    ]);
  }
};

const resolveDownloadedPath = async (result: unknown, outputBase: string) => {
  if (typeof result === "string") {
    const candidate = result.trim().split(/\r?\n/).pop()?.trim();
    if (candidate && (await fs.pathExists(candidate))) {
      return candidate;
    }
  }

  const dir = path.dirname(outputBase);
  const baseName = path.basename(outputBase);
  const entries = await fs.readdir(dir);
  const match = entries.find(
    (name) =>
      name.startsWith(baseName) && !name.endsWith(".part") && !name.endsWith(".ytdl")
  );
  if (match) {
    return path.join(dir, match);
  }

  throw new Error("yt-dlp did not produce an output file.");
};

const downloadAudioStream = async (videoId: string, outputBase: string) => {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const outputTemplate = `${outputBase}.%(ext)s`;

  const attempt = async (
    format: string,
    opts: Record<string, unknown>
  ): Promise<string> => {
    console.log(`[yt-dlp] Downloading: ${url}`);
    const result = await youtubedl(url, {
      format,
      output: outputTemplate,
      noPlaylist: true,
      quiet: true,
      noWarnings: true,
      ...opts,
    });
    const downloadedPath = await resolveDownloadedPath(result, outputBase);
    console.log(`[yt-dlp] Downloaded successfully: ${videoId}`);
    return downloadedPath;
  };

  try {
    return await attempt(ytdlpPrimaryFormat, ytdlpBaseOptions);
  } catch (error) {
    console.error(`[yt-dlp] Error downloading ${videoId}:`, error);
    throw new Error(
      `yt-dlp failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

const convertToMp3 = (
  input: string,
  output: string,
  options: { reverse?: boolean } = {}
) => {
  return new Promise<void>((resolve, reject) => {
    const command = ffmpeg(input).audioBitrate(128).format("mp3");
    if (options.reverse) {
      command.audioFilters("areverse");
    }

    command
      .outputOptions([
        "-metadata",
        options.reverse ? "comment=BlindTest-Reverse" : "comment=BlindTest",
      ])
      .on("end", () => resolve())
      .on("error", reject)
      .save(output);
  });
};


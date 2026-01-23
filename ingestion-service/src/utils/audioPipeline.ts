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

// Railway: /app/bin/yt-dlp | Local: yt-dlp in PATH
const ytdlpPath =
  process.env.YT_DLP_PATH || (fs.existsSync("/app/bin/yt-dlp") ? "/app/bin/yt-dlp" : "yt-dlp");
const youtubedl = create(ytdlpPath);

const cookiesPath = "/app/cookies/cookies.txt";
const nodeRuntime =
  process.execPath.includes(" ") ? "node" : `node:${process.execPath}`;

let cachedSupportsJsRuntimes: boolean | null = null;
const supportsJsRuntimes = () => {
  if (cachedSupportsJsRuntimes !== null) {
    return cachedSupportsJsRuntimes;
  }
  try {
    const result = spawnSync(ytdlpPath, ["--help"], { encoding: "utf8" });
    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    cachedSupportsJsRuntimes = output.includes("--js-runtimes");
  } catch {
    cachedSupportsJsRuntimes = false;
  }

  if (!cachedSupportsJsRuntimes) {
    console.warn(
      "[yt-dlp] --js-runtimes not supported by current binary. Continuing without JS runtime."
    );
  }
  return cachedSupportsJsRuntimes;
};

const parsePlayerClients = (value?: string) => {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((client) => client.trim())
    .filter(Boolean);
};

const defaultPlayerClients = "web,tv,ios";
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
  ...(supportsJsRuntimes() ? { jsRuntimes: nodeRuntime } : {}),
  sleepInterval: 3,
  maxSleepInterval: 5,
  sleepRequests: 2,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ...(fs.existsSync(cookiesPath) ? { cookies: cookiesPath } : {}),
};
const ytdlpFallbackOptions: Record<string, unknown> = {
  ...ytdlpBaseOptions,
  ...(extractorArgsValue ? { extractorArgs: extractorArgsValue } : {}),
  retries: 3,
  fragmentRetries: 3,
};
const ytdlpPrimaryFormat = "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio";
const ytdlpFallbackFormat = "140/251/bestaudio";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface ProcessPlaylistResult {
  imported: number;
  skipped: number;
  errors: string[];
  songs: Array<{
    id: string;
    title: string;
    description: string;
    duration: number;
    artist: string;
    audioUrl: string;
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
    return { imported: 0, skipped: 0, errors: [], songs: [] };
  }

  const total = videos.length;
  let processed = 0;
  let imported = 0;
  let errorsCount = 0;

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

          const processed = await downloadUploadAudio(
            workId,
            video.id,
            trackTitle,
            artist,
            video.duration
          );
          songs.push({
            id: video.id,
            title: trackTitle,
            description: video.description,
            duration: video.duration,
            artist,
            audioUrl: processed.url,
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

  return {
    imported,
    skipped: total - imported,
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
  let tmpInput: string | null = null;

  try {
    const downloadedPath = await downloadAudioStream(videoId, tmpInputBase);
    tmpInput = downloadedPath;
    await convertToMp3(downloadedPath, tmpOutput);
    const key = buildObjectKey(workId, videoId, title);
    const upload = await uploadToR2(tmpOutput, key);
    return upload;
  } finally {
    await Promise.allSettled([
      tmpInput ? fs.remove(tmpInput) : Promise.resolve(),
      fs.remove(tmpOutput),
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
    const message = error instanceof Error ? error.message : String(error);
    const retryable =
      /403|Forbidden|Sign in|confirm you|429|Requested format is not available/i.test(
        message
      );
    if (retryable) {
      console.warn(`[yt-dlp] Retry with fallback for ${videoId}`);
      try {
        return await attempt(ytdlpFallbackFormat, ytdlpFallbackOptions);
      } catch (fallbackError) {
        console.error(`[yt-dlp] Fallback failed for ${videoId}:`, fallbackError);
        throw new Error(
          `yt-dlp failed: ${fallbackError instanceof Error ? fallbackError.message : "Unknown error"}`
        );
      }
    }

    console.error(`[yt-dlp] Error downloading ${videoId}:`, error);
    throw new Error(
      `yt-dlp failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
};

const convertToMp3 = (input: string, output: string) => {
  return new Promise<void>((resolve, reject) => {
    ffmpeg(input)
      .audioBitrate(128)
      .format("mp3")
      .outputOptions(["-metadata", "comment=BlindTest"])
      .on("end", () => resolve())
      .on("error", reject)
      .save(output);
  });
};

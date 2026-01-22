import fs from "fs-extra";
import tmp from "tmp";
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
const ytdlpBaseOptions = {
  sleepInterval: 3,
  maxSleepInterval: 5,
  sleepRequests: 2,
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  ...(fs.existsSync(cookiesPath) ? { cookies: cookiesPath } : {}),
};

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
  // Use .webm as YouTube's default audio format (no conversion by yt-dlp needed)
  const tmpInput = tmp.tmpNameSync({ postfix: ".webm" });
  const tmpOutput = tmp.tmpNameSync({ postfix: ".mp3" });

  try {
    await downloadAudioStream(videoId, tmpInput);
    await convertToMp3(tmpInput, tmpOutput);
    const key = buildObjectKey(workId, videoId, title);
    const upload = await uploadToR2(tmpOutput, key, {
      title,
      artist,
      youtubeid: videoId,
      duration: String(duration),
    });
    return upload;
  } finally {
    await Promise.allSettled([fs.remove(tmpInput), fs.remove(tmpOutput)]);
  }
};

const downloadAudioStream = async (videoId: string, destination: string) => {
  const url = `https://www.youtube.com/watch?v=${videoId}`;

  try {
    console.log(`[yt-dlp] Downloading: ${url}`);

    // Download best audio WITHOUT conversion (no ffmpeg needed by yt-dlp)
    // fluent-ffmpeg will handle the conversion to MP3 later
    await youtubedl(url, {
      format: "bestaudio",
      // Removed: extractAudio and audioFormat (those require ffmpeg in yt-dlp's PATH)
      output: destination,
      noPlaylist: true,
      quiet: true,
      noWarnings: true,
      ...ytdlpBaseOptions,
    });

    console.log(`[yt-dlp] Downloaded successfully: ${videoId}`);
  } catch (error) {
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

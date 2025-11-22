import fs from "fs-extra";
import tmp from "tmp";
import { create } from "youtube-dl-exec";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import pLimit from "p-limit";
import { uploadToR2, buildObjectKey } from "../services/cloudflare.js";
import { fetchPlaylistVideos } from "../services/youtube.js";

// Railway: /app/bin/yt-dlp | Local: yt-dlp in PATH
const ytdlpPath = process.env.YT_DLP_PATH || (fs.existsSync("/app/bin/yt-dlp") ? "/app/bin/yt-dlp" : "yt-dlp");
const youtubedl = create(ytdlpPath);

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

interface ProcessPlaylistResult {
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

export const processPlaylist = async (
  workId: string,
  playlistId: string
): Promise<ProcessPlaylistResult> => {
  const videos = await fetchPlaylistVideos(playlistId);
  if (!videos.length) {
    return { imported: 0, skipped: 0, errors: [], songs: [] };
  }

  const concurrency = Number(process.env.INGESTION_CONCURRENCY || "2");
  const limit = pLimit(Math.max(1, concurrency));

  const errors: string[] = [];
  const songs: ProcessPlaylistResult["songs"] = [];

  await Promise.all(
    videos.map((video) =>
      limit(async () => {
        try {
          const processed = await downloadUploadAudio(
            workId,
            video.id,
            video.title,
            video.channelTitle,
            video.duration
          );
          songs.push({
            id: video.id,
            title: video.title,
            description: video.description,
            duration: video.duration,
            artist: video.channelTitle,
            audioUrl: processed.url,
          });
        } catch (error) {
          const message =
            error instanceof Error
              ? `${video.title} - ${error.message}`
              : `${video.title} - Erreur inconnue`;
          errors.push(message);
          console.error("[ingestion] erreur piste", message);
        }
      })
    )
  );

  return {
    imported: songs.length,
    skipped: videos.length - songs.length,
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

import { z } from "zod";

const API_BASE_URL = "/api/youtube";

const playlistValidationSchema = z.object({
  isValid: z.boolean(),
  playlistId: z.string().optional(),
  title: z.string().optional(),
  itemCount: z.number().optional(),
  error: z.string().optional(),
});

const playlistInfoSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      title: z.string(),
      description: z.string(),
      videoCount: z.number(),
    })
    .optional(),
  error: z.string().optional(),
});

const videoInfoSchema = z.object({
  success: z.boolean(),
  data: z
    .object({
      id: z.string(),
      title: z.string(),
      description: z.string(),
      duration: z.string(),
      thumbnails: z
        .object({
          default: z.object({ url: z.string() }),
          medium: z.object({ url: z.string() }),
          high: z.object({ url: z.string() }),
        })
        .partial()
        .optional(),
    })
    .optional(),
  error: z.string().optional(),
});

const videoValidationResultSchema = z.object({
  isValid: z.boolean(),
  videoId: z.string().optional(),
  title: z.string().optional(),
  duration: z.number().optional(),
  error: z.string().optional(),
});

async function request<T>(
  path: string,
  options: RequestInit,
  schema: z.ZodSchema<T>
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const payload = await response.json();
  return schema.parse(payload);
}

export class YouTubeService {
  static async validatePlaylist(playlistUrl: string) {
    const body = JSON.stringify({ playlistId: playlistUrl, playlistUrl });
    return request("/playlist", { method: "POST", body }, playlistValidationSchema);
  }

  static async getPlaylistInfo(playlistId: string) {
    return request(
      `/playlist?playlistId=${playlistId}`,
      { method: "GET" },
      playlistInfoSchema
    );
  }

  static extractPlaylistId(url: string): string | null {
    const patterns = [
      /[?&]list=([a-zA-Z0-9_-]+)/,
      /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    if (/^[a-zA-Z0-9_-]+$/.test(url)) {
      return url;
    }

    return null;
  }

  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /[?&]v=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    if (/^[a-zA-Z0-9_-]+$/.test(url)) {
      return url;
    }

    return null;
  }

  static async validateVideo(videoUrl: string) {
    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) {
      return { isValid: false, error: "ID de vidéo introuvable" };
    }

    try {
      const response = await request(
        `/video?videoId=${videoId}`,
        { method: "GET" },
        videoInfoSchema
      );

      if (!response.success || !response.data) {
        return {
          isValid: false,
          error: response.error || "Vidéo introuvable",
        };
      }

      return videoValidationResultSchema.parse({
        isValid: true,
        videoId: response.data.id,
        title: response.data.title,
        duration: response.data.duration ? parseIsoDuration(response.data.duration) : undefined,
      });
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }

  static async validateVideoId(videoId: string) {
    return this.validateVideo(videoId);
  }
}

const parseIsoDuration = (duration: string): number => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
};

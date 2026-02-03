import { NextResponse } from "next/server";
import { z } from "zod";

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  duration: number;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
}

const extractPlaylistId = (input: string): string => {
  if (!input) return "";

  const trimmed = input.trim();

  const urlPatterns = [
    /[?&]list=([a-zA-Z0-9_-]+)/,
    /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
  ];

  for (const pattern of urlPatterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }

  return trimmed;
};

const playlistIdField = (message: string) =>
  z
    .string()
    .min(1, message)
    .transform(extractPlaylistId)
    .pipe(
      z
        .string()
        .min(1, "L'ID de playlist extrait est vide")
        .regex(/^[a-zA-Z0-9_-]+$/, "Format d'ID de playlist invalide")
    );

const playlistIdSchema = z.object({
  playlistId: playlistIdField("ID de playlist requis"),
});

const playlistBodySchema = z.object({
  playlistId: playlistIdField("ID ou URL de playlist requis"),
});

const ISO_DURATION = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;

const parseDuration = (duration: string): number => {
  const match = duration.match(ISO_DURATION);
  if (!match) return 30;
  const [hours, minutes, seconds] = match
    .slice(1)
    .map((value) => parseInt(value || "0", 10));
  return hours * 3600 + minutes * 60 + seconds;
};

const fetchFromYouTube = async (endpoint: string) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("Cle API YouTube manquante");
  }

  const url = new URL(endpoint);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { next: { revalidate: 300 } });
  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  return response.json();
};

const getPlaylistVideos = async (playlistId: string): Promise<YouTubeVideo[]> => {
  const playlistItems = await fetchFromYouTube(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}`
  );

  const videoIds = playlistItems.items.map(
    (item: { snippet: { resourceId: { videoId: string } } }) =>
      item.snippet.resourceId.videoId
  );

  if (videoIds.length === 0) {
    return [];
  }

  const videosData = await fetchFromYouTube(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(",")}`
  );

  return videosData.items.map(
    (video: {
      id: string;
      snippet: {
        title: string;
        description?: string;
        thumbnails?: {
          default?: { url: string };
          medium?: { url: string };
          high?: { url: string };
        };
      };
      contentDetails: { duration: string };
    }) => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description || "",
      duration: parseDuration(video.contentDetails.duration),
      thumbnails: video.snippet.thumbnails || {
        default: { url: "" },
        medium: { url: "" },
        high: { url: "" },
      },
    })
  );
};

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parseResult = playlistIdSchema.safeParse({
    playlistId: searchParams.get("playlistId"),
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const videos = await getPlaylistVideos(parseResult.data.playlistId);
    return NextResponse.json({
      success: true,
      playlistId: parseResult.data.playlistId,
      count: videos.length,
      items: videos,
    });
  } catch (error) {
    console.error("[YouTube playlist] GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la recuperation de la playlist" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parseResult = playlistBodySchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    );
  }

  const { playlistId } = parseResult.data;

  try {
    const response = await fetchFromYouTube(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=1&playlistId=${playlistId}`
    );

    return NextResponse.json({
      isValid: Boolean(response.items?.length),
      playlistId,
      title: response.items?.[0]?.snippet?.title || "Playlist YouTube",
      itemCount: response.pageInfo?.totalResults || 0,
    });
  } catch (error) {
    console.error("[YouTube playlist] POST error:", error);
    return NextResponse.json(
      { isValid: false, error: "Erreur lors de la validation de la playlist" },
      { status: 200 }
    );
  }
}

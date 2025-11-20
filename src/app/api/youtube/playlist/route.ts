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

const playlistIdField = (message: string) =>
  z.preprocess(
    (value) => (typeof value === "string" ? value : ""),
    z
      .string()
      .min(1, message)
      .regex(/^[a-zA-Z0-9_-]+$/, "Format d'ID de playlist invalide")
  );

const playlistIdSchema = z.object({
  playlistId: playlistIdField("ID de playlist requis"),
});

const playlistBodySchema = z.object({
  playlistId: playlistIdField("ID ou URL de playlist requis"),
});

const importBodySchema = playlistIdSchema;

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
    throw new Error("Clé API YouTube manquante");
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
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(
      ","
    )}`
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
      { error: "Erreur lors de la récupération de la playlist" },
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

  let { playlistId } = parseResult.data;

  const urlMatch =
    playlistId.match(/[?&]list=([a-zA-Z0-9_-]+)/) ||
    playlistId.match(/youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/);

  if (urlMatch) {
    playlistId = urlMatch[1];
  }

  const idValidation = playlistIdSchema.safeParse({ playlistId });
  if (!idValidation.success) {
    return NextResponse.json(
      { error: idValidation.error.issues[0].message },
      { status: 400 }
    );
  }

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

export async function PUT(request: Request) {
  const body = await request.json().catch(() => null);
  const parseResult = importBodySchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const videos = await getPlaylistVideos(parseResult.data.playlistId);

    if (videos.length === 0) {
      return NextResponse.json(
        { error: "Aucune vidéo trouvée dans cette playlist" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      songs: videos,
      count: videos.length,
    });
  } catch (error) {
    console.error("[YouTube playlist] PUT error:", error);
    return NextResponse.json(
      { error: "Erreur lors de l'import de la playlist" },
      { status: 500 }
    );
  }
}

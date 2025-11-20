import { NextResponse } from "next/server";
import { z } from "zod";

interface YouTubeVideoDetails {
  id: string;
  title: string;
  description: string;
  duration: string;
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
}

interface YouTubeVideoApiItem {
  id: string;
  snippet: {
    title?: string;
    description?: string;
    thumbnails?: {
      default?: { url: string };
      medium?: { url: string };
      high?: { url: string };
    };
  };
  contentDetails: { duration?: string };
}

const videoIdField = z.preprocess(
  (value) => (typeof value === "string" ? value : ""),
  z
    .string()
    .min(1, "ID de vidéo requis")
    .regex(/^[a-zA-Z0-9_-]+$/, "Format d'ID de vidéo invalide")
);

const videoIdSchema = z.object({
  videoId: videoIdField,
});

const videoIdsSchema = z.object({
  videoIds: z
    .array(videoIdSchema.shape.videoId)
    .min(1, "Au moins un ID de vidéo est requis")
    .max(50, "Maximum 50 vidéos par requête"),
});

const fetchVideoData = async (query: string) => {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error("Clé API YouTube manquante");
  }

  const url = new URL(
    `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&${query}`
  );
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`YouTube API error: ${response.status}`);
  }

  return response.json();
};

const mapVideo = (item: YouTubeVideoApiItem): YouTubeVideoDetails => {
  const thumbnails = item.snippet.thumbnails || {};

  return {
    id: item.id,
    title: item.snippet.title || "",
    description: item.snippet.description || "",
    duration: item.contentDetails.duration || "PT0S",
    thumbnails: {
      default: thumbnails.default || { url: "" },
      medium: thumbnails.medium || { url: "" },
      high: thumbnails.high || { url: "" },
    },
  };
};

export async function GET(request: Request) {
  const searchParams = new URL(request.url).searchParams;
  const parseResult = videoIdSchema.safeParse({
    videoId: searchParams.get("videoId"),
  });

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const data = await fetchVideoData(`id=${parseResult.data.videoId}`);

    if (data.items.length === 0) {
      return NextResponse.json({ error: "Vidéo non trouvée" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: mapVideo(data.items[0]) });
  } catch (error) {
    console.error("[YouTube video] GET error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la récupération de la vidéo" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parseResult = videoIdsSchema.safeParse(body);

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    );
  }

  try {
    const ids = parseResult.data.videoIds.join(",");
    const data = await fetchVideoData(`id=${ids}`);

    const videos = data.items.map(mapVideo);

    return NextResponse.json({
      success: true,
      data: videos,
      count: videos.length,
      requested: parseResult.data.videoIds.length,
    });
  } catch (error) {
    console.error("[YouTube video] POST error:", error);
    return NextResponse.json(
      { error: "Erreur lors de la validation des vidéos" },
      { status: 500 }
    );
  }
}

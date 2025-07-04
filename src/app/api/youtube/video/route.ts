import { NextRequest, NextResponse } from "next/server";

// Interface pour les détails d'une vidéo YouTube
interface YouTubeVideo {
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

// Fonction pour récupérer les détails d'une vidéo
async function getVideoDetails(videoId: string): Promise<YouTubeVideo | null> {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  if (!YOUTUBE_API_KEY) {
    throw new Error("Clé API YouTube manquante");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoId}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Erreur API YouTube: ${response.status}`);
    }

    const data = await response.json();

    if (data.items.length === 0) {
      return null;
    }

    const item = data.items[0];

    return {
      id: item.id,
      title: item.snippet.title || "",
      description: item.snippet.description || "",
      duration: item.contentDetails.duration || "PT0S",
      thumbnails: item.snippet.thumbnails || {
        default: { url: "" },
        medium: { url: "" },
        high: { url: "" },
      },
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur lors de la récupération de la vidéo:", error);
    }
    throw error;
  }
}

// Route GET pour récupérer les détails d'une vidéo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get("videoId");

    // Validation des paramètres
    if (!videoId) {
      return NextResponse.json(
        { error: "ID de vidéo manquant" },
        { status: 400 }
      );
    }

    // Validation du format de l'ID vidéo
    if (!videoId.match(/^[a-zA-Z0-9_-]+$/)) {
      return NextResponse.json(
        { error: "Format d'ID vidéo invalide" },
        { status: 400 }
      );
    }

    // Récupération des détails
    const video = await getVideoDetails(videoId);

    if (!video) {
      return NextResponse.json({ error: "Vidéo non trouvée" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: video,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur API vidéo:", error);
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de la vidéo",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Route POST pour vérifier l'existence de plusieurs vidéos
export async function POST(request: NextRequest) {
  try {
    const { videoIds } = await request.json();

    if (!videoIds || !Array.isArray(videoIds)) {
      return NextResponse.json(
        { error: "Liste d'IDs vidéo manquante ou invalide" },
        { status: 400 }
      );
    }

    // Limitation à 50 vidéos maximum par requête
    if (videoIds.length > 50) {
      return NextResponse.json(
        { error: "Trop de vidéos demandées (maximum 50)" },
        { status: 400 }
      );
    }

    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "Configuration API manquante" },
        { status: 500 }
      );
    }

    // Récupération des vidéos en une seule requête
    const videoIdsString = videoIds.join(",");
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIdsString}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Erreur API YouTube: ${response.status}`);
    }

    const data = await response.json();

    const videos = data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet.title || "",
      description: item.snippet.description || "",
      duration: item.contentDetails.duration || "PT0S",
      thumbnails: item.snippet.thumbnails || {
        default: { url: "" },
        medium: { url: "" },
        high: { url: "" },
      },
    }));

    return NextResponse.json({
      success: true,
      data: videos,
      count: videos.length,
      requested: videoIds.length,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur validation vidéos:", error);
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la validation des vidéos",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

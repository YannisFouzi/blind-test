import { NextRequest, NextResponse } from "next/server";

// Interface pour les vidéos YouTube
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

// Fonction pour récupérer les vidéos d'une playlist
async function getPlaylistVideos(playlistId: string): Promise<YouTubeVideo[]> {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  if (!YOUTUBE_API_KEY) {
    throw new Error("Clé API YouTube manquante");
  }

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Erreur API YouTube: ${response.status}`);
    }

    const data = await response.json();

    return data.items.map((item: any) => ({
      id: item.snippet.resourceId.videoId,
      title: item.snippet.title,
      description: item.snippet.description || "",
      duration: "0:30", // Durée par défaut
      thumbnails: item.snippet.thumbnails || {
        default: { url: "" },
        medium: { url: "" },
        high: { url: "" },
      },
    }));
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur lors de la récupération de la playlist:", error);
    }
    throw error;
  }
}

// Route GET pour récupérer une playlist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playlistId = searchParams.get("playlistId");

    // Validation des paramètres
    if (!playlistId) {
      return NextResponse.json(
        { error: "ID de playlist manquant" },
        { status: 400 }
      );
    }

    // Validation du format de l'ID playlist
    if (!playlistId.match(/^[a-zA-Z0-9_-]+$/)) {
      return NextResponse.json(
        { error: "Format d'ID playlist invalide" },
        { status: 400 }
      );
    }

    // Récupération des vidéos
    const videos = await getPlaylistVideos(playlistId);

    return NextResponse.json({
      success: true,
      data: videos,
      count: videos.length,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur API playlist:", error);
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de la playlist",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Route POST pour vérifier l'existence d'une playlist
export async function POST(request: NextRequest) {
  try {
    const { playlistId } = await request.json();

    if (!playlistId) {
      return NextResponse.json(
        { error: "ID de playlist manquant" },
        { status: 400 }
      );
    }

    // Test de récupération d'une seule vidéo pour vérifier l'existence
    const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

    if (!YOUTUBE_API_KEY) {
      return NextResponse.json(
        { error: "Configuration API manquante" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=1&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`
    );

    if (!response.ok) {
      return NextResponse.json(
        {
          exists: false,
          error: "Playlist non trouvée ou inaccessible",
        },
        { status: 404 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      exists: true,
      itemCount: data.pageInfo?.totalResults || 0,
    });
  } catch (error: any) {
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur validation playlist:", error);
    }

    return NextResponse.json(
      {
        exists: false,
        error: "Erreur lors de la validation de la playlist",
      },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

// Interface pour les vidéos YouTube
interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  duration: number; // en secondes
  thumbnails: {
    default: { url: string };
    medium: { url: string };
    high: { url: string };
  };
}

// Fonction pour convertir la durée ISO 8601 en secondes
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 30; // Durée par défaut

  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");

  return hours * 3600 + minutes * 60 + seconds;
}

// Fonction pour récupérer les vidéos d'une playlist avec leurs vraies durées
async function getPlaylistVideos(playlistId: string): Promise<YouTubeVideo[]> {
  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  if (!YOUTUBE_API_KEY) {
    throw new Error("Clé API YouTube manquante");
  }

  try {
    // 1. Récupérer les éléments de la playlist
    const playlistResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${playlistId}&key=${YOUTUBE_API_KEY}`
    );

    if (!playlistResponse.ok) {
      throw new Error(`Erreur API YouTube: ${playlistResponse.status}`);
    }

    const playlistData = await playlistResponse.json();
    const videoIds = playlistData.items.map(
      (item: { snippet: { resourceId: { videoId: string } } }) =>
        item.snippet.resourceId.videoId
    );

    if (videoIds.length === 0) {
      return [];
    }

    // 2. Récupérer les détails des vidéos (y compris les durées)
    const videosResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails&id=${videoIds.join(
        ","
      )}&key=${YOUTUBE_API_KEY}`
    );

    if (!videosResponse.ok) {
      throw new Error(`Erreur API YouTube videos: ${videosResponse.status}`);
    }

    const videosData = await videosResponse.json();

    // 3. Combiner les données
    const videos: YouTubeVideo[] = videosData.items.map(
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

    return videos;
  } catch (error: unknown) {
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
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur API playlist:", error);
    }

    return NextResponse.json(
      {
        error: "Erreur lors de la récupération de la playlist",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

// Route POST pour vérifier l'existence d'une playlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let playlistId = body.playlistId || body.playlistUrl;

    if (!playlistId) {
      return NextResponse.json(
        { error: "URL ou ID de playlist manquant" },
        { status: 400 }
      );
    }

    // Si c'est une URL complète, extraire l'ID
    if (playlistId.includes("youtube.com") || playlistId.includes("youtu.be")) {
      const patterns = [
        /[?&]list=([a-zA-Z0-9_-]+)/,
        /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
      ];

      let extractedId = null;
      for (const pattern of patterns) {
        const match = playlistId.match(pattern);
        if (match) {
          extractedId = match[1];
          break;
        }
      }

      if (!extractedId) {
        return NextResponse.json(
          { error: "Format d'URL de playlist invalide" },
          { status: 400 }
        );
      }

      playlistId = extractedId;
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
          isValid: false,
          error: "Playlist non trouvée ou inaccessible",
        },
        { status: 200 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      isValid: true,
      playlistId: playlistId,
      title: data.items?.[0]?.snippet?.title || "Playlist YouTube",
      itemCount: data.pageInfo?.totalResults || 0,
    });
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur validation playlist:", error);
    }

    return NextResponse.json(
      {
        isValid: false,
        error: "Erreur lors de la validation de la playlist",
      },
      { status: 200 }
    );
  }
}

// Route PUT pour importer les chansons d'une playlist
export async function PUT(request: NextRequest) {
  try {
    const { playlistId } = await request.json();

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

    // Récupération des vidéos avec leurs vraies durées
    const videos = await getPlaylistVideos(playlistId);

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
  } catch (error: unknown) {
    if (process.env.NODE_ENV === "development") {
      console.error("Erreur import playlist:", error);
    }

    return NextResponse.json(
      {
        error: "Erreur lors de l'import de la playlist",
        details:
          process.env.NODE_ENV === "development" ? String(error) : undefined,
      },
      { status: 500 }
    );
  }
}

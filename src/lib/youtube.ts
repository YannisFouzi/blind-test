// Configuration YouTube API - Maintenant sécurisée via API routes

export interface YouTubeVideo {
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

export interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  videos: YouTubeVideo[];
}

// Fonction pour récupérer les vidéos d'une playlist via API route sécurisée
export async function getPlaylistVideos(
  playlistId: string
): Promise<YouTubeVideo[]> {
  try {
    const response = await fetch(
      `/api/youtube/playlist?playlistId=${encodeURIComponent(playlistId)}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || "Erreur lors de la récupération de la playlist"
      );
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Erreur YouTube API (playlist):", error);
    return [];
  }
}

// Fonction pour récupérer les détails d'une vidéo via API route sécurisée
export async function getVideoDetails(
  videoId: string
): Promise<YouTubeVideo | null> {
  try {
    const response = await fetch(
      `/api/youtube/video?videoId=${encodeURIComponent(videoId)}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.error || "Erreur lors de la récupération de la vidéo"
      );
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error("Erreur YouTube API (vidéo):", error);
    return null;
  }
}

// Fonction pour vérifier l'existence d'une playlist
export async function validatePlaylist(
  playlistId: string
): Promise<{ exists: boolean; itemCount?: number; error?: string }> {
  try {
    const response = await fetch("/api/youtube/playlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ playlistId }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        exists: false,
        error: data.error || "Erreur lors de la validation",
      };
    }

    return {
      exists: data.exists,
      itemCount: data.itemCount,
    };
  } catch (error) {
    console.error("Erreur validation playlist:", error);
    return {
      exists: false,
      error: "Erreur de connexion",
    };
  }
}

// Fonction pour valider plusieurs vidéos en une fois
export async function validateVideos(
  videoIds: string[]
): Promise<{ valid: YouTubeVideo[]; invalid: string[] }> {
  try {
    const response = await fetch("/api/youtube/video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoIds }),
    });

    if (!response.ok) {
      throw new Error("Erreur lors de la validation des vidéos");
    }

    const data = await response.json();
    const validVideos = data.data || [];
    const validIds = validVideos.map((video: YouTubeVideo) => video.id);
    const invalidIds = videoIds.filter((id) => !validIds.includes(id));

    return {
      valid: validVideos,
      invalid: invalidIds,
    };
  } catch (error) {
    console.error("Erreur validation vidéos:", error);
    return {
      valid: [],
      invalid: videoIds,
    };
  }
}

// Fonction utilitaire pour convertir la durée YouTube (PT1M30S) en secondes
export function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);

  return hours * 3600 + minutes * 60 + seconds;
}

// Fonction utilitaire pour formater la durée en format lisible
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  }
}

/**
 * Service pour gérer les interactions avec l'API YouTube
 */
export class YouTubeService {
  private static readonly API_BASE_URL = "/api/youtube";

  /**
   * Valide une URL de playlist YouTube
   */
  static async validatePlaylist(playlistUrl: string): Promise<{
    isValid: boolean;
    playlistId?: string;
    title?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/playlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }

  /**
   * Récupère les informations d'une playlist
   */
  static async getPlaylistInfo(playlistId: string): Promise<{
    success: boolean;
    data?: {
      title: string;
      description: string;
      videoCount: number;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/playlist?playlistId=${playlistId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }

  /**
   * Valide une URL de vidéo YouTube
   */
  static async validateVideo(videoUrl: string): Promise<{
    isValid: boolean;
    videoId?: string;
    title?: string;
    duration?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/video`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }

  /**
   * Récupère les informations d'une vidéo
   */
  static async getVideoInfo(videoId: string): Promise<{
    success: boolean;
    data?: {
      title: string;
      description: string;
      duration: number;
      thumbnail: string;
    };
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${this.API_BASE_URL}/video?videoId=${videoId}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }

  /**
   * Importe les chansons d'une playlist YouTube
   */
  static async importPlaylistSongs(playlistId: string): Promise<{
    success: boolean;
    songs?: Array<{
      id: string;
      title: string;
      description: string;
      duration: number;
      thumbnails: any;
    }>;
    count?: number;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/playlist`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Erreur inconnue",
      };
    }
  }

  /**
   * Extrait l'ID de playlist d'une URL YouTube
   */
  static extractPlaylistId(url: string): string | null {
    const patterns = [
      /[?&]list=([a-zA-Z0-9_-]+)/,
      /youtube\.com\/playlist\?list=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Extrait l'ID de vidéo d'une URL YouTube
   */
  static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/,
      /[?&]v=([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  }
}

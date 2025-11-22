import { z } from "zod";

const ingestionResponseSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  songs: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        artist: z.string().optional(),
        description: z.string().optional(),
        duration: z.number(),
        audioUrl: z.string().url().optional(),
      })
    )
    .optional(),
  imported: z.number().optional(),
  skipped: z.number().optional(),
  errors: z.array(z.string()).optional(),
});

export const AudioIngestionService = {
  async importPlaylist(workId: string, playlistId: string) {
    console.log("🎵 [AudioIngestionService] Début import playlist");
    console.log("📋 [AudioIngestionService] workId:", workId, "playlistId:", playlistId);

    try {
      console.log("🔗 [AudioIngestionService] Appel /api/audio/import-playlist");

      const response = await fetch("/api/audio/import-playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workId, playlistId }),
      });

      console.log("📡 [AudioIngestionService] Réponse status:", response.status);

      if (!response.ok) {
        const message =
          response.status === 404
            ? "Le service d'import audio n'est pas disponible."
            : "Erreur lors de l'import audio.";
        console.error("❌ [AudioIngestionService] Erreur:", message);
        return { success: false as const, error: message };
      }

      const json = await response.json();
      console.log("📦 [AudioIngestionService] JSON reçu:", json);

      const parsed = ingestionResponseSchema.safeParse(json);

      if (!parsed.success) {
        console.error("❌ [AudioIngestionService] Validation schema échouée:", parsed.error);
        return {
          success: false as const,
          error: "Réponse invalide du service d'import audio.",
        };
      }

      console.log("✅ [AudioIngestionService] Import réussi:", parsed.data);
      return parsed.data;
    } catch (error) {
      console.error("❌ [AudioIngestionService] Exception:", error);
      return {
        success: false as const,
        error:
          error instanceof Error
            ? error.message
            : "Erreur inconnue lors de l'import audio.",
      };
    }
  },
};

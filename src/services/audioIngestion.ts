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

type IngestionResult = z.infer<typeof ingestionResponseSchema>;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const pollJob = async (jobId: string): Promise<IngestionResult> => {
  const maxWaitMs = 15 * 60 * 1000;
  const intervalMs = 2000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    const response = await fetch(
      `/api/audio/import-playlist/status?jobId=${encodeURIComponent(jobId)}`
    );

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      return {
        success: false,
        error: json?.error || "Erreur lors du suivi du job d'import.",
      };
    }

    if (json?.status === "done") {
      const parsed = ingestionResponseSchema.safeParse(json?.result);
      if (!parsed.success) {
        return {
          success: false,
          error: "Reponse invalide du service d'import audio.",
        };
      }
      return parsed.data;
    }

    if (json?.status === "error") {
      return {
        success: false,
        error: json?.error || "Erreur lors de l'import audio.",
      };
    }

    await sleep(intervalMs);
  }

  return {
    success: false,
    error: "Timeout: import trop long.",
  };
};

export const AudioIngestionService = {
  async importPlaylist(workId: string, playlistId: string) {
    try {
      const response = await fetch("/api/audio/import-playlist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workId, playlistId }),
      });

      const json = await response.json().catch(() => null);

      // Backward compatibility: if API returns full result directly
      if (json?.songs || json?.imported !== undefined) {
        const parsed = ingestionResponseSchema.safeParse(json);
        if (!parsed.success) {
          return {
            success: false as const,
            error: "Reponse invalide du service d'import audio.",
          };
        }
        return parsed.data;
      }

      if (!response.ok) {
        return {
          success: false as const,
          error:
            json?.error ||
            "Erreur lors de l'import audio.",
        };
      }

      if (!json?.jobId) {
        return {
          success: false as const,
          error: "Reponse invalide du service d'import audio.",
        };
      }

      return await pollJob(json.jobId);
    } catch (error) {
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

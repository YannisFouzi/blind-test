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

type IngestionJobStatus = "done" | "error" | "timeout";
type IngestionResultWithJob = IngestionResult & {
  jobId?: string;
  status?: IngestionJobStatus;
};

const getDefaultTimeoutMs = () => {
  const minutes = Number(
    process.env.NEXT_PUBLIC_INGESTION_TIMEOUT_MINUTES ?? "60"
  );

  if (Number.isFinite(minutes) && minutes > 0) {
    return minutes * 60 * 1000;
  }

  return 60 * 60 * 1000;
};

const pollJob = async (
  jobId: string,
  options?: { maxWaitMs?: number; intervalMs?: number }
): Promise<IngestionResultWithJob> => {
  const maxWaitMs = options?.maxWaitMs ?? getDefaultTimeoutMs();
  const intervalMs = options?.intervalMs ?? 2000;
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
        status: "error",
        jobId,
      };
    }

    if (json?.status === "done") {
      const parsed = ingestionResponseSchema.safeParse(json?.result);
      if (!parsed.success) {
        return {
          success: false,
          error: "Reponse invalide du service d'import audio.",
          status: "error",
          jobId,
        };
      }
      return {
        ...parsed.data,
        status: "done",
        jobId,
      };
    }

    if (json?.status === "error") {
      return {
        success: false,
        error: json?.error || "Erreur lors de l'import audio.",
        status: "error",
        jobId,
      };
    }

    await sleep(intervalMs);
  }

  return {
    success: false,
    error: "Timeout: import trop long.",
    status: "timeout",
    jobId,
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
        return {
          ...parsed.data,
          status: "done",
        };
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
  async resumeImport(jobId: string, maxWaitMs?: number) {
    return await pollJob(jobId, { maxWaitMs });
  },
};

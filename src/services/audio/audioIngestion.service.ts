import { z } from "zod";

const STATUS_ENDPOINT = "/api/audio/import-playlist/status";
const IMPORT_ENDPOINT = "/api/audio/import-playlist";
const DEFAULT_TIMEOUT_MINUTES = 60;
const DEFAULT_POLL_INTERVAL_MS = 2000;

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
  firestoreWrites: z.number().optional(),
  errors: z.array(z.string()).optional(),
});

type IngestionResult = z.infer<typeof ingestionResponseSchema>;

type IngestionJobStatus = "done" | "error" | "timeout";

type IngestionResultWithJob = IngestionResult & {
  jobId?: string;
  status?: IngestionJobStatus;
};

type PollOptions = {
  maxWaitMs?: number;
  intervalMs?: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const parseIngestionPayload = (payload: unknown): IngestionResult | null => {
  const parsed = ingestionResponseSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
};

const getDefaultTimeoutMs = () => {
  const minutes = Number(process.env.NEXT_PUBLIC_INGESTION_TIMEOUT_MINUTES);

  if (Number.isFinite(minutes) && minutes > 0) {
    return minutes * 60 * 1000;
  }

  return DEFAULT_TIMEOUT_MINUTES * 60 * 1000;
};

const pollJob = async (
  jobId: string,
  options?: PollOptions
): Promise<IngestionResultWithJob> => {
  const maxWaitMs = options?.maxWaitMs ?? getDefaultTimeoutMs();
  const intervalMs = options?.intervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    const response = await fetch(
      `${STATUS_ENDPOINT}?jobId=${encodeURIComponent(jobId)}`
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
      const parsed = parseIngestionPayload(json?.result);
      if (!parsed) {
        return {
          success: false,
          error: "Reponse invalide du service d'import audio.",
          status: "error",
          jobId,
        };
      }
      return {
        ...parsed,
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
      const response = await fetch(IMPORT_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workId, playlistId }),
      });

      const json = await response.json().catch(() => null);

      if (json?.songs || json?.imported !== undefined) {
        const parsed = parseIngestionPayload(json);
        if (!parsed) {
          return {
            success: false as const,
            error: "Reponse invalide du service d'import audio.",
          };
        }
        return {
          ...parsed,
          status: "done",
        };
      }

      if (!response.ok) {
        return {
          success: false as const,
          error: json?.error || "Erreur lors de l'import audio.",
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

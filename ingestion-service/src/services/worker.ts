import { Worker, Job } from "bullmq";
import { getRedisConnection } from "./redis.js";
import { QUEUE_NAME, ImportJobData, ImportJobResult } from "./queue.js";
import { processPlaylist } from "../utils/audioPipeline.js";

let worker: Worker<ImportJobData, ImportJobResult> | null = null;

export const startWorker = () => {
  if (worker) {
    console.log("[Worker] Already running");
    return worker;
  }

  worker = new Worker<ImportJobData, ImportJobResult>(
    QUEUE_NAME,
    async (job: Job<ImportJobData, ImportJobResult>) => {
      console.log(`[Worker] Processing job ${job.id}`, job.data);

      const result = await processPlaylist(job.data.workId, job.data.playlistId, {
        onProgress: async (progress) => {
          // Mettre à jour la progression du job
          await job.updateProgress(progress);
        },
      });

      console.log(`[Worker] Job ${job.id} completed`, {
        imported: result.imported,
        skipped: result.skipped,
        errors: result.errors.length,
      });

      return result;
    },
    {
      connection: getRedisConnection(),
      concurrency: 1, // Une seule playlist à la fois (évite le rate limiting YouTube)
    }
  );

  worker.on("completed", (job: Job<ImportJobData, ImportJobResult>, result: ImportJobResult) => {
    console.log(`[Worker] Job ${job.id} completed: ${result.imported} imported, ${result.skipped} skipped`);
  });

  worker.on("failed", (job: Job<ImportJobData, ImportJobResult> | undefined, error: Error) => {
    console.error(`[Worker] Job ${job?.id} failed:`, error.message);
  });

  worker.on("error", (error: Error) => {
    console.error("[Worker] Error:", error);
  });

  console.log("[Worker] Started and listening for jobs");
  return worker;
};

export const stopWorker = async () => {
  if (worker) {
    await worker.close();
    worker = null;
    console.log("[Worker] Stopped");
  }
};

export const getWorker = () => worker;

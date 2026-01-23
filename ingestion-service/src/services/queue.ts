import { Queue, QueueEvents } from "bullmq";
import { getRedisConnection } from "./redis.js";

export const QUEUE_NAME = "playlist-import";

export type ImportJobData = {
  playlistId: string;
  workId: string;
};

export type ImportJobResult = {
  imported: number;
  skipped: number;
  errors: string[];
  songs: Array<{
    id: string;
    title: string;
    description: string;
    duration: number;
    artist: string;
    audioUrl: string;
  }>;
};

// Queue pour ajouter des jobs
export const importQueue = new Queue<ImportJobData, ImportJobResult>(QUEUE_NAME, {
  connection: getRedisConnection(),
  defaultJobOptions: {
    attempts: 1, // Pas de retry auto (les erreurs YouTube sont souvent définitives)
    removeOnComplete: {
      age: 3600, // Garder les jobs terminés 1h
      count: 100, // Garder max 100 jobs terminés
    },
    removeOnFail: {
      age: 86400, // Garder les jobs échoués 24h
      count: 50,
    },
  },
});

// Events pour suivre les jobs
export const queueEvents = new QueueEvents(QUEUE_NAME, {
  connection: getRedisConnection(),
});

// Helper pour ajouter un job à la queue
export const addImportJob = async (data: ImportJobData) => {
  const job = await importQueue.add("import", data, {
    jobId: `${data.workId}-${data.playlistId}-${Date.now()}`,
  });
  return job;
};

// Helper pour obtenir l'état de la queue
export const getQueueStatus = async () => {
  const [waiting, active, completed, failed] = await Promise.all([
    importQueue.getWaitingCount(),
    importQueue.getActiveCount(),
    importQueue.getCompletedCount(),
    importQueue.getFailedCount(),
  ]);

  const jobs = await importQueue.getJobs(["waiting", "active", "completed", "failed"], 0, 50);

  return {
    counts: { waiting, active, completed, failed },
    jobs: jobs
      .filter((job) => job !== undefined)
      .map((job) => ({
        id: job.id,
        data: job.data,
        status: job.finishedOn
          ? job.failedReason
            ? "failed"
            : "completed"
          : job.processedOn
            ? "active"
            : "waiting",
        progress: job.progress,
        result: job.returnvalue,
        error: job.failedReason,
        createdAt: job.timestamp,
        processedAt: job.processedOn,
        finishedAt: job.finishedOn,
      })),
  };
};

// Helper pour obtenir un job par ID
// Retourne un format compatible avec le frontend existant
export const getJobById = async (jobId: string) => {
  const job = await importQueue.getJob(jobId);
  if (!job) return null;

  // Mapper vers les statuts attendus par le frontend : "done", "error", "running", "queued"
  let status: "done" | "error" | "running" | "queued";
  if (job.finishedOn) {
    status = job.failedReason ? "error" : "done";
  } else if (job.processedOn) {
    status = "running";
  } else {
    status = "queued";
  }

  return {
    id: job.id,
    data: job.data,
    status,
    progress: job.progress,
    result: job.returnvalue,
    error: job.failedReason,
    createdAt: job.timestamp,
    processedAt: job.processedOn,
    finishedAt: job.finishedOn,
  };
};

import { randomUUID } from "crypto";
import type { ProcessPlaylistResult, ProgressUpdate } from "../utils/audioPipeline.js";

export type JobStatus = "queued" | "running" | "done" | "error";

export type ImportJob = {
  id: string;
  status: JobStatus;
  createdAt: number;
  updatedAt: number;
  progress: ProgressUpdate;
  result?: ProcessPlaylistResult;
  error?: string;
};

const JOB_TTL_MS = 60 * 60 * 1000;
const jobs = new Map<string, ImportJob>();

export const createJob = (): ImportJob => {
  const now = Date.now();
  const job: ImportJob = {
    id: randomUUID(),
    status: "queued",
    createdAt: now,
    updatedAt: now,
    progress: { total: 0, processed: 0, imported: 0, errors: 0 },
  };
  jobs.set(job.id, job);
  return job;
};

export const getJob = (jobId: string): ImportJob | undefined => jobs.get(jobId);

export const updateJobProgress = (jobId: string, progress: ProgressUpdate) => {
  const job = jobs.get(jobId);
  if (!job) return;
  job.progress = progress;
  job.updatedAt = Date.now();
};

export const setJobRunning = (jobId: string) => {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "running";
  job.updatedAt = Date.now();
};

export const setJobDone = (jobId: string, result: ProcessPlaylistResult) => {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "done";
  job.result = result;
  job.updatedAt = Date.now();
  scheduleCleanup(jobId);
};

export const setJobError = (jobId: string, message: string) => {
  const job = jobs.get(jobId);
  if (!job) return;
  job.status = "error";
  job.error = message;
  job.updatedAt = Date.now();
  scheduleCleanup(jobId);
};

const scheduleCleanup = (jobId: string) => {
  setTimeout(() => {
    jobs.delete(jobId);
  }, JOB_TTL_MS);
};

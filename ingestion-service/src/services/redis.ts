import { ConnectionOptions } from "bullmq";

// Configuration Redis depuis les variables d'environnement
const REDIS_HOST = process.env.REDIS_HOST || "localhost";
const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379", 10);
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || undefined;

export const getRedisConnection = (): ConnectionOptions => ({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Required by BullMQ
});

console.log(`[Redis] Configuration: ${REDIS_HOST}:${REDIS_PORT}`);

import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { router as importPlaylistRouter } from "./routes/importPlaylist.js";
import { startWorker, stopWorker } from "./services/worker.js";
import { importQueue, queueEvents } from "./services/queue.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/import-playlist", importPlaylistRouter);

const port = process.env.PORT || 4000;

app.listen(port, () => {
  console.log(`[Server] Ingestion service ready on http://localhost:${port}`);
  
  // Démarrer le worker BullMQ
  startWorker();
});

// Graceful shutdown - fermer proprement les connexions
const gracefulShutdown = async (signal: string) => {
  console.log(`[Server] ${signal} received, shutting down gracefully...`);
  
  try {
    // Fermer le worker (attend que le job en cours se termine)
    await stopWorker();
    
    // Fermer les connexions à la queue
    await queueEvents.close();
    await importQueue.close();
    
    console.log("[Server] All connections closed");
    process.exit(0);
  } catch (error) {
    console.error("[Server] Error during shutdown:", error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

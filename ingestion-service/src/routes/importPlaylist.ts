import { Router, type Response } from "express";
import { z } from "zod";
import { addImportJob, getJobById, getQueueStatus } from "../services/queue.js";

const requestSchema = z.object({
  playlistId: z.string().min(1),
  workId: z.string().min(1),
});

export const router = Router();

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur inconnue";

const sendServerError = (res: Response, context: string, error: unknown) => {
  console.error(`[Import] ${context}:`, error);
  return res.status(500).json({
    success: false,
    error: getErrorMessage(error),
  });
};

/**
 * POST /api/import-playlist
 * Ajoute une playlist Ã  la queue d'import
 * Retourne immÃ©diatement avec le jobId
 */
router.post("/", async (req, res) => {
  console.log("[Import] RequÃªte POST reÃ§ue");

  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    console.error("[Import] Validation Ã©chouÃ©e:", parsed.error);
    return res.status(400).json({
      success: false,
      error: "RequÃªte invalide.",
    });
  }

  try {
    const job = await addImportJob(parsed.data);
    
    console.log(`[Import] Job ajoutÃ© Ã  la queue: ${job.id}`);

    return res.status(202).json({
      success: true,
      jobId: job.id,
      message: "Import ajoutÃ© Ã  la queue",
    });
  } catch (error: unknown) {
    return sendServerError(res, "Erreur ajout queue", error);
  }
});

/**
 * GET /api/import-playlist/status/:jobId
 * RÃ©cupÃ¨re le statut d'un job spÃ©cifique
 */
router.get("/status/:jobId", async (req, res) => {
  const { jobId } = req.params;

  try {
    const job = await getJobById(jobId);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "Job introuvable",
      });
    }

    return res.json({
      success: true,
      ...job,
    });
  } catch (error: unknown) {
    return sendServerError(res, "Erreur recuperation status", error);
  }
});

/**
 * GET /api/import-playlist/queue
 * RÃ©cupÃ¨re l'Ã©tat complet de la queue
 */
router.get("/queue", async (_req, res) => {
  try {
    const status = await getQueueStatus();

    return res.json({
      success: true,
      ...status,
    });
  } catch (error: unknown) {
    return sendServerError(res, "Erreur recuperation queue", error);
  }
});





import { Router } from "express";
import { z } from "zod";
import { addImportJob, getJobById, getQueueStatus } from "../services/queue.js";

const requestSchema = z.object({
  playlistId: z.string().min(1),
  workId: z.string().min(1),
});

export const router = Router();

/**
 * POST /api/import-playlist
 * Ajoute une playlist à la queue d'import
 * Retourne immédiatement avec le jobId
 */
router.post("/", async (req, res) => {
  console.log("[Import] Requête POST reçue");
  console.log("[Import] Body:", req.body);

  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    console.error("[Import] Validation échouée:", parsed.error);
    return res.status(400).json({
      success: false,
      error: "Requête invalide.",
    });
  }

  try {
    const job = await addImportJob(parsed.data);
    
    console.log(`[Import] Job ajouté à la queue: ${job.id}`);

    return res.status(202).json({
      success: true,
      jobId: job.id,
      message: "Import ajouté à la queue",
    });
  } catch (error) {
    console.error("[Import] Erreur ajout queue:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * GET /api/import-playlist/status/:jobId
 * Récupère le statut d'un job spécifique
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
  } catch (error) {
    console.error("[Import] Erreur récupération status:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * GET /api/import-playlist/queue
 * Récupère l'état complet de la queue
 */
router.get("/queue", async (_req, res) => {
  try {
    const status = await getQueueStatus();

    return res.json({
      success: true,
      ...status,
    });
  } catch (error) {
    console.error("[Import] Erreur récupération queue:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

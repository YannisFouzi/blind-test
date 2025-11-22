import { Router } from "express";
import { z } from "zod";
import { processPlaylist } from "../utils/audioPipeline.js";

const requestSchema = z.object({
  playlistId: z.string().min(1),
  workId: z.string().min(1),
});

export const router = Router();

router.post("/", async (req, res) => {
  console.log("🎯 [INGESTION-SERVICE] Requête POST reçue sur /api/import-playlist");
  console.log("📦 [INGESTION-SERVICE] Body:", req.body);

  const parsed = requestSchema.safeParse(req.body);

  if (!parsed.success) {
    console.error("❌ [INGESTION-SERVICE] Validation échouée:", parsed.error);
    return res.status(400).json({
      success: false,
      error: "Requête invalide.",
    });
  }

  console.log("✅ [INGESTION-SERVICE] Validation OK");
  console.log("📋 [INGESTION-SERVICE] workId:", parsed.data.workId, "playlistId:", parsed.data.playlistId);

  try {
    console.log("🚀 [INGESTION-SERVICE] Lancement processPlaylist...");
    const result = await processPlaylist(parsed.data.workId, parsed.data.playlistId);

    console.log("✅ [INGESTION-SERVICE] processPlaylist terminé");
    console.log("📊 [INGESTION-SERVICE] Résultat:", {
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors?.length || 0,
      songs: result.songs?.length || 0,
    });

    return res.json({
      success: true,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
      songs: result.songs,
    });
  } catch (error) {
    console.error("❌ [INGESTION-SERVICE] Exception:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Erreur inconnue lors de l'import.",
    });
  }
});

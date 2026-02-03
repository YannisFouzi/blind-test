import { Router } from "express";
import multer from "multer";
import fs from "fs/promises";

const router = Router();
const COOKIES_PATH = "/app/cookies/cookies.txt";
const MAX_COOKIE_FILE_BYTES = 100 * 1024;
const COOKIES_FIELD_NAME = "cookies";
const ALLOWED_EXTENSION = ".txt";

const getErrorMessage = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur upload";

// Configuration multer (stockage en mémoire)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_COOKIE_FILE_BYTES }, // 100 KB max
  fileFilter: (_req, file, cb) => {
    // Accepter uniquement les fichiers .txt
    if (file.originalname.endsWith(ALLOWED_EXTENSION)) {
      cb(null, true);
    } else {
      cb(null, false);
    }
  }
});

/**
 * POST /api/upload-cookies
 * Reçoit un fichier cookies.txt et le sauvegarde dans /app/cookies/
 */
router.post("/", upload.single(COOKIES_FIELD_NAME), async (req, res) => {
  try {
    if (!req.file) {
      console.error("[Cookies] Fichier manquant dans la requête");
      return res.status(400).json({
        success: false,
        error: 'Fichier manquant ou format invalide'
      });
    }

    console.log(`[Cookies] Réception fichier: ${req.file.originalname} (${req.file.size} bytes)`);

    // Écrire le fichier sur le disque
    await fs.writeFile(COOKIES_PATH, req.file.buffer, 'utf-8');

    console.log(`[Cookies] ✅ Fichier uploadé avec succès: ${COOKIES_PATH}`);

    return res.json({
      success: true,
      message: "Cookies uploadés",
      size: req.file.size
    });
  } catch (error: unknown) {
    console.error('[Cookies] ❌ Erreur upload:', error);
    return res.status(500).json({
      success: false,
      error: getErrorMessage(error)
    });
  }
});

export { router };

import { Router } from "express";
import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";

const execAsync = promisify(exec);
const router = Router();

const TEST_VIDEO_ID = "dQw4w9WgXcQ"; // Rick Astley - Never Gonna Give You Up (toujours disponible)
const COOKIES_PATH = "/app/cookies/cookies.txt";

/**
 * GET /api/cookie-check
 * Vérifie si les cookies YouTube sont valides en testant yt-dlp
 */
router.get("/", async (_req, res) => {
  try {
    // Vérifier si le fichier cookies.txt existe
    if (!fs.existsSync(COOKIES_PATH)) {
      console.log("[CookieCheck] Fichier cookies.txt manquant");
      return res.json({
        valid: false,
        message: "Fichier cookies.txt manquant"
      });
    }

    console.log("[CookieCheck] Test en cours avec la vidéo:", TEST_VIDEO_ID);

    // Tester yt-dlp avec les cookies
    const { stdout } = await execAsync(
      `yt-dlp --cookies "${COOKIES_PATH}" --skip-download --print title "https://www.youtube.com/watch?v=${TEST_VIDEO_ID}"`,
      { timeout: 30000 }
    );

    const title = stdout.trim();

    if (title) {
      console.log("[CookieCheck] ✅ Cookies valides - Titre récupéré:", title);
      return res.json({
        valid: true,
        message: "Cookies valides",
        testVideo: title
      });
    }

    throw new Error("Aucun titre récupéré");
  } catch (error: any) {
    const msg = error.stderr || error.message || "";
    const isCookieError = /Sign in|confirm|bot|cookies/i.test(msg);

    console.error("[CookieCheck] ❌ Erreur:", msg);

    return res.json({
      valid: false,
      message: isCookieError ? "Cookies expirés" : `Erreur: ${msg.substring(0, 100)}`
    });
  }
});

export { router };

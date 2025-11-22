#!/usr/bin/env node
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (process.platform !== "linux") {
  console.log("Skipping yt-dlp install on non-Linux platform.");
  process.exit(0);
}

const scriptPath = join(__dirname, "install-yt-dlp.sh");
const result = spawnSync("bash", [scriptPath], { stdio: "inherit" });

if (result.error || result.status !== 0) {
  console.error("Failed to install yt-dlp:", result.error ?? `exit ${result.status}`);
  process.exit(result.status ?? 1);
}

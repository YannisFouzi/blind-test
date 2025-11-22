import "dotenv/config";
import express from "express";
import cors from "cors";
import morgan from "morgan";
import { router as importPlaylistRouter } from "./routes/importPlaylist.js";

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
  console.log(`Ingestion service ready on http://localhost:${port}`);
});

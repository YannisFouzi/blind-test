import express from "express";
import admin from "firebase-admin";

// Configuration via variables d'environnement
const PORT = process.env.PORT || 3000;
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const CLEANUP_SECRET = process.env.CLEANUP_SECRET || "";
const ACTIVE_PLAYER_THRESHOLD_MS = 120_000; // 2 min

if (!SERVICE_ACCOUNT_JSON || !FIREBASE_PROJECT_ID) {
  console.error("Missing FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID env vars.");
  process.exit(1);
}

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: FIREBASE_PROJECT_ID,
  });
}

const db = admin.firestore();
const app = express();
app.use(express.json());

app.post("/cleanup-room", async (req, res) => {
  try {
    const { roomId, secret } = req.body ?? {};
    if (!roomId || typeof roomId !== "string") {
      return res.status(400).json({ error: "roomId required" });
    }
    if (CLEANUP_SECRET && secret !== CLEANUP_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const now = Date.now();
    const playersSnap = await db.collection("rooms").doc(roomId).collection("players").get();
    const activePlayers = playersSnap.docs.filter((doc) => {
      const data = doc.data();
      const lastSeen = data.lastSeen as admin.firestore.Timestamp | undefined;
      const lastSeenMs = lastSeen ? lastSeen.toMillis() : 0;
      return data.connected === true && lastSeenMs > now - ACTIVE_PLAYER_THRESHOLD_MS;
    });

    if (activePlayers.length > 0) {
      return res.status(200).json({ message: "room has active players", activePlayers: activePlayers.length });
    }

    const roomRef = db.collection("rooms").doc(roomId);
    const responsesSnap = await roomRef.collection("responses").get();
    await Promise.all(responsesSnap.docs.map((doc) => doc.ref.delete()));
    await Promise.all(playersSnap.docs.map((doc) => doc.ref.delete()));
    await roomRef.delete();

    return res.status(204).send();
  } catch (error) {
    console.error("[cleanup-room] error", error);
    return res.status(500).json({ error: "internal_error" });
  }
});

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Cleanup service listening on port ${PORT}`);
});

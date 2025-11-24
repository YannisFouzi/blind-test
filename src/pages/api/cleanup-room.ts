import type { NextApiRequest, NextApiResponse } from "next";

const CLEANUP_SERVICE_URL = process.env.CLEANUP_SERVICE_URL;
const CLEANUP_SERVICE_SECRET = process.env.CLEANUP_SERVICE_SECRET;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  const { roomId } = req.body ?? {};

  if (!CLEANUP_SERVICE_URL || !CLEANUP_SERVICE_SECRET) {
    return res.status(500).json({ error: "cleanup_service_not_configured" });
  }

  if (!roomId || typeof roomId !== "string") {
    return res.status(400).json({ error: "roomId_required" });
  }

  try {
    const response = await fetch(`${CLEANUP_SERVICE_URL}/cleanup-room`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ roomId, secret: CLEANUP_SERVICE_SECRET }),
    });

    if (!response.ok && response.status !== 204) {
      const text = await response.text();
      console.error("[api/cleanup-room] cleanup failed", { status: response.status, text });
      return res.status(502).json({ error: "cleanup_failed" });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("[api/cleanup-room] error", error);
    return res.status(500).json({ error: "internal_error" });
  }
}

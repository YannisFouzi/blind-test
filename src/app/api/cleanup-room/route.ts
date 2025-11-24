"use server";

import { NextResponse } from "next/server";

const CLEANUP_SERVICE_URL = process.env.CLEANUP_SERVICE_URL;
const CLEANUP_SERVICE_SECRET = process.env.CLEANUP_SERVICE_SECRET;

export async function POST(request: Request) {
  if (!CLEANUP_SERVICE_URL || !CLEANUP_SERVICE_SECRET) {
    return NextResponse.json({ error: "cleanup_service_not_configured" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { roomId } = body ?? {};

    if (!roomId || typeof roomId !== "string") {
      return NextResponse.json({ error: "roomId_required" }, { status: 400 });
    }

    const response = await fetch(`${CLEANUP_SERVICE_URL}/cleanup-room`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomId, secret: CLEANUP_SERVICE_SECRET }),
    });

    if (!response.ok && response.status !== 204) {
      const text = await response.text();
      console.error("[api/cleanup-room] cleanup failed", { status: response.status, text });
      return NextResponse.json({ error: "cleanup_failed" }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[api/cleanup-room] error", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}

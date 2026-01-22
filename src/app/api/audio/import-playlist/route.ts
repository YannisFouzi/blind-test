import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  playlistId: z.string().min(1),
  workId: z.string().min(1),
});

export async function POST(request: Request) {
  console.log("[API /api/audio/import-playlist] Request received");

  const body = await request.json().catch(() => null);
  console.log("[API] Body:", body);

  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    console.error("[API] Validation failed:", parsed.error);
    return NextResponse.json(
      { success: false, error: "Requete invalide." },
      { status: 400 }
    );
  }

  const ingestionUrl = process.env.INGESTION_SERVICE_URL;
  const ingestionToken = process.env.INGESTION_SERVICE_TOKEN;

  console.log("[API] INGESTION_SERVICE_URL:", ingestionUrl || "NOT SET");
  console.log("[API] INGESTION_SERVICE_TOKEN:", ingestionToken ? "SET" : "NOT SET");

  if (!ingestionUrl) {
    console.error("[API] Ingestion service not configured");
    return NextResponse.json(
      { success: false, error: "Service d'import audio non configure." },
      { status: 500 }
    );
  }

  try {
    const targetUrl = `${ingestionUrl}/api/import-playlist/async`;
    console.log("[API] Calling ingestion service (async):", targetUrl);
    console.log("[API] Payload:", parsed.data);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ingestionToken ? { Authorization: `Bearer ${ingestionToken}` } : {}),
      },
      body: JSON.stringify(parsed.data),
    });

    console.log("[API] Response status:", response.status);

    const json = await response.json().catch(() => null);
    console.log("[API] Response JSON:", json);

    if (!response.ok) {
      console.error("[API] Ingestion service error:", json);
      return NextResponse.json(
        {
          success: false,
          error: json?.error || "Le service d'import audio a rencontre une erreur.",
        },
        { status: response.status }
      );
    }

    if (!json?.jobId) {
      console.error("[API] Missing jobId in response");
      return NextResponse.json(
        { success: false, error: "Reponse invalide du service d'import audio." },
        { status: 500 }
      );
    }

    console.log("[API] Job created:", json.jobId);
    return NextResponse.json({ success: true, jobId: json.jobId }, { status: 202 });
  } catch (error) {
    console.error("[API] Exception:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Le service d'import audio est injoignable.",
      },
      { status: 500 }
    );
  }
}

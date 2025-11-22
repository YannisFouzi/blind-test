import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  playlistId: z.string().min(1),
  workId: z.string().min(1),
});

export async function POST(request: Request) {
  console.log("📥 [API /api/audio/import-playlist] Requête reçue");

  const body = await request.json().catch(() => null);
  console.log("📦 [API] Body reçu:", body);

  const parsed = bodySchema.safeParse(body);

  if (!parsed.success) {
    console.error("❌ [API] Validation échouée:", parsed.error);
    return NextResponse.json(
      { success: false, error: "Requête invalide." },
      { status: 400 }
    );
  }

  const ingestionUrl = process.env.INGESTION_SERVICE_URL;
  const ingestionToken = process.env.INGESTION_SERVICE_TOKEN;

  console.log("🔧 [API] INGESTION_SERVICE_URL:", ingestionUrl || "❌ NON DÉFINIE");
  console.log("🔑 [API] INGESTION_SERVICE_TOKEN:", ingestionToken ? "✅ Défini" : "❌ Non défini");

  if (!ingestionUrl) {
    console.error("❌ [API] Service d'ingestion non configuré");
    return NextResponse.json(
      { success: false, error: "Service d'import audio non configuré." },
      { status: 500 }
    );
  }

  try {
    const targetUrl = `${ingestionUrl}/api/import-playlist`;
    console.log("🚀 [API] Appel au service d'ingestion:", targetUrl);
    console.log("📤 [API] Données envoyées:", parsed.data);

    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ingestionToken ? { Authorization: `Bearer ${ingestionToken}` } : {}),
      },
      body: JSON.stringify(parsed.data),
    });

    console.log("📨 [API] Réponse status:", response.status);

    const json = await response.json().catch(() => null);
    console.log("📨 [API] Réponse JSON:", json);

    if (!response.ok) {
      console.error("❌ [API] Erreur du service d'ingestion:", json);
      return NextResponse.json(
        {
          success: false,
          error:
            json?.error ||
            "Le service d'import audio a rencontré une erreur.",
        },
        { status: response.status }
      );
    }

    console.log("✅ [API] Import terminé avec succès");
    return NextResponse.json(json);
  } catch (error) {
    console.error("❌ [API] Exception:", error);
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

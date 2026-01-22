import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");

  if (!jobId) {
    return NextResponse.json(
      { success: false, error: "jobId manquant." },
      { status: 400 }
    );
  }

  const ingestionUrl = process.env.INGESTION_SERVICE_URL;
  const ingestionToken = process.env.INGESTION_SERVICE_TOKEN;

  if (!ingestionUrl) {
    return NextResponse.json(
      { success: false, error: "Service d'import audio non configure." },
      { status: 500 }
    );
  }

  try {
    const targetUrl = `${ingestionUrl}/api/import-playlist/status/${jobId}`;

    const response = await fetch(targetUrl, {
      headers: {
        ...(ingestionToken ? { Authorization: `Bearer ${ingestionToken}` } : {}),
      },
    });

    const json = await response.json().catch(() => null);

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: json?.error || "Le service d'import audio a rencontre une erreur.",
        },
        { status: response.status }
      );
    }

    return NextResponse.json(json);
  } catch (error) {
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

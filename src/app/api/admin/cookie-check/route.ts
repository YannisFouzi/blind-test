import { NextResponse } from "next/server";

export async function GET() {
  try {
    const response = await fetch(
      `${process.env.INGESTION_SERVICE_URL}/api/cookie-check`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return NextResponse.json({
        valid: false,
        message: "Service d'ingestion inaccessible",
      });
    }

    return NextResponse.json(await response.json());
  } catch (error) {
    console.error("[CookieCheck] Erreur:", error);
    return NextResponse.json({
      valid: false,
      message: "Service inaccessible",
    });
  }
}

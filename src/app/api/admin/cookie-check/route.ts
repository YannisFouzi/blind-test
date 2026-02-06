import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth/adminRouteAuth";

export async function GET(request: Request) {
  const authResult = await requireAdminFromRequest(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const ingestionToken = process.env.INGESTION_SERVICE_TOKEN;
    const response = await fetch(
      `${process.env.INGESTION_SERVICE_URL}/api/cookie-check`,
      {
        cache: "no-store",
        headers: {
          ...(ingestionToken ? { Authorization: `Bearer ${ingestionToken}` } : {}),
        },
      }
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

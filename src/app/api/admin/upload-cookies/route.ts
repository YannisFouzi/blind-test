import { NextResponse } from "next/server";
import { requireAdminFromRequest } from "@/lib/auth/adminRouteAuth";

export async function POST(request: Request) {
  const authResult = await requireAdminFromRequest(request);
  if (!authResult.ok) {
    return authResult.response;
  }

  try {
    const formData = await request.formData();
    const ingestionToken = process.env.INGESTION_SERVICE_TOKEN;

    const response = await fetch(
      `${process.env.INGESTION_SERVICE_URL}/api/upload-cookies`,
      {
        method: "POST",
        body: formData,
        headers: {
          ...(ingestionToken ? { Authorization: `Bearer ${ingestionToken}` } : {}),
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.error || "Erreur upload" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("[UploadCookies] Erreur:", error);
    return NextResponse.json(
      { success: false, error: "Erreur upload" },
      { status: 500 }
    );
  }
}

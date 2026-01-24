import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();

    const response = await fetch(
      `${process.env.INGESTION_SERVICE_URL}/api/upload-cookies`,
      {
        method: 'POST',
        body: formData
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
    console.error('[UploadCookies] Erreur:', error);
    return NextResponse.json(
      { success: false, error: "Erreur upload" },
      { status: 500 }
    );
  }
}

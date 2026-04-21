import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { filename, driveId } = body;

    const gasUrl = process.env.NEXT_PUBLIC_GAS_URL;
    const token = process.env.NEXT_PUBLIC_SECRET_TOKEN;

    if (!gasUrl || !token) {
      return NextResponse.json({ success: false, error: 'Configuración faltante en el servidor.' }, { status: 500 });
    }

    const payload: any = { token, action: 'download', filename };
    if (driveId) {
      payload.fileId = driveId;
    }

    // El servidor Next.js llama a GAS para evitar CORS
    const response = await fetch(gasUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      // Podrías aumentar el timeout aquí si es necesario
    });

    if (!response.ok) {
      return NextResponse.json({ success: false, error: `Error desde GAS: ${response.status}` }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API /api/drive/download error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

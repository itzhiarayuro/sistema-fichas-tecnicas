/**
 * API Route: /api/photos/process
 *
 * Procesa fotos EN EL SERVIDOR con Sharp — 10-20x más rápido que el browser.
 *
 * Recibe: hasta 20 fotos por llamada (FormData)
 * Retorna: JSON con las fotos procesadas en base64 + metadatos
 *
 * Sharp ventajas vs browser:
 *  - Usa libvips (C nativo) — no JavaScript
 *  - Paralelismo real en el servidor
 *  - No bloquea al usuario en absoluto
 *  - Mismo resultado en todos los navegadores
 */

import { NextRequest, NextResponse } from 'next/server';
import { processPhotoServer } from '@/lib/server/photoProcessor';

// Configuración de Next.js para recibir archivos grandes
export const config = {
  api: {
    bodyParser: false,
  },
};

// Límite: 50MB por request (para lotes de ~20 fotos)
export const maxDuration = 60; // segundos máximo por request

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const results: Array<{
      filename: string;
      data: string;       // base64
      mimeType: string;
      originalSize: number;
      processedSize: number;
      width: number;
      height: number;
      error?: string;
    }> = [];

    // Recopilar todos los archivos del FormData preservando orden
    const files: Array<{ name: string; file: Blob }> = [];
    for (const [key, value] of formData.entries()) {
      if (value instanceof Blob) {
        // En Next.js, value suele ser de tipo File (subclase de Blob) que tiene property name
        const fileName = (value as any).name || key;
        files.push({ name: fileName, file: value });
      }
    }

    if (files.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No se recibieron archivos' },
        { status: 400 }
      );
    }

    // Procesar todas las fotos en PARALELO en el servidor
    // Sharp maneja concurrencia internamente — no hay riesgo de saturar
    const processingPromises = files.map(async ({ name, file }) => {
      try {
        const buffer = Buffer.from(await file.arrayBuffer());
        const result = await processPhotoServer(buffer, name);

        return {
          filename: name,
          data: result.buffer.toString('base64'),
          mimeType: 'image/jpeg',
          originalSize: buffer.length,
          processedSize: result.buffer.length,
          width: result.width,
          height: result.height,
        };
      } catch (error) {
        return {
          filename: name,
          data: '',
          mimeType: 'image/jpeg',
          originalSize: 0,
          processedSize: 0,
          width: 0,
          height: 0,
          error: error instanceof Error ? error.message : 'Error desconocido',
        };
      }
    });

    const processed = await Promise.all(processingPromises);
    results.push(...processed);

    const exitosos = results.filter(r => !r.error).length;
    const errores = results.filter(r => r.error).length;

    return NextResponse.json({
      success: true,
      processed: exitosos,
      errors: errores,
      results,
    });

  } catch (error) {
    console.error('[API/photos/process] Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor',
      },
      { status: 500 }
    );
  }
}

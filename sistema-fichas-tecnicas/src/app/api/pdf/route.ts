/**
 * API Route para generación de PDF individual
 * Requirements: 7.1
 * 
 * POST /api/pdf
 * Body: { ficha: FichaState, pozo: Pozo, options?: PDFGeneratorOptions }
 * Response: PDF blob o error
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFMakeGenerator, type PDFGeneratorOptions } from '@/lib/pdf';
import type { FichaState } from '@/types/ficha';
import type { Pozo } from '@/types/pozo';

interface PDFRequestBody {
  ficha: FichaState;
  pozo: Pozo;
  options?: PDFGeneratorOptions;
}

export async function POST(request: NextRequest) {
  try {
    const body: PDFRequestBody = await request.json();

    // Validar datos requeridos
    if (!body.ficha || !body.pozo) {
      return NextResponse.json(
        {
          success: false,
          error: 'Datos incompletos: se requiere ficha y pozo'
        },
        { status: 400 }
      );
    }

    const { ficha, pozo, options = {} } = body;

    // Validación de fotos (Requisito: al menos una foto para generar PDF)
    const fotosCount = pozo.fotos?.fotos?.length || 0;
    if (fotosCount === 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'No se puede generar PDF: la ficha no tiene fotos asociadas. Por favor, cargue al menos una foto.'
        },
        { status: 400 }
      );
    }

    // Generar PDF
    const generator = new PDFMakeGenerator();

    // Check for blob URLs in photos (server-side warning)
    const hasBlobUrls = pozo.fotos?.fotos?.some((f: any) =>
      f.dataUrl?.startsWith('blob:') || (f.blobId && !f.dataUrl?.startsWith('data:'))
    );

    if (hasBlobUrls) {
      console.warn('ADVERTENCIA: Se detectaron URLs de tipo blob: en la petición al servidor. Estas imágenes NO se renderizarán en el PDF generado por servidor (limitación técnica conocida).');
    }

    const result = await generator.generatePDF(ficha, pozo, options);

    if (!result.success || !result.blob) {
      return NextResponse.json(
        {
          success: false,
          error: result.error || 'Error al generar PDF'
        },
        { status: 500 }
      );
    }

    // Convertir blob a ArrayBuffer para la respuesta
    const arrayBuffer = await result.blob.arrayBuffer();

    // Retornar PDF como archivo descargable
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error('Error en API /api/pdf:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno del servidor'
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pdf - Información del endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/pdf',
    method: 'POST',
    description: 'Genera un PDF para una ficha técnica individual',
    body: {
      ficha: 'FichaState - Estado de la ficha',
      pozo: 'Pozo - Datos del pozo',
      options: 'PDFGeneratorOptions (opcional) - Opciones de generación',
    },
    response: 'application/pdf - Archivo PDF descargable',
  });
}

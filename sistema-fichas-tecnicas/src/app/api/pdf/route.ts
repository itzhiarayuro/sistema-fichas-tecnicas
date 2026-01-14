/**
 * API Route para generación de PDF individual
 * Requirements: 7.1
 * 
 * POST /api/pdf
 * Body: { ficha: FichaState, pozo: Pozo, options?: PDFGeneratorOptions }
 * Response: PDF blob o error
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFGenerator, type PDFGeneratorOptions } from '@/lib/pdf';
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

    // Generar PDF
    const generator = new PDFGenerator();
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

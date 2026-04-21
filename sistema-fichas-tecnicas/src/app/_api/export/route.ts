/**
 * API Route para exportación en lote (ZIP)
 * Requirements: 7.6
 * 
 * POST /api/export
 * Body: { items: BatchItem[], options?: PDFGeneratorOptions }
 * Response: ZIP blob o error
 */

import { NextRequest, NextResponse } from 'next/server';
import { BatchGenerator, type BatchItem, type PDFGeneratorOptions } from '@/lib/pdf';

interface ExportRequestBody {
  items: BatchItem[];
  options?: PDFGeneratorOptions;
}

export async function POST(request: NextRequest) {
  try {
    const body: ExportRequestBody = await request.json();
    
    // Validar datos requeridos
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Se requiere al menos un item para exportar' 
        },
        { status: 400 }
      );
    }

    const { items, options = {} } = body;

    // Validar estructura de items
    for (const item of items) {
      if (!item.ficha || !item.pozo) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Cada item debe contener ficha y pozo' 
          },
          { status: 400 }
        );
      }
    }

    // Generar lote de PDFs
    const generator = new BatchGenerator();
    const result = await generator.generateBatch(items, options);

    if (!result.success || !result.zipBlob) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Error al generar archivos',
          details: {
            totalProcessed: result.totalProcessed,
            successCount: result.successCount,
            errorCount: result.errorCount,
            errors: result.errors,
          }
        },
        { status: 500 }
      );
    }

    // Convertir blob a ArrayBuffer para la respuesta
    const arrayBuffer = await result.zipBlob.arrayBuffer();

    // Retornar ZIP como archivo descargable
    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.zipFilename}"`,
        'Content-Length': arrayBuffer.byteLength.toString(),
        'X-Total-Processed': result.totalProcessed.toString(),
        'X-Success-Count': result.successCount.toString(),
        'X-Error-Count': result.errorCount.toString(),
      },
    });
  } catch (error) {
    console.error('Error en API /api/export:', error);
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
 * GET /api/export - Información del endpoint
 */
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/export',
    method: 'POST',
    description: 'Genera múltiples PDFs y los empaqueta en un archivo ZIP',
    body: {
      items: 'BatchItem[] - Array de { ficha: FichaState, pozo: Pozo }',
      options: 'PDFGeneratorOptions (opcional) - Opciones de generación',
    },
    response: 'application/zip - Archivo ZIP con todos los PDFs',
    headers: {
      'X-Total-Processed': 'Número total de items procesados',
      'X-Success-Count': 'Número de PDFs generados exitosamente',
      'X-Error-Count': 'Número de errores',
    },
  });
}

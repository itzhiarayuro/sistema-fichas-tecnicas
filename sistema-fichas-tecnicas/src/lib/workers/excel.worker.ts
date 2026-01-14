/**
 * Excel Worker - Procesamiento de archivos Excel en segundo plano
 * 
 * Implementa el principio: "Todo procesamiento pesado vive fuera del main thread".
 * Requirements: 20.5
 */

import * as XLSX from 'xlsx';
import { parseExcelFileContent } from '../parsers/excelParser';

/**
 * Escucha mensajes del hilo principal
 */
self.onmessage = async (e: MessageEvent) => {
    const { buffer, options } = e.data;

    try {
        // Notificar inicio
        self.postMessage({ type: 'PROGRESS', progress: 10, message: 'Parseando estructura del libro...' });

        // Procesamiento pesado (XLSX.read suele ser síncrono y bloqueante)
        const workbook = XLSX.read(new Uint8Array(buffer), { type: 'array' });

        self.postMessage({ type: 'PROGRESS', progress: 30, message: 'Extrayendo hojas de datos...' });

        // Usar el parser existente sobre el contenido ya cargado
        // Nota: Necesitamos exportar una versión de parseExcelFile que trabaje con el workbook
        const result = await parseExcelFileContent(workbook);

        self.postMessage({ type: 'PROGRESS', progress: 90, message: 'Validando resultados...' });

        // Retornar resultado
        self.postMessage({ type: 'SUCCESS', result });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            error: error instanceof Error ? error.message : 'Error desconocido en el worker de Excel'
        });
    }
};

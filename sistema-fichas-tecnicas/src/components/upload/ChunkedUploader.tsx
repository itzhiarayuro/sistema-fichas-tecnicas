/**
 * ChunkedUploader - Componente para carga masiva de archivos en chunks
 * Optimizado para manejar miles de archivos sin saturar el navegador
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { processBatch } from '@/lib/utils/batchProcessor';

interface ChunkedUploaderProps {
  files: File[];
  chunkSize?: number; // Archivos por chunk (default: 100)
  onProgress?: (processed: number, total: number, currentChunk: number, totalChunks: number) => void;
  onChunkComplete?: (chunkIndex: number, results: any[]) => void;
  onComplete?: (allResults: any[]) => void;
  onError?: (error: Error, chunkIndex: number) => void;
  processor: (file: File, index: number) => Promise<any>;
  disabled?: boolean;
}

export function ChunkedUploader({
  files,
  chunkSize = 100,
  onProgress,
  onChunkComplete,
  onComplete,
  onError,
  processor,
  disabled = false
}: ChunkedUploaderProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [processedFiles, setProcessedFiles] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const totalChunks = Math.ceil(files.length / chunkSize);

  const startProcessing = useCallback(async () => {
    if (isProcessing || files.length === 0) return;

    setIsProcessing(true);
    setCurrentChunk(0);
    setProcessedFiles(0);

    // Crear AbortController para poder cancelar
    abortControllerRef.current = new AbortController();

    const allResults: any[] = [];

    try {
      // Dividir archivos en chunks
      const chunks: File[][] = [];
      for (let i = 0; i < files.length; i += chunkSize) {
        chunks.push(files.slice(i, i + chunkSize));
      }

      // Procesar cada chunk secuencialmente
      for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
        if (abortControllerRef.current?.signal.aborted) {
          break;
        }

        setCurrentChunk(chunkIndex + 1);
        const chunk = chunks[chunkIndex];

        try {
          // Procesar archivos del chunk en paralelo (lotes pequeños)
          const chunkResults = await processBatch({
            items: chunk,
            batchSize: 10, // Procesar 10 archivos a la vez dentro del chunk
            delayBetweenBatches: 50,
            processor: async (file, indexInChunk) => {
              if (abortControllerRef.current?.signal.aborted) {
                throw new Error('Procesamiento cancelado');
              }

              const globalIndex = chunkIndex * chunkSize + indexInChunk;
              const result = await processor(file, globalIndex);

              const newProcessedCount = globalIndex + 1;
              setProcessedFiles(newProcessedCount);
              onProgress?.(newProcessedCount, files.length, chunkIndex + 1, totalChunks);

              return result;
            }
          });

          allResults.push(...chunkResults.results);
          onChunkComplete?.(chunkIndex, chunkResults.results);

          // Pausa más larga entre chunks para evitar saturación
          if (chunkIndex < chunks.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          onError?.(err, chunkIndex);
          console.error(`Error procesando chunk ${chunkIndex}:`, err);
        }
      }

      if (!abortControllerRef.current?.signal.aborted) {
        onComplete?.(allResults);
      }

    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onError?.(err, -1);
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [files, chunkSize, processor, onProgress, onChunkComplete, onComplete, onError, isProcessing, processedFiles, totalChunks]);

  const cancelProcessing = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex items-center gap-4">
        <button
          onClick={startProcessing}
          disabled={disabled || isProcessing || files.length === 0}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isProcessing ? 'Procesando...' : `Procesar ${files.length} archivos`}
        </button>

        {isProcessing && (
          <button
            onClick={cancelProcessing}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Cancelar
          </button>
        )}
      </div>

      {/* Progreso */}
      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Chunk {currentChunk} de {totalChunks}</span>
            <span>{processedFiles} / {files.length} archivos</span>
          </div>

          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(processedFiles / files.length) * 100}%` }}
            />
          </div>

          <div className="text-xs text-gray-500 text-center">
            Procesando en lotes de {chunkSize} archivos para optimizar rendimiento
          </div>
        </div>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-semibold text-gray-900">{files.length}</div>
          <div className="text-gray-600">Total archivos</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-semibold text-gray-900">{totalChunks}</div>
          <div className="text-gray-600">Chunks</div>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <div className="font-semibold text-gray-900">{chunkSize}</div>
          <div className="text-gray-600">Archivos/chunk</div>
        </div>
      </div>
    </div>
  );
}
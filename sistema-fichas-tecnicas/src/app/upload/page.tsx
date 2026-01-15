/**
 * Upload Page - Página de carga de archivos
 * Requirements: 1.1-1.10, 14.1-14.4, 18.4, 18.5
 * 
 * Flujo principal:
 * 1. Usuario arrastra/selecciona archivos
 * 2. Sistema valida y procesa archivos
 * 3. Excel → extrae pozos
 * 4. Imágenes → asocia con pozos por nomenclatura
 * 5. Muestra resumen y permite continuar
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DropZone, DropZoneStatus, FileList, FileItem, UploadProgress, UploadStats, ExcelFormatGuide } from '@/components/upload';
import { RecommendationsPanel } from '@/components/guided';
import { AppShell, NextStepIndicator, ProgressBar } from '@/components/layout';
import { validateFile, isExcelFile, isImageFile } from '@/lib/validators';
import { parseExcelFile, getParseResultSummary } from '@/lib/parsers/excelParser';
import { parseNomenclatura } from '@/lib/parsers/nomenclatura';
import { workerRegistry } from '@/lib/services/workerRegistry';
import { useGlobalStore } from '@/stores/globalStore';
import { useUIStore } from '@/stores/uiStore';
import { blobStore } from '@/lib/storage/blobStore';
import { LimitManager } from '@/lib/managers/limitManager';
import type { Pozo, FotoInfo } from '@/types';

export default function UploadPage() {
  const router = useRouter();

  // Stores
  const { addPozo, addPhoto, setCurrentStep, pozos, photos } = useGlobalStore();
  const { showSuccess, showError, showWarning, showInfo } = useUIStore();

  // Estado local
  const [dropZoneStatus, setDropZoneStatus] = useState<DropZoneStatus>('idle');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [stats, setStats] = useState<UploadStats>({
    totalFiles: 0,
    processedFiles: 0,
    totalPozos: 0,
    totalPhotos: 0,
    warnings: 0,
    errors: 0,
  });
  const [processingMessage, setProcessingMessage] = useState('');
  const [processedPozos, setProcessedPozos] = useState<Pozo[]>([]);
  const [processedPhotos, setProcessedPhotos] = useState<FotoInfo[]>([]);
  const [canContinue, setCanContinue] = useState(false);

  // Actualizar paso del workflow al montar
  useEffect(() => {
    setCurrentStep('upload');
  }, [setCurrentStep]);

  /**
   * Genera un ID único para archivos
   */
  const generateFileId = useCallback(() => {
    return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  /**
   * Procesa un archivo Excel usando un Web Worker
   */
  const processExcelFile = useCallback(async (file: File): Promise<Pozo[]> => {
    try {
      const buffer = await file.arrayBuffer();

      const result = await workerRegistry.runExcelTask<any>(buffer, (progress, message) => {
        setProcessingMessage(message);
        setProgress(prev => Math.max(prev, progress));
      });

      // Mostrar warnings si hay
      if (result.warnings.length > 0) {
        result.warnings.forEach((warning: string) => {
          showWarning(warning);
        });
      }

      // Mostrar errores si hay
      if (result.errors.length > 0) {
        result.errors.forEach((error: string) => {
          showError(error);
        });
      }

      // Mostrar resumen
      const summary = getParseResultSummary(result);
      showInfo(summary, 'Procesamiento Excel');

      return result.pozos;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error al procesar Excel: ${message}`);
      return [];
    }
  }, [showWarning, showError, showInfo]);

  /**
   * Procesa una imagen y la asocia con un pozo
   */
  const processImageFile = useCallback(async (file: File): Promise<FotoInfo | null> => {
    try {
      // Validar límites (Requirement 19.3)
      if (!LimitManager.isPhotoSizeAllowed(file.size)) {
        showError(`El archivo ${file.name} excede el límite de 10 MB.`);
        return null;
      }

      // Parsear nomenclatura
      const nomenclatura = parseNomenclatura(file.name);

      // Guardar en BlobStore (Principios de Hardening)
      const blobId = await blobStore.store(file);

      // Crear objeto FotoInfo estructural (LIVIANO)
      const fotoInfo: FotoInfo = {
        id: generateFileId(),
        idPozo: '', // Se asociará después o se infiere del nombre
        tipo: nomenclatura.tipo || 'otro',
        categoria: nomenclatura.categoria,
        subcategoria: nomenclatura.subcategoria,
        descripcion: nomenclatura.tipo,
        blobId: blobId,
        filename: file.name,
        fechaCaptura: Date.now(),
      };

      // Advertir si la nomenclatura no es válida
      if (!nomenclatura.isValid) {
        showWarning(`${file.name}: ${nomenclatura.error || 'Nomenclatura no reconocida'}`);
      }

      return fotoInfo;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error al procesar imagen ${file.name}: ${message}`);
      return null;
    }
  }, [generateFileId, showWarning, showError]);

  /**
   * Maneja los archivos aceptados por el DropZone
   */
  const handleFilesAccepted = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setIsProcessing(true);
    setDropZoneStatus('uploading');
    setProgress(0);

    const newStats: UploadStats = {
      totalFiles: acceptedFiles.length,
      processedFiles: 0,
      totalPozos: 0,
      totalPhotos: 0,
      warnings: 0,
      errors: 0,
    };

    setStats(newStats);

    // Crear items de archivo iniciales
    const fileItems: FileItem[] = acceptedFiles.map(file => ({
      id: generateFileId(),
      name: file.name,
      size: file.size,
      type: file.type || (isExcelFile(file.name) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'image/jpeg'),
      status: 'pending' as const,
    }));

    setFiles(fileItems);

    const allPozos: Pozo[] = [];
    const allPhotos: FotoInfo[] = [];

    // Procesar archivos uno por uno
    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const fileItem = fileItems[i];

      // Actualizar estado a procesando
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, status: 'processing' as const, progress: 0 } : f
      ));

      setProcessingMessage(`Procesando ${file.name}...`);

      // Validar archivo
      const validation = await validateFile(file);

      if (!validation.isValid) {
        // Archivo inválido
        const errorMsg = validation.errors[0]?.userMessage || 'Archivo no válido';
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, status: 'error' as const, message: errorMsg } : f
        ));
        newStats.errors++;
        setStats({ ...newStats });
        continue;
      }

      // Agregar warnings
      if (validation.warnings.length > 0) {
        newStats.warnings += validation.warnings.length;
      }

      try {
        if (isExcelFile(file.name)) {
          // Procesar Excel
          setProcessingMessage(`Extrayendo datos de ${file.name}...`);
          const pozos = await processExcelFile(file);
          allPozos.push(...pozos);
          newStats.totalPozos += pozos.length;

          setFiles(prev => prev.map(f =>
            f.id === fileItem.id ? {
              ...f,
              status: pozos.length > 0 ? 'success' as const : 'warning' as const,
              message: `${pozos.length} pozos extraídos`
            } : f
          ));
        } else if (isImageFile(file.name)) {
          // Procesar imagen
          setProcessingMessage(`Procesando imagen ${file.name}...`);
          const foto = await processImageFile(file);

          if (foto) {
            allPhotos.push(foto);
            newStats.totalPhotos++;

            setFiles(prev => prev.map(f =>
              f.id === fileItem.id ? {
                ...f,
                status: 'success' as const,
                message: foto.categoria !== 'OTRO' ? `Asociada: ${foto.descripcion}` : 'Sin asociar',
                preview: blobStore.getUrl(foto.blobId) // Usar ObjectURL temporal
              } : f
            ));
          } else {
            setFiles(prev => prev.map(f =>
              f.id === fileItem.id ? {
                ...f,
                status: 'error' as const,
                message: 'Error al procesar imagen'
              } : f
            ));
            newStats.errors++;
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, status: 'error' as const, message } : f
        ));
        newStats.errors++;
      }

      // Actualizar progreso
      newStats.processedFiles = i + 1;
      const progressPercent = ((i + 1) / acceptedFiles.length) * 100;
      setProgress(progressPercent);
      setStats({ ...newStats });
    }

    // Guardar en estado local (acumulativo)
    setProcessedPozos(prev => [...prev, ...allPozos]);
    setProcessedPhotos(prev => [...prev, ...allPhotos]);
    setFiles(prev => [...prev, ...fileItems]);

    // Finalizar
    setIsProcessing(false);
    setProcessingMessage('');
    setProgress(100);

    if (newStats.errors === 0 && (allPozos.length > 0 || allPhotos.length > 0)) {
      setDropZoneStatus('success');
      setCanContinue(true);
      showSuccess(`Carga completada: ${allPozos.length} pozos, ${allPhotos.length} fotos`);
    } else if (newStats.errors > 0 && (allPozos.length > 0 || allPhotos.length > 0)) {
      setDropZoneStatus('success');
      setCanContinue(true);
      showWarning(`Carga completada con ${newStats.errors} errores`);
    } else {
      setDropZoneStatus('error');
      showError('No se pudieron procesar los archivos');
    }
  }, [generateFileId, processExcelFile, processImageFile, showSuccess, showError, showWarning]);

  /**
   * Elimina un archivo de la lista
   */
  const handleRemoveFile = useCallback((fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  }, []);

  /**
   * Continúa al siguiente paso
   */
  const handleContinue = useCallback(() => {
    // Agregar datos en stores (acumulativo)
    if (processedPozos.length > 0) {
      processedPozos.forEach(pozo => addPozo(pozo));
    }
    if (processedPhotos.length > 0) {
      processedPhotos.forEach(photo => addPhoto(photo));
    }

    // Navegar a la página de pozos
    setCurrentStep('review');
    router.push('/pozos');
  }, [processedPozos, processedPhotos, addPozo, addPhoto, setCurrentStep, router]);

  /**
   * Reinicia la carga
   */
  const handleReset = useCallback(() => {
    setFiles([]);
    setDropZoneStatus('idle');
    setProgress(0);
    setStats({
      totalFiles: 0,
      processedFiles: 0,
      totalPozos: 0,
      totalPhotos: 0,
      warnings: 0,
      errors: 0,
    });
    setProcessedPozos([]);
    setProcessedPhotos([]);
    setCanContinue(false);
  }, []);

  // Verificar si ya hay datos cargados
  const hasExistingData = pozos.size > 0 || photos.size > 0;

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Cargar Archivos</h1>
          <p className="mt-2 text-gray-600">
            Arrastra archivos Excel con datos de pozos y fotografías para comenzar.
          </p>

          {/* Enlace a ejemplos */}
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg shadow-sm">
            <div className="flex items-center gap-2 text-green-800 mb-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-semibold">
                ¿Primera vez? Descarga los archivos de ejemplo para ver cómo funciona todo el sistema paso a paso.
              </p>
            </div>

            <p className="text-xs text-green-700 mb-4 ml-7">
              He creado archivos de prueba completos (Excel con 5 pozos y 18 fotos asociadas) para que puedas probar el flujo completo de inmediato.
            </p>

            <div className="flex flex-wrap gap-3 ml-7">
              <a
                href="/archivos-prueba.zip"
                download="archivos-prueba-sistema.zip"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm font-medium"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Descargar Todo (.zip)
              </a>

              <div className="flex gap-2">
                <a
                  href="/archivos-prueba/ejemplo_completo_33campos.xlsx"
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-green-700 bg-white border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Excel (33 campos)
                </a>
                <a
                  href="/archivos-prueba/README.md"
                  target="_blank"
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-green-700 bg-white border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
                >
                  Ver Instrucciones
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de recomendaciones del modo guiado - Requirements 14.1-14.4 */}
        <RecommendationsPanel className="mb-6" maxItems={2} />

        {/* Indicador del siguiente paso - Requirements 18.4, 18.5 */}
        {canContinue && (
          <NextStepIndicator className="mb-6" variant="banner" />
        )}

        {/* Barra de progreso del workflow */}
        <div className="mb-6">
          <ProgressBar showPercentage showStepCount />
        </div>

        {/* Advertencia si hay datos existentes */}
        {hasExistingData && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-yellow-600 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Ya hay datos cargados ({pozos.size} pozos, {photos.size} fotos)
                </p>
                <p className="text-sm text-yellow-700 mt-1">
                  Cargar nuevos archivos agregará a los datos existentes.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Guía de formato Excel con plantilla descargable */}
        <ExcelFormatGuide className="mb-6" />

        {/* Guía de nomenclatura de fotos */}
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="text-sm font-medium text-blue-800 mb-3">
            Guía de nomenclatura de fotos
          </h3>
          <p className="text-xs text-blue-700 mb-3">
            Cada foto debe tener un nombre que comience con el código del pozo (ej: M680) seguido de un guión y el tipo de foto. Cada tipo es una foto separada.
          </p>

          <div className="space-y-3">
            <div>
              <p className="text-xs font-semibold text-blue-800 mb-2">Fotos principales (una letra):</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-700">
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-P.jpg</code> Panorámica</div>
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-T.jpg</code> Tapa</div>
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-I.jpg</code> Interna</div>
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-A.jpg</code> Acceso</div>
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-F.jpg</code> Fondo</div>
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-M.jpg</code> Medición</div>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-blue-800 mb-2">Fotos de entradas/salidas/sumideros:</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-700">
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-E1-T.jpg</code> Entrada 1 Tubería</div>
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-E1-Z.jpg</code> Entrada 1 Zona</div>
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-S-T.jpg</code> Salida Tubería</div>
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-S-Z.jpg</code> Salida Zona</div>
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-SUM1.jpg</code> Sumidero 1</div>
                <div><code className="bg-blue-100 px-2 py-1 rounded">M680-SUM2.jpg</code> Sumidero 2</div>
              </div>
            </div>

            <div className="mt-3 p-2 bg-blue-100 rounded">
              <p className="text-xs text-blue-800">
                <strong>Importante:</strong> Cada archivo es una foto diferente. No combines tipos en un mismo nombre (ej: NO usar M680-AT, usar M680-A.jpg y M680-T.jpg por separado).
              </p>
            </div>
          </div>
        </div>

        {/* DropZone */}
        <DropZone
          onFilesAccepted={handleFilesAccepted}
          externalStatus={dropZoneStatus}
          disabled={isProcessing}
          className="mb-6"
        />

        {/* Progreso de carga */}
        {(isProcessing || progress > 0) && (
          <UploadProgress
            progress={progress}
            stats={stats}
            message={processingMessage}
            isProcessing={isProcessing}
            className="mb-6"
          />
        )}

        {/* Lista de archivos */}
        {files.length > 0 && (
          <div className="mb-6">
            <FileList
              files={files}
              onRemove={handleRemoveFile}
              showPreview={true}
            />
          </div>
        )}

        {/* Acciones */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <button
            type="button"
            onClick={handleReset}
            disabled={isProcessing || files.length === 0}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Limpiar
          </button>

          <div className="flex items-center gap-3">
            {hasExistingData && (
              <button
                type="button"
                onClick={() => router.push('/pozos')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Ver datos existentes
              </button>
            )}

            <button
              type="button"
              onClick={handleContinue}
              disabled={!canContinue || isProcessing}
              className="px-6 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Continuar
              <svg className="inline-block w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

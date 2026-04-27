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

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DropZone, DropZoneStatus, FileList, FileItem, UploadProgress, UploadStats, ExcelFormatGuide } from '@/components/upload';
import { ChunkedUploader } from '@/components/upload/ChunkedUploader';
import { ExcelAuditDashboard } from '@/components/upload/ExcelAuditDashboard';
import { PerformanceMonitor } from '@/components/upload/PerformanceMonitor';
import { RecommendationsPanel } from '@/components/guided';
import { AppShell, NextStepIndicator, ProgressBar } from '@/components/layout';
import { logger } from '@/lib/logger';
import { validateFile, isExcelFile, isImageFile } from '@/lib/validators';
import { parseExcelFile, getParseResultSummary } from '@/lib/parsers/excelParser';
import { parseNomenclatura } from '@/lib/parsers/nomenclatura';
import { workerRegistry } from '@/lib/services/workerRegistry';
import { useGlobalStore } from '@/stores/globalStore';
import { useUIStore } from '@/stores/uiStore';
import { blobStore } from '@/lib/storage/blobStore';
import { LimitManager } from '@/lib/managers/limitManager';
import { processBatch } from '@/lib/utils/batchProcessor';
import { buildExpectedPhotoIndex, filterPhotoFiles, getFiltradoSummary } from '@/lib/utils/smartPhotoFilter';
import type { IndiceFotosEsperadas } from '@/lib/utils/smartPhotoFilter';
import { processPhotosOnServer, checkServerAvailable } from '@/lib/utils/serverPhotoUploader';
import { CloudImportModal } from '@/components/upload/CloudImportModal';
import type { Pozo, FotoInfo } from '@/types';
import { useMounted } from '@/hooks/useMounted';
import { downloadPhotoFromGAS, dataUrlToBlob } from '@/lib/services/drivePhotoDownloader';
import { RobustDrivePhotoDownloader } from '@/lib/services/robustDrivePhotoDownloader';
import { fetchPhotosByDriveIds } from '@/lib/services/driveFastDownloader';
import { PhotoQueue } from '@/lib/services/photoQueue';
import { photoCache } from '@/lib/services/photoCache';
import { perf } from '@/lib/utils/perfLogger';

export default function UploadPageWrapper() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Cargando cargador...</div>}>
      <UploadContent />
    </Suspense>
  );
}

function UploadContent() {
  const router = useRouter();
  const isMounted = useMounted();
  // ... (rest of the component)

  // Stores
  const { addPozo, addPozosBulk, addPhoto, addPhotosBulk, setCurrentStep, pozos, photos } = useGlobalStore();
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
  const [showChunkedUploader, setShowChunkedUploader] = useState(false);
  const [performanceRecommendation, setPerformanceRecommendation] = useState<string>('');
  const [showAuditTool, setShowAuditTool] = useState(false);

  // Índice de fotos esperadas (se construye cuando se carga el Excel)
  const expectedIndexRef = useRef<IndiceFotosEsperadas | null>(null);
  const [filtradoInfo, setFiltradoInfo] = useState<string>('');

  // Estado de la nube
  const [isCloudModalOpen, setIsCloudModalOpen] = useState(false);
  const [cloudImportMode, setCloudImportMode] = useState<'data' | 'full'>('full');
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null); // null = verificando

  // Verificar si el servidor Sharp está disponible al cargar la página
  useEffect(() => {
    checkServerAvailable().then(available => {
      setServerAvailable(available);
      console.log(available
        ? '🚀 Servidor Sharp disponible — procesamiento 10x más rápido activado'
        : '⚠️ Servidor no disponible — usando procesamiento en browser'
      );
    });
  }, []);


  // Refs para importación masiva optimizada
  const realFilesRef = useRef<File[]>([]); // Archivos reales para ChunkedUploader
  const fileUpdatesBuffer = useRef<Map<string, Partial<FileItem>>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchParams = useSearchParams();

  // Handle URL tab parameter
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'audit') {
      setShowAuditTool(true);
    }
  }, [searchParams]);

  // Actualizar paso del workflow al montar
  useEffect(() => {
    setCurrentStep('upload');
  }, [setCurrentStep]);

  /**
   * Aplica actualizaciones acumuladas al estado de archivos.
   * En vez de hacer setFiles() por cada foto (7000 re-renders),
   * acumulamos cambios y los aplicamos juntos cada 500ms.
   */
  const flushFileUpdates = useCallback(() => {
    const updates = fileUpdatesBuffer.current;
    if (updates.size === 0) return;

    // Copiar y limpiar el buffer antes del setState
    const pendingUpdates = new Map(updates);
    updates.clear();

    setFiles(prev => {
      const newFiles = [...prev];
      for (let i = 0; i < newFiles.length; i++) {
        const update = pendingUpdates.get(newFiles[i].id);
        if (update) {
          newFiles[i] = { ...newFiles[i], ...update };
        }
      }
      return newFiles;
    });
  }, []);

  /**
   * Programa una actualización de archivo para el próximo flush.
   * Múltiples actualizaciones al mismo archivo se fusionan.
   */
  const scheduleFileUpdate = useCallback((fileId: string, update: Partial<FileItem>) => {
    // Fusionar con update existente si hay
    const existing = fileUpdatesBuffer.current.get(fileId) || {};
    fileUpdatesBuffer.current.set(fileId, { ...existing, ...update });

    // Programar flush si no hay uno pendiente
    if (!flushTimerRef.current) {
      flushTimerRef.current = setTimeout(() => {
        flushTimerRef.current = null;
        flushFileUpdates();
      }, 500);
    }
  }, [flushFileUpdates]);

  // Limpiar timer al desmontar
  useEffect(() => {
    return () => {
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushFileUpdates(); // Flush final
      }
    };
  }, [flushFileUpdates]);

  // ✅ NUEVO: Si ya hay pozos cargados en el store, construir el índice automáticamente
  // Esto cubre el caso donde el Excel se cargó en una sesión anterior
  useEffect(() => {
    if (pozos.size > 0 && !expectedIndexRef.current) {
      expectedIndexRef.current = buildExpectedPhotoIndex(pozos);
      console.log(
        `📋 Índice restaurado desde store: ${expectedIndexRef.current.totalPozos} pozos, ` +
        `${expectedIndexRef.current.totalEsperadas} fotos esperadas`
      );
    }
  }, [pozos]);

  /**
   * Genera un ID único para archivos
   */
  const generateFileId = useCallback(() => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const cryptoId = typeof crypto !== 'undefined' ? crypto.randomUUID().split('-')[0] : '';
    return `file-${timestamp}-${random}${cryptoId ? `-${cryptoId}` : ''}`;
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
  const processImageFile = useCallback(async (file: File): Promise<FotoInfo[]> => {
    try {
      // Validar límites (Requirement 19.3)
      if (!LimitManager.isPhotoSizeAllowed(file.size)) {
        showError(`El archivo ${file.name} excede el límite de 10 MB.`);
        return [];
      }

      // Parsear nomenclatura (Ahora puede devolver ARRAY)
      const nomenclaturas = parseNomenclatura(file.name);

      // --- OPTIMIZACIÓN: Servidor (Sharp) o Browser (Worker) ---
      let finalFile: File | Blob = file;
      let serverMetadata: any = null;

      if (serverAvailable) {
        // ✅ USAR SERVIDOR: 10-20x más rápido
        try {
          const serverResults = await processPhotosOnServer([file]);
          if (serverResults.length > 0 && !serverResults[0].error) {
            finalFile = serverResults[0].blob;
            serverMetadata = serverResults[0];
          }
        } catch (err) {
          console.warn(`Fallo en servidor para ${file.name}, usando browser:`, err);
        }
      }

      // Fallback a Worker si el servidor no se usó o falló
      if (finalFile === file && file.size > 2 * 1024 * 1024) {
        try {
          const result = await workerRegistry.runPhotoTask<any>(file, {
            maxWidth: 2000,
            quality: 0.92,
            generateHash: false
          });
          if (result && result.blob) {
            finalFile = result.blob;
          }
        } catch (workerError) {
          console.warn(`No se pudo comprimir ${file.name}, usando original:`, workerError);
        }
      }

      // Guardar en BlobStore (Principios de Hardening)
      const blobId = await blobStore.store(finalFile);

      // Crear objetos FotoInfo estructurales (uno por cada interpretación de la nomenclatura)
      const fotos: FotoInfo[] = nomenclaturas.map(nomen => {
        let finalPozoId = nomen.pozoId;
        let finalSubcategoria = nomen.subcategoria;

        // ✅ NUEVO: Resolver si es un ID de sumidero (S510-T.jpg -> M076 - SUM1)
        if (expectedIndexRef.current?.sumideroResolution.has(nomen.pozoId)) {
          const res = expectedIndexRef.current.sumideroResolution.get(nomen.pozoId)!;
          finalPozoId = res.pozoId;
          finalSubcategoria = res.subcategoria;
        }

        return {
          id: generateFileId(),
          idPozo: finalPozoId,
          tipo: nomen.tipo || 'otro',
          categoria: nomen.categoria,
          subcategoria: finalSubcategoria,
          descripcion: nomen.tipo,
          blobId: blobId,
          filename: file.name,
          fechaCaptura: Date.now(),
        };
      });

      // Advertir si la nomenclatura principal no es válida
      if (!nomenclaturas[0].isValid) {
        showWarning(`${file.name}: ${nomenclaturas[0].error || 'Nomenclatura no reconocida'}`);
      }

      return fotos;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      showError(`Error al procesar imagen ${file.name}: ${message}`);
      return [];
    }
  }, [generateFileId, showWarning, showError]);

  /**
   * Maneja los archivos aceptados por el DropZone
   */
  const handleFilesAccepted = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Si hay más de 200 archivos, activar automáticamente el modo chunked optimizado
    if (acceptedFiles.length > 200) {
      realFilesRef.current = acceptedFiles;

      const initialFileItems: FileItem[] = acceptedFiles.map(file => ({
        id: generateFileId(),
        name: file.name,
        size: file.size,
        type: file.type || 'image/jpeg',
        status: 'pending' as const,
      }));
      setFiles(initialFileItems);
      setStats({
        totalFiles: acceptedFiles.length,
        processedFiles: 0,
        totalPozos: 0,
        totalPhotos: 0,
        warnings: 0,
        errors: 0,
      });
      setShowChunkedUploader(true);
      return;
    }

    // Filtrar archivos no deseados según solicitud del usuario (Requirement: Eliminar -T, AT, -Z)
    const filteredFiles = acceptedFiles.filter(file => {
      // Ignorar archivos que no son imágenes para este filtro específico de sufijos
      if (!isImageFile(file.name)) return true;

      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '').trim().toUpperCase();
      const shouldExclude = nameWithoutExt.endsWith('AT') ||
        nameWithoutExt.endsWith('-Z');

      if (shouldExclude) {
        logger.info(`Archivo excluido por regla de sufijo: ${file.name}`, { file: file.name }, 'UploadPage');
      }

      return !shouldExclude;
    });

    const excludedCount = acceptedFiles.length - filteredFiles.length;
    if (excludedCount > 0) {
      showInfo(`Se han omitido ${excludedCount} archivos con sufijos no permitidos (AT, -Z) para evitar errores.`);
    }

    if (filteredFiles.length === 0) {
      setDropZoneStatus('idle');
      return;
    }

    setIsProcessing(true);
    setDropZoneStatus('uploading');
    setProgress(0);

    const newStats: UploadStats = {
      totalFiles: filteredFiles.length,
      processedFiles: 0,
      totalPozos: 0,
      totalPhotos: 0,
      warnings: 0,
      errors: 0,
    };

    setStats(newStats);

    // Crear items de archivo iniciales
    const fileItems: FileItem[] = filteredFiles.map(file => ({
      id: generateFileId(),
      name: file.name,
      size: file.size,
      type: file.type || (isExcelFile(file.name) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'image/jpeg'),
      status: 'pending' as const,
    }));

    setFiles(prev => [...prev, ...fileItems]);

    const allPozos: Pozo[] = [];
    const allPhotos: FotoInfo[] = [];

    // Separar archivos por tipo
    const excelFiles: Array<{ file: File; fileItem: FileItem; index: number }> = [];
    const imageFiles: Array<{ file: File; fileItem: FileItem; index: number }> = [];

    filteredFiles.forEach((file, index) => {
      const fileItem = fileItems[index];
      if (isExcelFile(file.name)) {
        excelFiles.push({ file, fileItem, index });
      } else if (isImageFile(file.name)) {
        imageFiles.push({ file, fileItem, index });
      }
    });

    // Procesar archivos Excel primero (secuencialmente)
    for (const { file, fileItem, index } of excelFiles) {
      // Actualizar estado a procesando
      setFiles(prev => prev.map(f =>
        f.id === fileItem.id ? { ...f, status: 'processing' as const, progress: 0 } : f
      ));

      setProcessingMessage(`Procesando ${file.name}...`);

      // Validar archivo
      const validation = await validateFile(file);

      if (!validation.isValid) {
        const errorMsg = validation.errors[0]?.userMessage || 'Archivo no válido';
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, status: 'error' as const, message: errorMsg } : f
        ));
        newStats.errors++;
        setStats({ ...newStats });
        continue;
      }

      if (validation.warnings.length > 0) {
        newStats.warnings += validation.warnings.length;
      }

      try {
        setProcessingMessage(`Extrayendo datos de ${file.name}...`);
        const extractedPozos = await processExcelFile(file);
        allPozos.push(...extractedPozos);
        newStats.totalPozos += extractedPozos.length;

        // ✅ NUEVO: Construir índice de fotos esperadas desde los pozos del Excel
        // Esto permite filtrar fotos inteligentemente ANTES de procesarlas
        if (extractedPozos.length > 0) {
          // Convertir array a Map para el índice
          const pozosMap = new Map<string, Pozo>();

          // 1. Agregar pozos nuevos del Excel
          extractedPozos.forEach(p => pozosMap.set(p.id, p));

          // 2. También incluir pozos ya cargados antes (desde el store)
          // Usamos el Map 'pozos' que viene de useGlobalStore (desestructurado arriba)
          if (pozos instanceof Map) {
            pozos.forEach((p, id) => pozosMap.set(id, p));
          } else if (typeof pozos === 'object' && pozos !== null) {
            // Caso por si pozos fuera un objeto literal en vez de Map
            Object.entries(pozos).forEach(([id, p]) => pozosMap.set(id, p as Pozo));
          }

          expectedIndexRef.current = buildExpectedPhotoIndex(pozosMap);
          showInfo(
            `📋 Índice creado: ${expectedIndexRef.current.totalPozos} pozos, ` +
            `${expectedIndexRef.current.totalEsperadas} fotos esperadas`,
            'Filtro inteligente activado'
          );
        }

        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? {
            ...f,
            status: extractedPozos.length > 0 ? 'success' as const : 'warning' as const,
            message: `${extractedPozos.length} pozos extraídos`
          } : f
        ));
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Error desconocido';
        setFiles(prev => prev.map(f =>
          f.id === fileItem.id ? { ...f, status: 'error' as const, message } : f
        ));
        newStats.errors++;
      }

      newStats.processedFiles++;
      setStats({ ...newStats });
    }

    // Procesar imágenes en lotes (batch processing optimizado)
    if (imageFiles.length > 0) {
      console.log(`📸 ${imageFiles.length} imágenes recibidas...`);

      // ─── FILTRO INTELIGENTE ───────────────────────────────────────────────
      // Si ya hay un Excel cargado, filtrar ANTES de procesar
      // Solo pasan las fotos que pertenecen a pozos conocidos
      let imageFilesToProcess = imageFiles;

      if (expectedIndexRef.current && expectedIndexRef.current.totalPozos > 0) {
        const rawFiles = imageFiles.map(({ file }) => file);
        const filtrado = filterPhotoFiles(rawFiles, expectedIndexRef.current);

        // Reconstruir array con el mismo formato original (file + fileItem)
        const aceptadasSet = new Set(filtrado.aceptadas);
        imageFilesToProcess = imageFiles.filter(({ file }) => aceptadasSet.has(file));

        // Marcar las descartadas como "ignoradas" en la UI
        const descartadasSet = new Set([
          ...filtrado.descartadasPozoInexistente,
          ...filtrado.descartadasNomenclaturaInvalida,
        ]);
        for (const { file, fileItem } of imageFiles) {
          if (descartadasSet.has(file)) {
            scheduleFileUpdate(fileItem.id, {
              status: 'warning' as const,
              message: filtrado.descartadasPozoInexistente.includes(file)
                ? '⏭️ Pozo no encontrado en Excel'
                : '⏭️ Nombre de archivo no reconocido',
            });
          }
        }

        const summary = getFiltradoSummary(filtrado, expectedIndexRef.current);
        setFiltradoInfo(summary);
        console.log(summary);

        if (filtrado.stats.descartadas > 0) {
          showInfo(
            `Filtro inteligente: ${filtrado.stats.aceptadas} fotos a procesar, ` +
            `${filtrado.stats.descartadas} descartadas (no corresponden a ningún pozo del Excel)`,
            '⚡ Optimización aplicada'
          );
        }
      }
      // ─── FIN FILTRO ────────────────────────────────────────────────────────

      const isLargeImport = imageFilesToProcess.length > 200;
      console.log(`📸 Procesando ${imageFilesToProcess.length} imágenes en lotes optimizados...`);

      // ─── PROCESAMIENTO: SERVIDOR (rápido) o BROWSER (fallback) ───────────
      if (serverAvailable && imageFilesToProcess.length > 0) {
        // MODO SERVIDOR — Sharp en el servidor, 10-20x más rápido
        setProcessingMessage(`⚡ Procesando ${imageFilesToProcess.length} fotos en el servidor...`);

        const rawFiles = imageFilesToProcess.map(({ file }) => file);

        try {
          const serverResults = await processPhotosOnServer(rawFiles, (done, total) => {
            const pct = Math.round((done / total) * 100);
            setProgress(pct);
            setProcessingMessage(`⚡ Servidor: ${done}/${total} fotos procesadas...`);
            newStats.processedFiles = done;
            setStats({ ...newStats });
          });

          // Guardar resultados en BlobStore y crear FotoInfo
          for (let i = 0; i < serverResults.length; i++) {
            const serverResult = serverResults[i];
            const { fileItem } = imageFilesToProcess[i];

            if (serverResult.error || serverResult.blob.size === 0) {
              scheduleFileUpdate(fileItem.id, { status: 'error', message: serverResult.error || 'Error en servidor' });
              newStats.errors++;
              continue;
            }

            // Parsear nomenclatura (Múltiples resultados posibles)
            const nomenclaturas = parseNomenclatura(serverResult.filename);

            // Guardar en BlobStore
            const blobId = await blobStore.store(serverResult.blob);

            for (const nomen of nomenclaturas) {
              let finalPozoId = nomen.pozoId;
              let finalSubcategoria = nomen.subcategoria;

              // ✅ NUEVO: Resolver si es un ID de sumidero
              if (expectedIndexRef.current?.sumideroResolution.has(nomen.pozoId)) {
                const res = expectedIndexRef.current.sumideroResolution.get(nomen.pozoId)!;
                finalPozoId = res.pozoId;
                finalSubcategoria = res.subcategoria;
              }

              const fotoInfo: FotoInfo = {
                id: generateFileId(),
                idPozo: finalPozoId,
                tipo: nomen.tipo || 'otro',
                categoria: nomen.categoria,
                subcategoria: finalSubcategoria,
                descripcion: nomen.tipo,
                blobId,
                filename: serverResult.filename,
                fechaCaptura: Date.now(),
              };

              allPhotos.push(fotoInfo);
              newStats.totalPhotos++;
            }

            const primaryNomen = nomenclaturas[0];
            scheduleFileUpdate(fileItem.id, {
              status: 'success',
              message: primaryNomen.isValid
                ? `✅ ${nomenclaturas.length > 1 ? 'Múltiple: ' : ''}${primaryNomen.tipo} (${(serverResult.originalSize / 1024).toFixed(0)}KB→${(serverResult.processedSize / 1024).toFixed(0)}KB)`
                : 'Procesada (sin asociar)',
            });
          }

          setStats({ ...newStats });

        } catch (serverError) {
          // Si el servidor falla completamente, caer al modo browser
          console.error('Error en servidor, usando browser:', serverError);
          showWarning('El servidor falló — procesando en el browser (más lento)');
          // Caer al modo browser abajo
          await processBatch({
            items: imageFilesToProcess,
            batchSize: isLargeImport ? 15 : 20,
            delayBetweenBatches: isLargeImport ? 100 : 50,
            lowMemoryMode: isLargeImport,
            processor: async ({ file, fileItem }, globalIndex) => {
              scheduleFileUpdate(fileItem.id, { status: 'processing', progress: 0 });
              const fotos = await processImageFile(file);
              if (fotos.length > 0) {
                fotos.forEach(foto => {
                  allPhotos.push(foto);
                  newStats.totalPhotos++;
                });
                const primary = fotos[0];
                scheduleFileUpdate(fileItem.id, {
                  status: 'success',
                  message: primary.categoria !== 'OTRO'
                    ? `${fotos.length > 1 ? 'Múltiple: ' : ''}${primary.descripcion}`
                    : 'Sin asociar'
                });
                return fotos;
              }
              scheduleFileUpdate(fileItem.id, { status: 'error', message: 'Error al procesar' });
              newStats.errors++;
              return null;
            },
            onProgress: (done, total) => {
              setProgress(Math.round((done / total) * 100));
              newStats.processedFiles = done;
              setStats({ ...newStats });
            },
          });
        }

      } else {
        // MODO BROWSER — fallback si el servidor no está disponible

        await processBatch({
          items: imageFilesToProcess,
          batchSize: isLargeImport ? 15 : 20,
          delayBetweenBatches: isLargeImport ? 100 : 50,
          lowMemoryMode: isLargeImport, // No acumular todos los resultados en un array
          processor: async ({ file, fileItem }, globalIndex) => {
            // Usar buffer en vez de setFiles() directo (evita N re-renders)
            scheduleFileUpdate(fileItem.id, { status: 'processing' as const, progress: 0 });

            // Validar archivo
            const validation = await validateFile(file);

            if (!validation.isValid) {
              const errorMsg = validation.errors[0]?.userMessage || 'Archivo no válido';
              scheduleFileUpdate(fileItem.id, { status: 'error' as const, message: errorMsg });
              newStats.errors++;
              return null;
            }

            if (validation.warnings.length > 0) {
              newStats.warnings += validation.warnings.length;
            }

            try {
              const fotos = await processImageFile(file);

              if (fotos.length > 0) {
                fotos.forEach(foto => {
                  allPhotos.push(foto);
                  newStats.totalPhotos++;
                });

                const primary = fotos[0];
                scheduleFileUpdate(fileItem.id, {
                  status: 'success' as const,
                  message: primary.categoria !== 'OTRO'
                    ? `${fotos.length > 1 ? 'Múltiple: ' : ''}${primary.descripcion}`
                    : 'Sin asociar',
                });

                return fotos;
              } else {
                scheduleFileUpdate(fileItem.id, {
                  status: 'error' as const,
                  message: 'Error al procesar imagen'
                });
                newStats.errors++;
                return null;
              }
            } catch (error) {
              const message = error instanceof Error ? error.message : 'Error desconocido';
              scheduleFileUpdate(fileItem.id, { status: 'error' as const, message });
              newStats.errors++;
              return null;
            }
          },
          onProgress: (processed, total) => {
            newStats.processedFiles = excelFiles.length + processed;
            const progressPercent = ((excelFiles.length + processed) / filteredFiles.length) * 100;
            setProgress(progressPercent);
            setStats({ ...newStats });
            setProcessingMessage(`Procesando imágenes: ${processed}/${total}`);
          },
        });

      } // fin else modo browser

      // Flush final de actualizaciones pendientes
      if (flushTimerRef.current) {
        clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      flushFileUpdates();
    }

    // Guardar en estado local (acumulativo)
    setProcessedPozos(prev => [...prev, ...allPozos]);
    setProcessedPhotos(prev => [...prev, ...allPhotos]);
    // Nota: Los fileItems ya se agregaron al inicio del procesamiento (linea 178 aprox)
    // y se actualizaron individualmente durante el bucle. No agregarlos de nuevo aquí.
    // setFiles(prev => [...prev, ...fileItems]);

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
  }, [generateFileId, processExcelFile, processImageFile, showSuccess, showError, showWarning, showInfo, scheduleFileUpdate, flushFileUpdates]);

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
    // Agregar datos en stores (masivamente para evitar miles de re-renders)
    if (processedPozos.length > 0) {
      addPozosBulk(processedPozos);
    }
    if (processedPhotos.length > 0) {
      addPhotosBulk(processedPhotos);
    }

    // Navegar a la página de pozos
    setCurrentStep('review');
    router.push('/pozos');
  }, [processedPozos, processedPhotos, addPozo, addPhoto, setCurrentStep, router]);

  /**
   * Maneja la importación de datos desde la nube
   */
  const handleCloudImport = useCallback(async (importedPozos: Pozo[], includePhotos: boolean = true) => {
    if (importedPozos.length === 0) return;

    // Registrar el modo de import: el generador de PDF usa esto para decidir
    // si debe ir a la nube a buscar fotos faltantes, o solo usar las locales.
    useGlobalStore.getState().setLastImportWithPhotos(includePhotos);

    setIsProcessing(true);
    setProcessingMessage(includePhotos ? 'Descargando las fotos de los pozos seleccionados... (Esto puede tardar)' : 'Importando datos desde la nube...');

    const importedPhotos: FotoInfo[] = [];

    if (includePhotos) {
    // Verificar credenciales antes de intentar descargar fotos
    if (!process.env.NEXT_PUBLIC_GAS_URL || !process.env.NEXT_PUBLIC_SECRET_TOKEN) {
      showError(
        'Faltan las variables de entorno NEXT_PUBLIC_GAS_URL y/o NEXT_PUBLIC_SECRET_TOKEN. ' +
        'Las fotos no se descargarán. Configúralas en el archivo .env.local y reinicia el servidor.'
      );
    }

    // Recolectar todas las fotos a descargar, guardando referencia al pozo
    const tareasDescarga: { foto: any; pozo: any }[] = [];
    for (const pozo of importedPozos) {
      if (pozo.fotos?.fotos) {
        for (const foto of pozo.fotos.fotos) {
          tareasDescarga.push({ foto, pozo });
        }
      }
    }

    // Index por filename para poder reconstruir FotoInfo después del download
    const porFilename = new Map<string, { foto: any; pozo: any }>();
    tareasDescarga.forEach(t => porFilename.set(t.foto.filename, t));

    // Downloader inline — secuencial, con parámetros completos al GAS (Level 0 = búsqueda exacta rápida)
    const GAS_URL = process.env.NEXT_PUBLIC_GAS_URL!;
    const GAS_TOKEN = process.env.NEXT_PUBLIC_SECRET_TOKEN!;
    console.log('[Import] GAS_URL:', GAS_URL?.substring(0, 60), '... token:', !!GAS_TOKEN);
    console.log('[Import] Total fotos a descargar:', tareasDescarga.length);

    const bajarUna = async (filename: string, municipio: string, pozoId: string, categoria: string, driveId?: string): Promise<string | null> => {
      const payload: any = {
        token: GAS_TOKEN,
        action: 'download',
        filename,
        municipio: (municipio || '').toUpperCase(),
        pozoId: (pozoId || '').toUpperCase(),
        categoria: (categoria || 'CATASTRO').toUpperCase(),
      };
      if (driveId) payload.fileId = driveId;

      try {
        const ctrl = new AbortController();
        const tid = setTimeout(() => ctrl.abort(), 45000);
        const res = await fetch(GAS_URL, { method: 'POST', body: JSON.stringify(payload), signal: ctrl.signal });
        clearTimeout(tid);
        if (!res.ok) { console.warn(`[Import] HTTP ${res.status} en ${filename}`); return null; }
        const data = await res.json();
        if (!data.success || !data.base64) { console.warn(`[Import] GAS falló ${filename}:`, data.error); return null; }
        let b64 = data.base64 as string;
        const idx = b64.indexOf('base64,');
        if (idx !== -1) b64 = b64.substring(idx + 7);
        return `data:${data.mimeType || 'image/jpeg'};base64,${b64}`;
      } catch (e: any) {
        console.warn(`[Import] Excepción en ${filename}:`, e?.message || e);
        return null;
      }
    };

    const extraer = (v: any): string => {
      if (!v) return '';
      if (typeof v === 'string') return v;
      if (typeof v === 'object' && v.value !== undefined) return String(v.value);
      return String(v);
    };

    await photoCache.init();
    const doneTotal = perf.start('cloud_import.total');

    let ok = 0, fallidas = 0, cacheHits = 0, skippedMissing = 0;
    const total = tareasDescarga.length;
    const persistirFoto = async (foto: any, pozo: any, dataUrl: string, resolvedBlobIdOpt?: string) => {
      try {
        let resolvedBlobId = resolvedBlobIdOpt;
        if (!resolvedBlobId) {
          const blob = dataUrlToBlob(dataUrl);
          if (!blob) return;
          resolvedBlobId = await blobStore.store(blob, foto.filename);
          photoCache.recordAvailable(foto.filename, {
            blobId: resolvedBlobId,
            driveId: foto.driveId,
            size: blob.size,
          });
        }

        // Resolver el ID del pozo (idPozo real, ej: PZ02)
        const pId = extraer((pozo as any).identificacion?.idPozo) || 
                    extraer((pozo as any).idPozo) || 
                    extraer(pozo.id);

        importedPhotos.push({
          id: foto.id || generateFileId(),
          idPozo: pId, // Siempre usar el ID real para el match
          tipo: foto.tipo || 'otro',
          categoria: foto.categoria || 'OTRO',
          subcategoria: foto.subcategoria || '',
          descripcion: foto.descripcion || foto.tipo || '',
          blobId: resolvedBlobId,
          filename: foto.filename,
          fechaCaptura: foto.fechaCaptura ?? Date.now(),
          driveId: foto.driveId,
        });
      } catch (err) {
        console.error(`[Import] Error persistiendo ${foto.filename}:`, err);
      }
    };

    // ── PASO 0: Caché local (OPFS persistente) — instantáneo ──────────
    const doneCache = perf.start('cloud_import.cache_lookup');
    const pendientes: typeof tareasDescarga = [];
    const missing: typeof tareasDescarga = [];
    for (const t of tareasDescarga) {
      // Pre-filtro de missing: nunca reintentar
      if (photoCache.isMissing(t.foto.filename) || (t.foto.driveId && photoCache.isMissing(t.foto.driveId))) {
        missing.push(t);
        skippedMissing++;
        continue;
      }
      // Lookup en OPFS (persistente) — asíncrono pero paralelizable
      const cached = await blobStore.getBlobAsync(t.foto.filename);
      if (cached && cached.size > 100) {
        const blobId = await blobStore.store(cached, t.foto.filename);
        await persistirFoto(t.foto, t.pozo, '', blobId);
        cacheHits++;
        ok++;
      } else {
        pendientes.push(t);
      }
    }
    doneCache({ total, hits: cacheHits, missing_skipped: skippedMissing, pendientes: pendientes.length });
    setProcessingMessage(`💾 Caché: ${cacheHits}/${total} • Skipped missing: ${skippedMissing} • Pendientes: ${pendientes.length}`);

    // ── PASO 1: Drive API rápido — fotos con driveId ───────────────────
    const conDriveId = pendientes.filter(t => !!t.foto.driveId);
    const sinDriveId = pendientes.filter(t => !t.foto.driveId);

    if (conDriveId.length > 0) {
      const doneDrive = perf.start('cloud_import.drive_api');
      setProcessingMessage(`⚡ Drive API: 0/${conDriveId.length}...`);
      const ids = conDriveId.map(t => t.foto.driveId as string);
      const driveMap = await fetchPhotosByDriveIds(ids, (p) => {
        setProcessingMessage(`⚡ Drive API: ${p.done}/${conDriveId.length}${p.waitingNetwork ? ' — esperando red...' : ''}`);
      });

      for (const { foto, pozo } of conDriveId) {
        const dataUrl = driveMap[foto.driveId];
        if (dataUrl) {
          ok++;
          await persistirFoto(foto, pozo, dataUrl);
        } else {
          // Drive API falló → degradar a GAS (solo si no se marcó ya como missing dentro de driveFastDownloader)
          if (!photoCache.isMissing(foto.driveId)) {
            sinDriveId.push({ foto, pozo });
          } else {
            fallidas++;
          }
        }
      }
      doneDrive({ n: conDriveId.length, ok });
    }

    // ── PASO 2: GAS con queue dinámica (concurrencia 16) ───────────────
    if (sinDriveId.length > 0) {
      const doneGas = perf.start('cloud_import.gas_queue');
      setProcessingMessage(`🌐 GAS queue: 0/${sinDriveId.length} (concurrencia 16)...`);

      let gasCompletadas = 0;
      const queue = new PhotoQueue({
        concurrency: 16,
        onItem: (key, dur, okTask) => {
          if (!okTask) perf.info('gas_item_fail', { key, took: `${dur}ms` });
        },
      });

      await Promise.all(
        sinDriveId.map(({ foto, pozo }) =>
          queue.enqueue(foto.filename, async () => {
            const tipoReg = String((pozo as any).tipoRegistro || '');
            const categoria = tipoReg.toUpperCase().includes('MARCACION') ? 'MARCACION' : 'CATASTRO';
            const municipio = extraer((pozo as any).municipio) ||
                              extraer((pozo as any).identificacion?.municipio) ||
                              extraer((pozo as any).identificacion?.municipio?.value);
            const pozoId = extraer((pozo as any).identificacion?.idPozo) ||
                           extraer((pozo as any).idPozo) ||
                           extraer(pozo.id);

            // Un solo intento — si GAS dice 404, marcamos missing y terminamos.
            // Los errores de RED transitorios ya se reintentan a nivel fetch.
            const dataUrl = await bajarUna(foto.filename, municipio, pozoId, categoria, foto.driveId);

            gasCompletadas++;
            setProcessingMessage(`🌐 GAS: ${gasCompletadas}/${sinDriveId.length} — OK:${ok} Fail:${fallidas}`);

            if (dataUrl) {
              ok++;
              await persistirFoto(foto, pozo, dataUrl);
              return true;
            } else {
              fallidas++;
              photoCache.markMissing(foto.filename, 'gas_not_found');
              return null;
            }
          })
        )
      );
      doneGas({ n: sinDriveId.length, ok: gasCompletadas - fallidas, failed: fallidas });
    }

    doneTotal({
      total,
      ok,
      fallidas,
      cache_hits: cacheHits,
      skipped_missing: skippedMissing,
    });
    setProcessingMessage(`✅ Fotos: ${ok}/${total} • Caché: ${cacheHits} • Skipped: ${skippedMissing} • Fail: ${fallidas}`);
    console.log(`[Import] FINAL: OK=${ok} Fallidas=${fallidas} Total=${tareasDescarga.length}`);
    } // fin if (includePhotos)

    // 1. Commit INMEDIATAMENTE al store global para que aparezcan en /pozos
    addPozosBulk(importedPozos);

    if (importedPhotos.length > 0) {
      addPhotosBulk(importedPhotos);
    }

    // 2. Actualizar estado local por si el usuario quiere seguir cargando archivos
    setProcessedPozos(prev => [...prev, ...importedPozos]);
    setProcessedPhotos(prev => [...prev, ...importedPhotos]);

    setCanContinue(true);
    setDropZoneStatus('success');
    setIsProcessing(false);

    // 3. ACTUALIZAR REFERENCIA DE ÍNDICE
    // Si importó pozos de la nube, queremos que si luego arrastra ARGIS, ¡los reconozca!
    // Para ello, reconstruimos el expectedIndexRef con los nuevos pozos mezclados.
    const combinedPozosMap = new Map<string, Pozo>();
    if (pozos instanceof Map) {
      pozos.forEach((p, id) => combinedPozosMap.set(id, p));
    } else if (typeof pozos === 'object' && pozos !== null) {
      Object.entries(pozos).forEach(([id, p]) => combinedPozosMap.set(id, p as Pozo));
    }
    importedPozos.forEach(p => combinedPozosMap.set(p.id, p));
    
    expectedIndexRef.current = buildExpectedPhotoIndex(combinedPozosMap);

    showSuccess(
      includePhotos
        ? `Importados ${importedPozos.length} registros y descargadas ${importedPhotos.length} fotos desde la nube. Ya puedes generar las fichas PDF correctamente.`
        : `Importados ${importedPozos.length} registros desde la nube (sin fotos). Adjunta las fotos manualmente.`
    );
  }, [addPozosBulk, addPhotosBulk, showSuccess, pozos]);

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
        {showAuditTool ? (
          <div className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <div className="mb-8 p-6 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                <h1 className="text-3xl font-black flex items-center gap-3">
                   <span className="bg-white/20 p-2 rounded-xl">🔍</span>
                   Auditoría de Archivos
                </h1>
                <p className="mt-2 text-blue-50 font-medium max-w-2xl text-sm leading-relaxed">
                   Verifica la estructura de tus archivos Excel antes de procesarlos. 
                   El sistema te indicará qué columnas se reconocerán automáticamente y cuáles necesitan revisión.
                </p>
             </div>

             <button 
               onClick={() => {
                 setShowAuditTool(false);
                 router.replace('/upload');
               }} 
               className="mb-6 flex items-center gap-2 text-blue-600 hover:text-blue-800 font-extrabold transition-all hover:translate-x-[-4px] group"
             >
               <svg className="w-5 h-5 transition-transform group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
               </svg>
               VOLVER AL CARGADOR PRINCIPAL
             </button>
             
             <ExcelAuditDashboard />
          </div>
        ) : (
          <>
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

                {/* Acción de importación desde la nube */}
                <div className="mb-8 p-6 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl shadow-amber-200 text-white overflow-hidden relative group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-white/20 transition-all"></div>
                  <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-xl font-bold flex items-center justify-center md:justify-start gap-2">
                        <span className="text-2xl">⚡</span>
                        Importación Instantánea
                      </h2>
                      <p className="mt-1 text-amber-50 text-sm">
                        Conéctate directamente a la App de Catastro UT para importar registros y fotos sin usar archivos Excel.
                      </p>

                      {/* Status de datos en memoria */}
                      {(isMounted && pozos.size > 0) && (
                        <div className="mt-3 flex gap-2 justify-center md:justify-start">
                          <span className="bg-amber-400/30 text-white px-2 py-1 rounded-lg text-xs font-bold border border-white/20">
                            📦 {pozos.size} registros listos
                          </span>
                          <span className="bg-amber-400/30 text-white px-2 py-1 rounded-lg text-xs font-bold border border-white/20">
                            📸 {photos.size} fotos asociadas
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => { setCloudImportMode('data'); setIsCloudModalOpen(true); }}
                        className="px-6 py-2.5 bg-white text-amber-600 font-bold rounded-xl shadow-lg hover:bg-amber-50 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                        SOLO DATOS
                      </button>
                      <button
                        onClick={() => { setCloudImportMode('full'); setIsCloudModalOpen(true); }}
                        className="px-6 py-2.5 bg-white text-amber-600 font-bold rounded-xl shadow-lg hover:bg-amber-50 transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap text-sm"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                        </svg>
                        DATOS + FOTOS
                      </button>
                    </div>
                  </div>
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

            {/* Panel de recomendaciones del modo guiado */}
            <RecommendationsPanel className="mb-6" maxItems={2} />

            {/* Indicador del siguiente paso */}
            {canContinue && (
              <NextStepIndicator className="mb-6" variant="banner" />
            )}

            {/* Indicador de modo de procesamiento */}
            <div className={`mb-4 px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${serverAvailable === null
              ? 'bg-gray-50 text-gray-500 border border-gray-200'
              : serverAvailable
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
              }`}>
              {serverAvailable === null && <span>⏳ Verificando modo de procesamiento...</span>}
              {serverAvailable === true && (
                <>
                  <span className="text-lg">⚡</span>
                  <span><strong>Modo servidor activo</strong> — Sharp procesa las fotos 10-20x más rápido en el servidor</span>
                </>
              )}
              {serverAvailable === false && (
                <>
                  <span className="text-lg">🌐</span>
                  <span><strong>Modo browser</strong> — procesamiento en tu equipo (instala Sharp para mayor velocidad)</span>
                </>
              )}
            </div>

            {/* Monitor de rendimiento */}
            {(isProcessing || files.length > 100) && (
              <PerformanceMonitor
                isActive={isProcessing || files.length > 100}
                onRecommendation={setPerformanceRecommendation}
                className="mb-6"
              />
            )}

            {/* Recomendación de rendimiento */}
            {performanceRecommendation && (
              <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-blue-800">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{performanceRecommendation}</span>
                </div>
              </div>
            )}

            {/* Banner de filtro inteligente */}
            {filtradoInfo && (
              <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <span className="text-xl">⚡</span>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800 mb-1">Filtro inteligente activo</p>
                    <pre className="text-xs text-emerald-700 whitespace-pre-wrap font-mono">{filtradoInfo}</pre>
                  </div>
                </div>
              </div>
            )}

            {/* Modo de carga chunked para grandes volúmenes */}
            {showChunkedUploader && (
              <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-blue-900">
                    Modo de Carga Optimizada
                  </h3>
                  <button
                    onClick={() => setShowChunkedUploader(false)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-sm text-blue-700 mb-4">
                  Este modo procesa archivos en lotes pequeños para evitar saturar el navegador.
                  Ideal para cargas de 1000+ archivos.
                </p>

                <ChunkedUploader
                  files={realFilesRef.current} // Archivos reales para procesamiento
                  chunkSize={100}
                  onProgress={(processed, total, currentChunk, totalChunks) => {
                    setProgress((processed / total) * 100);
                    setProcessingMessage(`Chunk ${currentChunk}/${totalChunks}: ${processed}/${total} archivos`);
                  }}
                  onComplete={(results) => {
                    // Aplanar los arrays de FotoInfo[] resultantes
                    const validPhotos = results
                      .filter((r): r is FotoInfo[] => r !== null && Array.isArray(r))
                      .flat();

                    setProcessedPhotos(prev => [...prev, ...validPhotos]);
                    setCanContinue(true);
                    setShowChunkedUploader(false);
                    setIsProcessing(false);
                    showSuccess(`Carga completada: ${validPhotos.length} fotos procesadas exitosamente`);
                  }}
                  processor={async (file, index) => {
                    // Sincronizar con el estado de la lista de archivos (FileItem)
                    const fileId = files[index]?.id;
                    if (fileId) {
                      scheduleFileUpdate(fileId, { status: 'processing', progress: 0 });
                    }

                    const result = await processImageFile(file);

                    if (fileId) {
                      const hasPhotos = result && result.length > 0;
                      const primary = hasPhotos ? result[0] : null;

                      scheduleFileUpdate(fileId, {
                        status: hasPhotos ? 'success' : 'error',
                        message: primary
                          ? (primary.categoria !== 'OTRO'
                            ? `✅ ${result.length > 1 ? 'Múltiple: ' : ''}${primary.descripcion}`
                            : 'Procesada (sin asociar)')
                          : 'Error al procesar'
                      });
                    }

                    return result;
                  }}
                  disabled={isProcessing}
                />
              </div>
            )}

            {/* Advertencia si hay datos existentes */}
            {(isMounted && hasExistingData) && (
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
            <div className="mb-6 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                <svg className="w-16 h-16 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Guía de nomenclatura de fotos
                  </h3>
                  <button 
                    onClick={() => setShowAuditTool(true)}
                    className="text-xs bg-white text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 font-bold shadow-sm hover:bg-blue-600 hover:text-white transition-all active:scale-95"
                  >
                    🔍 AUDITAR EXCEL PRIMERO
                  </button>
                </div>
                
                <p className="text-xs text-blue-700 mb-4 leading-relaxed max-w-2xl">
                  Cada foto debe tener un nombre que comience con el código del pozo (ej: <strong>M680</strong>) seguido de un guión y el tipo de foto. El sistema las asociará automáticamente.
                </p>

                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest mb-2">Fotos principales (una letra):</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-800">
                      <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-lg border border-white/50"><code className="bg-blue-100 text-blue-700 px-1 rounded">-P</code> Panorámica</div>
                      <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-lg border border-white/50"><code className="bg-blue-100 text-blue-700 px-1 rounded">-T</code> Tapa</div>
                      <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-lg border border-white/50"><code className="bg-blue-100 text-blue-700 px-1 rounded">-I</code> Interna</div>
                      <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-lg border border-white/50"><code className="bg-blue-100 text-blue-700 px-1 rounded">-A</code> Acceso</div>
                      <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-lg border border-white/50"><code className="bg-blue-100 text-blue-700 px-1 rounded">-F</code> Fondo</div>
                      <div className="flex items-center gap-2 bg-white/60 p-1.5 rounded-lg border border-white/50"><code className="bg-blue-100 text-blue-700 px-1 rounded">-M</code> Medición</div>
                    </div>
                  </div>

                  <div className="pt-2">
                    <p className="text-[10px] font-extrabold text-blue-400 uppercase tracking-widest mb-2">Entradas / Salidas / Sumideros:</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-blue-800">
                      <div className="bg-white/40 p-2 rounded-lg"><code className="text-blue-700 font-bold">-E1-T</code> Ent. 1 Tubo</div>
                      <div className="bg-white/40 p-2 rounded-lg"><code className="text-blue-700 font-bold">-E1-Z</code> Ent. 1 Zona</div>
                      <div className="bg-white/40 p-2 rounded-lg"><code className="text-blue-700 font-bold">-S-T</code> Salida Tubo</div>
                      <div className="bg-white/40 p-2 rounded-lg"><code className="text-blue-700 font-bold">-S-Z</code> Salida Zona</div>
                      <div className="bg-white/40 p-2 rounded-lg"><code className="text-blue-700 font-bold">-SUM1</code> Sumidero 1</div>
                    </div>
                  </div>

                  <div className="mt-3 p-3 bg-white/80 rounded-xl border border-blue-200">
                    <p className="text-[11px] text-blue-800 leading-tight">
                      <strong>💡 Tip Pro:</strong> No combines tipos en un nombre (ej: No usar <code>-AT</code>). Usa archivos separados para Acceso y Tapa para generar fichas más profesionales.
                    </p>
                  </div>
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
          </>
        )}

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
            {(isMounted && hasExistingData) && (
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

      {/* Modal de Importación Cloud */}
      <CloudImportModal
        isOpen={isCloudModalOpen}
        onClose={() => setIsCloudModalOpen(false)}
        onImport={(pozos) => handleCloudImport(pozos, cloudImportMode === 'full')}
      />
    </AppShell>
  );
}

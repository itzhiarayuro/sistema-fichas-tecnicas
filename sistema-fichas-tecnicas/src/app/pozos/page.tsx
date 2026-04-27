/**
 * Página de Pozos - Lista interactiva con selección y preview
 * Requirements: 2.1-2.6, 14.1-14.4, 18.4, 18.5
 * 
 * Muestra todos los pozos cargados con:
 * - Tabla interactiva con ordenamiento y filtrado
 * - Panel de vista previa del pozo seleccionado
 * - Indicadores de estado de completitud
 * - Navegación al editor
 * - Recomendaciones contextuales del modo guiado
 * - Indicadores de flujo del workflow
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { fetchPhotosByDriveIds } from '@/lib/services/driveFastDownloader';
import { PhotoQueue } from '@/lib/services/photoQueue';
import { photoCache } from '@/lib/services/photoCache';
import { perf } from '@/lib/utils/perfLogger';
import { useGlobalStore, useUIStore } from '@/stores';
import { logger } from '@/lib/logger';
import { PozosTable, PozoStatusDetail } from '@/components/pozos';
import { RecommendationsPanel } from '@/components/guided';
import { AppShell, NextStepIndicator, ProgressBar } from '@/components/layout';
import { FirebaseSetupBanner } from '@/components/layout/FirebaseSetupBanner';
import { Pozo } from '@/types';
import { useDesignStore } from '@/stores/designStore';
import { useFieldsStore } from '@/stores/fieldsStore';
import { useMounted } from '@/hooks/useMounted';
import { blobStore } from '@/lib/storage/blobStore';
import proj4 from 'proj4';

const EPSG9377 = "+proj=tmerc +lat_0=4 +lon_0=-73 +k=0.9992 +x_0=5000000 +y_0=2000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs";
proj4.defs('EPSG:9377', EPSG9377);

function calcularCoordenadas(lat: number, lng: number): { x: string; y: string } | null {
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
    try {
        const [x, y] = proj4('EPSG:4326', 'EPSG:9377', [lng, lat]);
        return { x: (Math.round(x * 1000) / 1000).toFixed(3), y: (Math.round(y * 1000) / 1000).toFixed(3) };
    } catch { return null; }
}

function enriquecerCoordenadas(pozo: any): any {
    const lat = parseFloat(pozo.identificacion?.latitud?.value || pozo.latitud?.value || '0');
    const lng = parseFloat(pozo.identificacion?.longitud?.value || pozo.longitud?.value || '0');
    if (!lat || !lng) return pozo;

    const fv = (v: string) => ({ value: v, source: 'manual' as const });

    const xVal = pozo.coordenadaX?.value || pozo.identificacion?.coordenadaX?.value;
    const yVal = pozo.coordenadaY?.value || pozo.identificacion?.coordenadaY?.value;
    const enlaceVal = pozo.enlace?.value || pozo.identificacion?.enlace?.value;
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;

    const needsCoords = !xVal || xVal === 'DESCONOCIDO' || !yVal || yVal === 'DESCONOCIDO';
    const needsEnlace = !enlaceVal || enlaceVal === 'DESCONOCIDO' || enlaceVal === '';

    if (!needsCoords && !needsEnlace) return pozo;

    const coords = needsCoords ? calcularCoordenadas(lat, lng) : null;

    return {
        ...pozo,
        ...(coords ? { coordenadaX: fv(coords.x), coordenadaY: fv(coords.y) } : {}),
        ...(needsEnlace ? { enlace: fv(mapsUrl) } : {}),
        identificacion: {
            ...pozo.identificacion,
            ...(coords ? { coordenadaX: fv(coords.x), coordenadaY: fv(coords.y) } : {}),
            ...(needsEnlace ? { enlace: fv(mapsUrl) } : {}),
        }
    };
}

export default function PozosPage() {
  const router = useRouter();
  const isMounted = useMounted();

  // Global store
  const pozos = useGlobalStore((state) => state.pozos);
  const setCurrentStep = useGlobalStore((state) => state.setCurrentStep);
  const setLoading = useGlobalStore((state) => state.setLoading);

  // UI store
  const selectedPozoId = useUIStore((state) => state.selectedPozoId);
  const setSelectedPozoId = useUIStore((state) => state.setSelectedPozoId);
  const addToast = useUIStore((state) => state.addToast);

  // Set current workflow step
  useEffect(() => {
    setCurrentStep('review');
  }, [setCurrentStep]);

  // Convert Map to array for table
  const pozosArray = useMemo(() => {
    return Array.from(pozos.values());
  }, [pozos]);

  // Get selected pozo
  const selectedPozo = useMemo(() => {
    if (!selectedPozoId) return null;
    return pozos.get(selectedPozoId) || null;
  }, [pozos, selectedPozoId]);

  // Handle pozo selection
  const handleSelectPozo = (pozoId: string) => {
    setSelectedPozoId(pozoId);
  };

  // Handle double click to open editor
  const handleDoubleClickPozo = (pozoId: string) => {
    router.push(`/editor/${pozoId}`);
  };

  // Handle edit button click
  const handleEditPozo = () => {
    if (selectedPozoId) {
      router.push(`/editor/${selectedPozoId}`);
    }
  };

  // Handle navigation to upload
  const handleGoToUpload = () => {
    router.push('/upload');
  };

  // Handle delete pozo
  const handleDeletePozo = (pozoId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este pozo?')) {
      useGlobalStore.setState((state) => {
        const newPozos = new Map(state.pozos);
        newPozos.delete(pozoId);
        return { pozos: newPozos };
      });
      if (selectedPozoId === pozoId) {
        setSelectedPozoId(null);
      }
    }
  };

  // State for batch selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { versions: customTemplates } = useDesignStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('standard');

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (ids: string[]) => {
    if (ids.length > 0) {
      setSelectedIds(new Set(ids));
    } else {
      setSelectedIds(new Set());
    }
  };

  // Handle delete selected pozos
  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;

    if (confirm(`¿Estás seguro de que deseas eliminar los ${selectedIds.size} pozos seleccionados?`)) {
      const count = selectedIds.size;
      useGlobalStore.setState((state) => {
        const newPozos = new Map(state.pozos);
        selectedIds.forEach(id => newPozos.delete(id));
        return { pozos: newPozos };
      });

      if (selectedPozoId && selectedIds.has(selectedPozoId)) {
        setSelectedPozoId(null);
      }

      setSelectedIds(new Set());
      addToast({
        type: 'success',
        message: `${count} pozos eliminados correctamente`
      });
    }
  };

  // Handle generate PDF for selected pozo(s)
  // photoMode:
  //   'local' → solo usa fotos del dispositivo (drag&drop / cache OPFS). Nada de Drive ni GAS.
  //   'cloud' → si falta una foto local, la baja desde Drive/GAS.
  //   'auto'  → respeta el flag lastImportWithPhotos (compatibilidad).
  const handleGeneratePDF = async (
    batchIds?: string[],
    isFlexible: boolean = false,
    photoMode: 'local' | 'cloud' | 'auto' = 'auto'
  ) => {
    // PRIORIDAD:
    // 1. IDs pasados explícitamente (batchIds)
    // 2. IDs seleccionados mediante checkboxes (selectedIds)
    // 3. ID seleccionado para vista previa (selectedPozoId)
    const idsToProcess = batchIds || (selectedIds.size > 0 ? Array.from(selectedIds) : (selectedPozoId ? [selectedPozoId] : []));

    if (idsToProcess.length === 0) {
      addToast({ type: 'warning', message: 'Selecciona al menos un pozo para generar el PDF' });
      return;
    }

    logger.info('Solicitud de generación de PDF', { count: idsToProcess.length, flexible: isFlexible, photoMode }, 'PozosPage');
    setLoading(true);

    try {
      // 1. Obtener el diseño seleccionado
      const customDesign = customTemplates.find(v => v.id === selectedTemplateId);
      const isCustom = !!customDesign && selectedTemplateId !== 'standard';

      // Obtener campos dinámicos del store para pasarlos al generador
      const allFields = useFieldsStore.getState().getAllFields();

      // Asegurar que todas las fotos arrastradas localmente estén en disco
      // antes de que el motor PDF las busque. Evita la condición de carrera
      // donde pendingSaves aún no se ha flusheado al iniciar la generación.
      console.log('⏳ Asegurando persistencia de fotos locales...');
      await blobStore.flushPending();
      console.log('✅ Fotos locales persistidas en disco.');

      // Generar todos los PDFs
      const pdfBlobs: Array<{ name: string; blob: Blob }> = [];

      for (const pozoId of idsToProcess) {
        const pozo = pozos.get(pozoId);
        if (!pozo) continue;

        // CRÍTICO: Obtener fotos globales asociadas por nomenclatura
        const getPhotosByPozoId = useGlobalStore.getState().getPhotosByPozoId;
        const fotosGlobales = getPhotosByPozoId(pozoId);
        const fotosIncrustadas = pozo.fotos?.fotos || [];

        // Unificar fotos
        const fotosIds = new Set(fotosIncrustadas.map(f => f.id));
        const todasLasFotos = [...fotosIncrustadas];
        fotosGlobales.forEach(f => {
          if (!fotosIds.has(f.id)) {
            todasLasFotos.push(f);
          }
        });

        // Saneamiento de fotos: Asegurar que TODAS las fotos remotas tengan una URL de proxy válida
        const saneFotos = todasLasFotos.map(f => {
          const currentUrl = f.blobId || '';
          const driveId = (f as any).driveId || (f.id.includes('PHOTO-') ? f.id.replace('PHOTO-', '') : null);
          const filename = f.filename || 'foto.jpg';

          // Si es un blob muerto o una URL incompleta, reconstruir a partir de la mejor información disponible
          if (currentUrl.startsWith('blob:') || (currentUrl.includes('proxy-image') && !currentUrl.includes('driveId'))) {
              
              // Intentar extraer driveId de la URL actual si existe pero está mal formateada
              let finalDriveId = driveId;
              if (!finalDriveId && currentUrl.includes('driveId=')) {
                  const match = currentUrl.match(/driveId=([^&]+)/);
                  if (match) finalDriveId = match[1];
              }

              const commonQuery = `filename=${encodeURIComponent(filename)}&pozoId=${pozo.id}`;

              if (finalDriveId) {
                  return { ...f, blobId: `/api/catastro/proxy-image?driveId=${finalDriveId}&${commonQuery}` };
              } else if (filename && filename !== 'foto.jpg') {
                  // Fallback al nombre de archivo si no hay driveId
                  return { ...f, blobId: `/api/catastro/proxy-image?${commonQuery}` };
              }
          }
          return f;
        });

        let enrichedPozo = enriquecerCoordenadas({
          ...pozo,
          fotos: { ...pozo.fotos, fotos: saneFotos }
        });

        // Debug de URLs de fotos (solo nombres para no saturar)
        console.log(`📸 Preparando PDF (${pozoId}):`, saneFotos.map(sf => sf.filename));

        // ⚡ PRE-CARGA PARALELA: Cargar todas las fotos remotas en el caché del navegador
        // antes de que el generador de PDF las necesite. Esto evita timeouts
        // porque el GAS proxy tarda ~3-5s por foto.
        const proxyPhotos = saneFotos.filter(f => f.blobId?.startsWith('/api/'));
        if (proxyPhotos.length > 0) {
          console.log(`⏳ Pre-cargando ${proxyPhotos.length} fotos en paralelo...`);
          const preloadStart = Date.now();

          // Función para llamar GAS directamente desde el cliente (fallback si proxy-image falla)
          // Replica EXACTAMENTE el patrón de catastro-ut-star-app/src/utils/driveSync.ts → fetchPhotoFromDrive
          // Extraer municipio/pozoId del objeto pozo para pasarlos al GAS (Level 0 = búsqueda rápida)
          const extraerStr = (v: any): string => {
            if (!v) return '';
            if (typeof v === 'string') return v;
            if (typeof v === 'object' && v.value !== undefined) return String(v.value);
            return String(v);
          };
          const gasMunicipio = (extraerStr((pozo as any).municipio) || extraerStr((pozo as any).identificacion?.municipio)).toUpperCase();
          const gasPozoId = (extraerStr((pozo as any).identificacion?.idPozo) || extraerStr((pozo as any).idPozo) || String(pozo.id || '')).toUpperCase();
          const tipoReg = String((pozo as any).tipoRegistro || '').toUpperCase();
          const gasCategoria = tipoReg.includes('MARCACION') ? 'MARCACION' : 'CATASTRO';

          const fetchPhotoFromGasDirect = async (filename: string): Promise<string | null> => {
            const gasUrl = process.env.NEXT_PUBLIC_GAS_URL;
            const token = process.env.NEXT_PUBLIC_SECRET_TOKEN;
            if (!gasUrl || !filename) {
              console.warn(`❌ GAS directo: gasUrl=${!!gasUrl}, filename=${filename}`);
              return null;
            }
            try {
              console.log(`🔄 GAS directo: ${filename} (${gasMunicipio}/${gasCategoria}/${gasPozoId})`);
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 45000);

              const response = await fetch(gasUrl, {
                method: 'POST',
                mode: 'cors',
                body: JSON.stringify({
                  token,
                  action: 'download',
                  filename,
                  municipio: gasMunicipio,
                  pozoId: gasPozoId,
                  categoria: gasCategoria,
                }),
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              
              if (!response.ok) {
                console.warn(`❌ GAS directo HTTP error: ${response.status} ${response.statusText}`);
                return null;
              }
              const result = await response.json();
              if (result.success && result.base64) {
                // Asegurar formato data URL
                let b64 = result.base64;
                // Limpiar prefijo data URI si viene incluido
                const base64Marker = 'base64,';
                const markerIdx = b64.indexOf(base64Marker);
                if (markerIdx !== -1 && markerIdx < 100) {
                  b64 = b64.substring(markerIdx + base64Marker.length);
                }
                const mime = result.mimeType || 'image/jpeg';
                return `data:${mime};base64,${b64}`;
              }
              console.warn(`❌ GAS directo: success=${result.success}, error=${result.error || 'none'}`);
              return null;
            } catch (err: any) {
              console.error(`❌ GAS directo excepción para ${filename}:`, err.message || err);
              return null;
            }
          };
          
          // Helper: leer Blob del blobStore local y convertir a dataUrl
          const blobToDataUrl = (blob: Blob): Promise<string> => new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

          // ═══════════════════════════════════════════════════════════
          // v2: caché OPFS persistente + photoCache (not-found) + PhotoQueue
          // ═══════════════════════════════════════════════════════════
          await photoCache.init();
          const donePreload = perf.start('pdf_preload.total');

          const desdeCache: { id: string; dataUrl: string }[] = [];
          const pendientes: typeof proxyPhotos = [];
          let missingSkipped = 0;

          for (const foto of proxyPhotos) {
            const fname = foto.filename || '';
            const did = (foto as any).driveId as string | undefined;

            // Pre-filtro: saltar fotos ya marcadas como no existentes
            if (photoCache.isMissing(fname) || (did && photoCache.isMissing(did))) {
              missingSkipped++;
              continue;
            }

            // Caché OPFS persistente (sobrevive reload)
            try {
              const cached = await blobStore.getBlobAsync(fname);
              if (cached && cached.size > 100) {
                const du = await blobToDataUrl(cached);
                desdeCache.push({ id: foto.id, dataUrl: du });
                continue;
              }
            } catch {}
            pendientes.push(foto);
          }
          perf.info('preload.cache_phase', {
            total: proxyPhotos.length,
            cache_hits: desdeCache.length,
            missing_skipped: missingSkipped,
            pending: pendientes.length,
          });

          const preloadResults: PromiseSettledResult<{ id: string; dataUrl: string } | null>[] = [];
          desdeCache.forEach(r => preloadResults.push({ status: 'fulfilled', value: r }));

          // Decidir si bajar fotos faltantes desde la nube (Drive/GAS).
          // - 'local' → NUNCA va a la nube (solo fotos arrastradas / cache OPFS)
          // - 'cloud' → SIEMPRE intenta bajar lo faltante
          // - 'auto'  → usa el flag de la última importación (compat retro)
          const wantsCloudFetch = photoMode === 'cloud'
            || (photoMode === 'auto' && useGlobalStore.getState().lastImportWithPhotos);

          if (!wantsCloudFetch && pendientes.length > 0) {
            console.log(`⏭️ Modo "solo local" (${photoMode}): omitiendo ${pendientes.length} fotos no presentes localmente (no se irá a la nube)`);
          }

          if (pendientes.length > 0 && wantsCloudFetch) {
            // PASO 2A: Drive API — lotes 20 × 4 paralelos
            const conDriveId = pendientes.filter(f => !!(f as any).driveId);
            const sinDriveId = pendientes.filter(f => !(f as any).driveId);

            if (conDriveId.length > 0) {
              const doneDrive = perf.start('pdf_preload.drive_api');
              const ids = conDriveId.map(f => (f as any).driveId as string);
              const driveMap = await fetchPhotosByDriveIds(ids, (p) => {
                if (p.waitingNetwork) perf.net.wait();
              });
              let driveOk = 0, driveMiss = 0;
              for (const foto of conDriveId) {
                const dataUrl = driveMap[(foto as any).driveId];
                if (dataUrl) {
                  try {
                    const b = await (await fetch(dataUrl)).blob();
                    await blobStore.store(b, foto.filename || '');
                    photoCache.recordAvailable(foto.filename || '', {
                      driveId: (foto as any).driveId,
                      size: b.size,
                    });
                  } catch {}
                  preloadResults.push({ status: 'fulfilled', value: { id: foto.id, dataUrl } });
                  driveOk++;
                } else {
                  sinDriveId.push(foto);
                  driveMiss++;
                }
              }
              doneDrive({ n: conDriveId.length, ok: driveOk, missed: driveMiss });
            }

            // PASO 2B: GAS con queue dinámica (concurrencia 16, SIN retry en 404)
            if (sinDriveId.length > 0) {
              const doneGas = perf.start('pdf_preload.gas_queue');
              const queue = new PhotoQueue({ concurrency: 16 });
              let gasDone = 0, gasOk = 0, gasFail = 0;

              await Promise.all(
                sinDriveId.map(foto =>
                  queue.enqueue(foto.filename || '', async () => {
                    const dataUrl = await fetchPhotoFromGasDirect(foto.filename || '');
                    gasDone++;
                    if (dataUrl) {
                      try {
                        const b = await (await fetch(dataUrl)).blob();
                        await blobStore.store(b, foto.filename || '');
                        photoCache.recordAvailable(foto.filename || '', { size: b.size });
                      } catch {}
                      preloadResults.push({ status: 'fulfilled', value: { id: foto.id, dataUrl } });
                      gasOk++;
                      return { id: foto.id, dataUrl };
                    }
                    // 404 de GAS → marcar missing, nunca reintentar en este u otros PDFs
                    photoCache.markMissing(foto.filename || '', 'gas_404');
                    preloadResults.push({ status: 'fulfilled', value: null });
                    gasFail++;
                    return null;
                  })
                )
              );
              doneGas({ n: sinDriveId.length, ok: gasOk, fail: gasFail });
            }
          }

          donePreload({
            n: proxyPhotos.length,
            cache_hits: desdeCache.length,
            missing_skipped: missingSkipped,
            fetched: pendientes.length,
          });

          // Reemplazar blobIds de proxy con data URLs pre-cargadas
          const dataUrlMap = new Map<string, string>();
          preloadResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              dataUrlMap.set(result.value.id, result.value.dataUrl);
            }
          });

          // Actualizar las fotos con data URLs pre-cargadas
          let omittedRemote = 0;
          const finalFotos = saneFotos.map(f => {
            const preloaded = dataUrlMap.get(f.id);
            if (preloaded) {
              return { ...f, blobId: preloaded };
            }
            // Modo "solo local": si la foto no está en cache local y su blobId
            // es un URL remoto, vaciarlo para que BlobStore NO caiga a GAS/Drive
            // como fallback. El PDF se genera sin esa foto.
            if (!wantsCloudFetch && typeof f.blobId === 'string' && (f.blobId.startsWith('/api/') || f.blobId.startsWith('http'))) {
              omittedRemote++;
              return { ...f, blobId: '' };
            }
            return f;
          });
          if (omittedRemote > 0) {
            console.log(`🚫 Modo solo local: ${omittedRemote} foto(s) remotas omitidas (no se va a Drive/GAS)`);
          }

          // Reemplazar el enrichedPozo con fotos pre-cargadas
          enrichedPozo.fotos = { ...enrichedPozo.fotos, fotos: finalFotos };

          const preloadDuration = Date.now() - preloadStart;
          const successCount = dataUrlMap.size;
          console.log(`✅ Pre-carga completada en ${preloadDuration}ms: ${successCount}/${proxyPhotos.length} fotos listas`);
        }

        const pozoName = String(enrichedPozo.idPozo?.value || pozo.identificacion.idPozo.value);

        if (isCustom && customDesign) {
          // GENERACIÓN CON DISEÑO PERSONALIZADO

          let result;
          if (isFlexible) {
            // Modo Flexible: Usa layoutEngine para reorganizar elementos dinámicamente
            const { generateFlexiblePdf } = await import('@/lib/pdf/flexiblePdfGenerator');
            result = await generateFlexiblePdf(customDesign, enrichedPozo, allFields);
          } else {
            // Modo Normal: Usa generador estándar con posiciones fijas
            const { generatePdfFromDesign } = await import('@/lib/pdf/designBasedPdfGenerator');
            result = await generatePdfFromDesign(customDesign, enrichedPozo, allFields);
          }

          if (result.success && result.blob) {
            pdfBlobs.push({ name: pozoName, blob: result.blob });
          } else {
            console.warn('⚠️ Generador de PDF falló');
          }
        } else {
          // GENERACIÓN CON DISEÑO ESTÁNDAR
          let ficha: any;
          
          if (isFlexible) {
            // En modo flexible estándar no necesitamos recuperar estado previo, 
            // generamos una ficha virtual al vuelo.
            ficha = {
              id: `ficha-${pozoId}`,
              pozoId: pozoId,
              status: 'complete' as const,
              sections: [
                { id: 'identificacion', type: 'identificacion', order: 1, visible: true, locked: false, content: {} },
                { id: 'estructura', type: 'estructura', order: 2, visible: true, locked: false, content: {} },
                { id: 'fotos', type: 'fotos', order: 3, visible: true, locked: false, content: {} },
              ],
              customizations: {
                colors: { headerBg: '#1F4E79', headerText: '#FFFFFF', sectionBg: '#F5F5F5' },
                fonts: { titleSize: 14, labelSize: 9, valueSize: 10, fontFamily: 'Roboto' },
                spacing: { sectionGap: 8, padding: 5, margin: 15 },
                template: 'default'
              },
              version: 1,
            };
          } else {
            // Intentar recuperar el estado guardado de la ficha de forma silenciosa
            let savedFicha = null;
            try {
              const { recoverState } = await import('@/lib/state/integrity');
              savedFicha = recoverState(`ficha-${pozoId}`, pozoId);
            } catch (err) { /* ignore */ }

            if (savedFicha && (savedFicha as any).stateStatus !== 'reset') {
              ficha = savedFicha;
            } else {
              ficha = {
                id: `ficha-${pozoId}`,
                pozoId: pozoId,
                status: 'complete' as const,
                sections: [
                  { id: 'identificacion', type: 'identificacion', order: 1, visible: true, locked: false, content: {} },
                  { id: 'estructura', type: 'estructura', order: 2, visible: true, locked: false, content: {} },
                  { id: 'fotos', type: 'fotos', order: 3, visible: true, locked: false, content: {} },
                ],
                customizations: {
                  colors: { headerBg: '#1F4E79', headerText: '#FFFFFF', sectionBg: '#F5F5F5' },
                  fonts: { titleSize: 14, labelSize: 9, valueSize: 10, fontFamily: 'Roboto' },
                  spacing: { sectionGap: 8, padding: 5, margin: 15 },
                  template: 'default'
                },
                version: 1,
              };
            }
          }

          const { pdfMakeGenerator } = await import('@/lib/pdf/pdfMakeGenerator');
          const result = await pdfMakeGenerator.generatePDF(ficha, enrichedPozo, {
            includePhotos: true,
            pageNumbers: true,
            includeDate: true,
            isFlexible,
            availableFields: allFields
          } as any);
          if (result.success && result.blob) {
            pdfBlobs.push({ name: pozoName, blob: result.blob });
          }
        }
      }

      // Si hay múltiples PDFs, generar ZIP; si hay uno solo, descargar directamente
      if (pdfBlobs.length > 1) {
        const { generateBatchPdfZip, downloadZip } = await import('@/lib/pdf/batchPdfGenerator');
        const zipResult = await generateBatchPdfZip(pdfBlobs, 'fichas_tecnicas.zip');

        if (zipResult.success && zipResult.blob) {
          downloadZip(zipResult.blob, 'fichas_tecnicas.zip');
          addToast({
            type: 'success',
            message: `${pdfBlobs.length} fichas comprimidas en ZIP`
          });
        } else {
          addToast({
            type: 'error',
            message: zipResult.message
          });
        }
      } else if (pdfBlobs.length === 1) {
        // Descargar PDF único directamente
        const url = window.URL.createObjectURL(pdfBlobs[0].blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${pdfBlobs[0].name}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        addToast({
          type: 'success',
          message: isFlexible ? 'PDF Flexible generado correctamente' : 'PDF generado correctamente'
        });
      } else {
        addToast({
          type: 'error',
          message: 'No se pudieron generar los PDFs'
        });
      }
    } catch (error) {
      logger.error('Error en generación masiva', error, 'PozosPage');
      addToast({
        type: 'error',
        message: 'Error al generar los PDFs'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4 -mx-6 -mt-6 mb-6">
          <FirebaseSetupBanner />
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Lista de Pozos</h1>
              <p className="text-gray-600 mt-1">
                {isMounted && pozosArray.length > 0
                  ? `${pozosArray.length} pozos cargados. Selecciona uno para ver detalles.`
                  : 'No hay pozos cargados. Carga un archivo Excel para comenzar.'
                }
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Template Selector for Batch */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Diseño:</span>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="bg-transparent border-none text-sm font-bold text-primary focus:ring-0 cursor-pointer"
                >
                  <option value="standard">Ficha Estándar</option>
                  {customTemplates.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => router.push('/upload?tab=audit')}
                className="px-4 py-2 text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Auditar Excel
              </button>

              <button
                onClick={handleGoToUpload}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Subir Fotos/Excel
              </button>

              {isMounted && selectedIds.size > 0 && (
                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                  <button
                    onClick={() => handleGeneratePDF(undefined, false)}
                    className="px-4 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-md transition-all active:scale-95 flex items-center gap-2"
                    title={selectedIds.size > 1 ? 'Descargar como ZIP comprimido' : 'Descargar PDF'}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {selectedIds.size > 1 ? `ZIP (${selectedIds.size})` : `PDF (${selectedIds.size})`}
                  </button>

                  <button
                    onClick={() => handleGeneratePDF(undefined, true, 'local')}
                    className="px-4 py-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700 shadow-md transition-all active:scale-95 flex items-center gap-2"
                    title="FLEXIBLE LOCAL: usa solo fotos del dispositivo (drag & drop). No descarga de Drive."
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    FLEXIBLE LOCAL ({selectedIds.size})
                  </button>

                  <button
                    onClick={() => handleGeneratePDF(undefined, true, 'cloud')}
                    className="px-4 py-2 text-white bg-sky-600 rounded-lg hover:bg-sky-700 shadow-md transition-all active:scale-95 flex items-center gap-2"
                    title="FLEXIBLE NUBE: si una foto no está local, la baja desde Drive."
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    FLEXIBLE NUBE ({selectedIds.size})
                  </button>

                  <button
                    onClick={handleDeleteSelected}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 shadow-md transition-all active:scale-95 flex items-center gap-2"
                    title="Eliminar seleccionados"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar ({selectedIds.size})
                  </button>
                </div>
              )}

              {isMounted && selectedPozoId && selectedIds.size === 0 && (
                <>
                  <button
                    onClick={() => handleGeneratePDF([selectedPozoId], false)}
                    className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2m0 0v-8m0 8H3m6-8h6m0 0V5m0 6h6" />
                    </svg>
                    PDF
                  </button>

                  <button
                    onClick={() => handleGeneratePDF([selectedPozoId], true, 'local')}
                    className="px-4 py-2 text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
                    title="FLEXIBLE LOCAL: usa solo fotos del dispositivo. No descarga de Drive."
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    PDF Flexible Local
                  </button>

                  <button
                    onClick={() => handleGeneratePDF([selectedPozoId], true, 'cloud')}
                    className="px-4 py-2 text-white bg-sky-600 rounded-lg hover:bg-sky-700 transition-colors flex items-center gap-2"
                    title="FLEXIBLE NUBE: si falta una foto local, la baja desde Drive."
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                    </svg>
                    PDF Flexible Nube
                  </button>

                  <button
                    onClick={() => handleDeletePozo(selectedPozoId)}
                    className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar
                  </button>

                  <button
                    onClick={handleEditPozo}
                    className="px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar ficha
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Panel de recomendaciones del modo guiado - Requirements 14.1-14.4 */}
          <RecommendationsPanel className="mt-4" maxItems={2} />

          {/* Indicador del siguiente paso y progreso - Requirements 18.4, 18.5 */}
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex-1">
              <ProgressBar showPercentage showStepCount />
            </div>
            {selectedPozoId && (
              <NextStepIndicator variant="inline" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col tablet:flex-row overflow-hidden -mx-6">
          {/* Table panel */}
          <div className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ${isMounted && selectedPozo ? 'tablet:w-1/2 desktop:w-2/3' : 'w-full'}`}>
            {isMounted && pozosArray.length > 0 ? (
              <PozosTable
                pozos={pozosArray}
                selectedPozoId={selectedPozoId}
                onSelectPozo={handleSelectPozo}
                onDoubleClickPozo={handleDoubleClickPozo}
                selectedIds={selectedIds}
                onToggleSelect={handleToggleSelect}
                onSelectAll={handleSelectAll}
              />
            ) : (
              <EmptyState onUpload={handleGoToUpload} />
            )}
          </div>

          {/* Preview panel */}
          {isMounted && selectedPozo && (
            <div className="tablet:w-1/2 desktop:w-1/3 border-t tablet:border-t-0 tablet:border-l border-gray-200 bg-white overflow-auto">
              <div id="preview-container-wrapper">
                <PozoPreviewPanel
                  pozo={selectedPozo}
                  onEdit={handleEditPozo}
                  onClose={() => setSelectedPozoId(null)}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}

/**
 * Empty state when no pozos are loaded
 */
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
          <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          No hay pozos cargados
        </h2>
        <p className="text-gray-600 mb-6">
          Carga un archivo Excel con los datos de los pozos para comenzar a generar fichas técnicas.
        </p>
        <button
          onClick={onUpload}
          className="px-6 py-3 text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Cargar archivos
        </button>
      </div>
    </div>
  );
}

/**
 * Preview panel for selected pozo
 */
function PozoPreviewPanel({
  pozo,
  onEdit,
  onClose
}: {
  pozo: Pozo;
  onEdit: () => void;
  onClose: () => void;
}) {
  const getPhotosByPozoId = useGlobalStore((state) => state.getPhotosByPozoId);

  // Conteo consolidado
  const fotosIncrustadasCount = pozo.fotos?.fotos?.length || 0;
  const fotosGlobales = getPhotosByPozoId(pozo.id);
  const fotosIncrustadasIds = new Set(pozo.fotos?.fotos?.map(f => f.id) || []);
  const fotosGlobalesNuevasCount = fotosGlobales.filter(f => !fotosIncrustadasIds.has(f.id)).length;
  const totalFotosCount = fotosIncrustadasCount + fotosGlobalesNuevasCount;

  const fotosCount = totalFotosCount;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          Vista previa
        </h2>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600 rounded transition-colors"
          aria-label="Cerrar vista previa"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Código y estado */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-2xl font-bold text-primary">{pozo.idPozo?.value || pozo.identificacion.idPozo?.value || 'Sin ID'}</h3>
            <p className="text-gray-600">{pozo.direccion?.value || pozo.ubicacion.direccion?.value || 'Sin dirección'}</p>
          </div>
        </div>

        {/* Status */}
        <PozoStatusDetail pozo={pozo} />

        {/* Información general */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Información General</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Barrio:</dt>
              <dd className="text-gray-900 font-medium">{pozo.barrio?.value || pozo.ubicacion.barrio?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Sistema:</dt>
              <dd className="text-gray-900 font-medium">{pozo.sistema?.value || pozo.componentes.sistema?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Estado:</dt>
              <dd className="text-gray-900 font-medium">{pozo.estado?.value || pozo.identificacion.estado?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Fecha:</dt>
              <dd className="text-gray-900 font-medium">{pozo.fecha?.value || pozo.identificacion.fecha?.value || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Estructura */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Estructura</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Altura total:</dt>
              <dd className="text-gray-900 font-medium">{pozo.profundidad?.value || pozo.ubicacion.profundidad?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Rasante (Elevación):</dt>
              <dd className="text-gray-900 font-medium">{pozo.elevacion?.value || pozo.ubicacion.elevacion?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tapa (material):</dt>
              <dd className="text-gray-900 font-medium">{pozo.materialTapa?.value || pozo.componentes.materialTapa?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Tapa (estado):</dt>
              <dd className="text-gray-900 font-medium">{pozo.estadoTapa?.value || pozo.componentes.estadoTapa?.value || '-'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Diámetro cuerpo:</dt>
              <dd className="text-gray-900 font-medium">{pozo.diametroCilindro?.value || pozo.componentes.diametroCilindro?.value || '-'}</dd>
            </div>
          </dl>
        </div>

        {/* Fotos */}
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3">Fotografías</h4>
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-gray-700">
              {fotosCount > 0
                ? `${fotosCount} foto${fotosCount !== 1 ? 's' : ''} asociada${fotosCount !== 1 ? 's' : ''}`
                : 'Sin fotos asociadas'
              }
            </span>
          </div>

          {fotosCount > 0 && (
            <div className="mt-3 text-sm text-gray-600">
              <div className="mb-2 grid grid-cols-2 gap-2 text-xs">
                <div>Nube: {fotosIncrustadasCount}</div>
                <div>ArcGIS/Local: {fotosGlobalesNuevasCount}</div>
              </div>
              
              <details className="cursor-pointer group">
                <summary className="font-medium text-primary hover:text-primary-dark transition-colors list-none flex items-center gap-1">
                  <svg className="w-4 h-4 transform group-open:rotate-90 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  Ver detalle de fotos
                </summary>
                <div className="mt-2 pl-5 space-y-2 border-l-2 border-gray-200">
                  {pozo.fotos?.fotos?.map((f: any) => (
                    <div key={`nube-${f.id}`} className="text-xs flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded mr-1">☁️ Nube</span>
                      <span className="font-medium">[{f.categoria || 'N/A'}]</span>
                      <span className="truncate" title={f.filename}>{f.filename || 'Foto'}</span>
                    </div>
                  ))}
                  {fotosGlobales.filter(f => !fotosIncrustadasIds.has(f.id)).map(f => (
                    <div key={`local-${f.id}`} className="text-xs flex items-center gap-2">
                      <span className="bg-green-100 text-green-800 px-1.5 py-0.5 rounded mr-1">📂 Local</span>
                      <span className="font-medium">[{f.categoria || 'N/A'}]</span>
                      <span className="truncate" title={f.filename}>{f.filename || 'Foto'}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          )}
        </div>

        {/* Observaciones */}
        {(pozo.observacionesPozo?.value || pozo.observaciones.observaciones?.value) && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-2">Observaciones</h4>
            <p className="text-sm text-gray-700">{pozo.observacionesPozo?.value || pozo.observaciones.observaciones.value}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onEdit}
          className="w-full px-4 py-2 text-white bg-primary rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Editar ficha técnica
        </button>
      </div>
    </div>
  );
}

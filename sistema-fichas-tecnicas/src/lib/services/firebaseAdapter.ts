import { Pozo, FotoInfo, TipoFoto, FieldValue } from '@/types/index';

/**
 * Normaliza un string: MAYÚSCULAS y SIN TILDES (Requirement 4)
 */
export function normalizeString(str: any): string {
    if (!str || typeof str !== 'string') return str?.toString() || '';
    return str
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Convierte un valor literal a un objeto FieldValue con trazabilidad
 */
export function toFieldValue(value: any, source: 'excel' | 'manual' | 'default' = 'excel', normalize: boolean = true): FieldValue {
    const rawValue = value?.toString() || '';
    return {
        value: normalize ? normalizeString(rawValue) : rawValue,
        source,
        modifiedAt: Date.now(),
    };
}

/**
 * Transforma un documento de Firestore (App Catastro) al formato Pozo (PDF Generator)
 */
export function transformFirebaseToPozo(firebaseData: any): Pozo {
    const id = firebaseData.pozo || firebaseData.id || firebaseData.idPozo || `PZ-${Date.now()}`;

    // Extraer GPS
    const lat = firebaseData.gps?.lat || firebaseData.latitud || 0;
    const lng = firebaseData.gps?.lng || firebaseData.longitud || 0;

    // Mapeo dinámico de tuberías y sumideros (Requirement 3: Mapeo Progresivo)
    const sourceTuberias = firebaseData.tuberias || [];

    // Si no hay tuberías registradas pero hay fotos, intentamos inferir
    const finalTuberias = sourceTuberias.length > 0
        ? sourceTuberias
        : (firebaseData.fotoList || [])
            .filter((f: any) => {
                const cat = (f.categoria || f.type || '').toUpperCase();
                return cat.includes('ENTRADA') || cat.includes('SALIDA') || cat.includes('SUMIDERO');
            })
            .map((f: any, idx: number) => {
                const cat = (f.categoria || f.type || '').toUpperCase();
                let tipo = 'Entrada';
                if (cat.includes('SALIDA')) tipo = 'Salida';
                if (cat.includes('SUMIDERO')) tipo = 'Sumidero';

                return {
                    id: f.id || `INF-${idx}`,
                    label: f.categoryLabel || (tipo === 'Sumidero' ? `Sum${idx + 1}` : `${tipo[0]}${idx + 1}`),
                    tipo,
                    diametro: 0,
                    material: 'DESCONOCIDO',
                    estado: 'Bueno',
                    z: 0
                };
            });

    return {
        id,
        idPozo: toFieldValue(firebaseData.pozo || firebaseData.idPozo || id, 'manual'),
        // Mapeo de campos principales
        coordenadaX: toFieldValue(lng, 'manual', false), // Fallback a lng
        coordenadaY: toFieldValue(lat, 'manual', false), // Fallback a lat
        latitud: toFieldValue(lat, 'manual', false),
        longitud: toFieldValue(lng, 'manual', false),
        fecha: toFieldValue(firebaseData.fecha || new Date().toISOString().split('T')[0], 'manual', false),
        levanto: toFieldValue(firebaseData.inspector || firebaseData.levanto || 'Importado Cloud', 'manual'),
        estado: toFieldValue(firebaseData.estado || 'Bueno', 'manual'),
        enlace: toFieldValue(firebaseData.enlace || '', 'manual'),

        // Jerárquicos (Fuente de verdad para el sistema)
        identificacion: {
            idPozo: toFieldValue(firebaseData.pozo || firebaseData.idPozo || id, 'manual', false),
            coordenadaX: toFieldValue(lng, 'manual', false),
            coordenadaY: toFieldValue(lat, 'manual', false),
            latitud: toFieldValue(lat, 'manual', false),
            longitud: toFieldValue(lng, 'manual', false),
            fecha: toFieldValue(firebaseData.fecha || new Date().toISOString().split('T')[0], 'manual', false),
            levanto: toFieldValue(firebaseData.inspector || firebaseData.levanto || 'Importado Cloud', 'manual'),
            estado: toFieldValue(firebaseData.estado || 'Bueno', 'manual'),
            enlace: toFieldValue(firebaseData.enlace || '', 'manual', false),
        },

        ubicacion: {
            direccion: toFieldValue(firebaseData.direccion || '', 'manual'),
            barrio: toFieldValue(firebaseData.barrio || firebaseData.municipio || '', 'manual'),
            elevacion: toFieldValue(firebaseData.gps?.precision || '0', 'manual', false),
            profundidad: toFieldValue(firebaseData.altura || firebaseData.depth || '0', 'manual', false),
        },

        componentes: {
            existeTapa: toFieldValue(firebaseData.existeTapa || 'Sí', 'manual'),
            estadoTapa: toFieldValue(firebaseData.estadoTapa || 'Bueno', 'manual'),
            existeCilindro: toFieldValue(firebaseData.existeCilindro || 'Sí', 'manual'),
            diametroCilindro: toFieldValue(firebaseData.diam || firebaseData.diameter || '0', 'manual'),
            sistema: toFieldValue(firebaseData.sistema || '', 'manual'),
            tipoCamara: toFieldValue(firebaseData.camara || '', 'manual'),
            materialRasante: toFieldValue(firebaseData.rasante || '', 'manual'),
            // Missing properties for TS Interface
            anoInstalacion: toFieldValue('', 'manual'),
            estructuraPavimento: toFieldValue('', 'manual'),
            estadoRasante: toFieldValue('', 'manual'),
            materialTapa: toFieldValue('', 'manual'),
            existeCono: toFieldValue('No', 'manual'),
            tipoCono: toFieldValue('', 'manual'),
            materialCono: toFieldValue('', 'manual'),
            estadoCono: toFieldValue('', 'manual'),
            materialCilindro: toFieldValue('', 'manual'),
            estadoCilindro: toFieldValue('', 'manual'),
            existeCanuela: toFieldValue('No', 'manual'),
            materialCanuela: toFieldValue('', 'manual'),
            estadoCanuela: toFieldValue('', 'manual'),
            existePeldanos: toFieldValue('No', 'manual'),
            materialPeldanos: toFieldValue('', 'manual'),
            numeroPeldanos: toFieldValue('0', 'manual'),
            estadoPeldanos: toFieldValue('', 'manual'),
        },

        observaciones: {
            observaciones: toFieldValue(firebaseData.obs || firebaseData.observaciones || '', 'manual'),
        },

        tuberias: {
            tuberias: finalTuberias
                .filter((t: any) => t.tipo === 'Entrada' || t.tipo === 'Salida')
                .map((t: any, index: number) => ({
                    idTuberia: toFieldValue(t.id || `TUB-${index}`, 'manual'),
                    idPozo: toFieldValue(id, 'manual'),
                    tipoTuberia: toFieldValue(t.tipo.toLowerCase(), 'manual'),
                    diametro: toFieldValue(t.diametro || '0', 'manual'),
                    diametroMm: t.unidad === 'mm' ? toFieldValue(t.diametro, 'manual') : undefined,
                    diametroPulgadas: t.unidad === 'pulg' ? toFieldValue(t.diametro, 'manual') : undefined,
                    material: toFieldValue(t.material || 'DESCONOCIDO', 'manual'),
                    orden: toFieldValue(t.label || `${t.tipo[0]}${index + 1}`, 'manual'),
                    cota: toFieldValue(t.z || '0', 'manual'),
                    z: toFieldValue(t.z || '0', 'manual'),
                    estado: toFieldValue(t.estado || 'Bueno', 'manual'),
                    batea: toFieldValue(t.z || '0', 'manual'),
                    emboquillado: toFieldValue('Sí', 'manual'),
                }))
        },
        sumideros: {
            sumideros: finalTuberias
                .filter((t: any) => t.tipo === 'Sumidero')
                .map((t: any, index: number) => ({
                    idSumidero: toFieldValue(t.id || `SUM-${index}`, 'manual'),
                    idPozo: toFieldValue(id, 'manual'),
                    tipoSumidero: toFieldValue(t.material || 'Rejilla', 'manual'),
                    numeroEsquema: toFieldValue(t.label || `Sum${index + 1}`, 'manual'),
                    diametro: toFieldValue(t.diametro || '0', 'manual'),
                    materialTuberia: toFieldValue(t.material || 'DESCONOCIDO', 'manual'),
                    alturaSalida: toFieldValue(t.z || '0', 'manual'),
                    alturaLlegada: toFieldValue('0', 'manual'),
                }))
        },

        fotos: {
            fotos: (firebaseData.fotoList || []).map((f: any) => transformFirebaseToFotoInfo(f, id))
        },

        metadata: {
            createdAt: firebaseData.createdAt || Date.now(),
            updatedAt: firebaseData.lastSync ? new Date(firebaseData.lastSync).getTime() : Date.now(),
            source: 'manual',
            version: 1,
        }
    };
}

/**
 * Transforma una referencia de foto de Firebase al objeto FotoInfo del sistema
 * Usamos el API Proxy para saltar CORS de Drive/Storage
 */
export function transformFirebaseToFotoInfo(photoData: any, pozoId: string): FotoInfo {
    const photoId = photoData.id || `PHOTO-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;

    // Normalizar categoría de la App móvil al sistema PDF
    let categoria: any = 'PRINCIPAL';
    const sourceCat = (photoData.categoria || '').toUpperCase();

    if (sourceCat.includes('TAPA')) categoria = 'PRINCIPAL'; // La tapa es la principal
    else if (sourceCat.includes('RASANTE')) categoria = 'DESCARGA'; // O similar
    else if (sourceCat.includes('CÁMARA') || sourceCat.includes('CAMARA')) categoria = 'OTRO';
    else if (sourceCat.includes('ENTRADA')) {
        categoria = 'ENTRADA';
    }
    else if (sourceCat.includes('SALIDA')) {
        categoria = 'SALIDA';
    }
    else if (sourceCat.includes('SUMIDERO')) categoria = 'SUMIDERO';
    else if (sourceCat.includes('ALTURA')) categoria = 'OTRO';

    // Determinamos la URL. Si es una URL remota (Drive/FB Storage), usamos nuestro proxy.
    const remoteUrl = photoData.url || photoData.downloadURL;
    const proxyUrl = `/api/catastro/proxy-image?url=${encodeURIComponent(remoteUrl)}`;

    return {
        id: photoId,
        idPozo: pozoId,
        tipo: photoData.tipo || sourceCat.toLowerCase() || 'general',
        categoria: categoria,
        subcategoria: photoData.subcategoria || '',
        blobId: proxyUrl,
        filename: photoData.filename || 'foto_remota.jpg',
    };
}

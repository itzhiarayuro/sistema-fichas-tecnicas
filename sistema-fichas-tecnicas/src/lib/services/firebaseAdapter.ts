import { Pozo, FotoInfo, TipoFoto, FieldValue } from '@/types/index';

/**
 * Normaliza un string: MAYÚSCULAS y SIN TILDES (Requirement 4)
 */
export function normalizeString(str: any): string {
    if (!str || typeof str !== 'string') return str?.toString() || '';
    return str
        .toUpperCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/_/g, ' ') // Quitamos guiones bajos (Requirement)
        .trim();
}

/**
 * Convierte un valor literal a un objeto FieldValue con trazabilidad
 */
export function toFieldValue(value: any, source: 'excel' | 'manual' | 'default' = 'excel', normalize: boolean = true): FieldValue {
    const rawValue = value?.toString() || '';
    let finalValue = normalize ? normalizeString(rawValue) : rawValue;

    // Normalización de "DESCONOCIDO" (Requirement: solo si está vacío o es nulo)
    const checkValue = finalValue.trim().toUpperCase();
    if (!checkValue || checkValue === '-' || checkValue === 'DESCONOCIDO' || checkValue === 'NULL') {
        finalValue = 'DESCONOCIDO';
    }

    return {
        value: finalValue,
        source,
        modifiedAt: Date.now(),
    };
}

/**
 * Mapeo de Email de Creador a Nombre de Inspector (Requirement: Levantó)
 */
export function getInspectorName(email: string): string {
    if (!email) return 'DESCONOCIDO';
    const cleanEmail = email.toLowerCase().trim();
    const mapping: Record<string, string> = {
        "darly.icya@gmail.com": "DARLY",
        "marianagsicya@gmail.com": "MARIANA",
        "cristhianrojas.icya@gmail.com": "CRISTHIAN",
        "anaojeda.icya@gmail.com": "ANA",
        "michellvv.icya@gmail.com": "MICHELL",
        "brayancolimba.icya@gmail.com": "BRAYAN",
        "jonathan.armero.icya@gmail.com": "JONATHAN",
        "gerencia@ingenieriacivilyambiental.com": "GERENCIA",
        "juanvegas003@gmail.com": "ANA MARIA",
        "samara.icya@gmail.com": "SAMARA",
        "juan.vega.icya@gmail.com": "ANA MARIA"
    };
    return mapping[cleanEmail] || normalizeString(email);
}

/**
 * Transforma un documento de Firestore (App Catastro) al formato Pozo (PDF Generator)
 */
export function transformFirebaseToPozo(firebaseData: any): Pozo {
    const id = firebaseData.id || firebaseData.idPozo || firebaseData.pozo || firebaseData.codigo || `PZ-${Date.now()}`;

    // Extraer GPS
    const lat = firebaseData.gps?.lat || firebaseData.latitud || 0;
    const lng = firebaseData.gps?.lng || firebaseData.longitud || 0;

    // Mapeo dinámico de tuberías y sumideros (Requirement 3: Mapeo Progresivo)
    const rawPipes = firebaseData.pipes || firebaseData.tuberias || [];

    // Si no hay tuberías registradas pero hay fotos, intentamos inferir
    let finalTuberias = rawPipes.length > 0
        ? rawPipes
        : (() => {
            const fotosTecnicas = (firebaseData.fotoList || []).filter((f: any) => {
                const cat = (f.categoria || f.type || '').toUpperCase();
                return cat.includes('ENTRADA') || cat.includes('SALIDA') || cat.includes('SUMIDERO');
            });

            // Agrupar por subcategoría o label para evitar duplicados (E1-T, E1-Z -> 1 Tuberia)
            const grouped = new Map<string, any>();
            fotosTecnicas.forEach((f: any) => {
                const cat = (f.categoria || f.type || '').toUpperCase();
                let typePrefix = 'E';
                if (cat.includes('SALIDA')) typePrefix = 'S';
                if (cat.includes('SUMIDERO')) typePrefix = 'SUM';

                // Extraer número de subcategoria (E1, S1, etc.) o usar el índice
                const subcat = (f.subcategoria || f.categoryLabel || '').toUpperCase();
                const key = subcat || `${typePrefix}${grouped.size + 1}`;

                if (!grouped.has(key)) {
                    let tipo = 'entrada';
                    if (cat.includes('SALIDA')) tipo = 'salida';
                    if (cat.includes('SUMIDERO')) tipo = 'sumidero';

                    grouped.set(key, {
                        id: key,
                        label: key,
                        deA: key,
                        es: tipo,
                        tipo: tipo,
                        diam: 0,
                        mat: 'DESCONOCIDO',
                        estado: 'Bueno',
                        cotaZ: 0
                    });
                }
            });
            return Array.from(grouped.values());
        })();

    // --- REQUERIMIENTO: Ocultar elementos sin información ni fotos ---
    const fotoList = firebaseData.fotoList || [];

    const hasPhoto = (type: string, id: string) => {
        const typeUp = type.toUpperCase();
        const idUp = id.toUpperCase();
        return fotoList.some((f: any) => {
            const fCat = (f.categoria || f.type || '').toUpperCase();
            const fSub = (f.subcategoria || f.categoryLabel || '').toUpperCase();
            const fFile = (f.filename || f.nombre || '').toUpperCase();

            // Caso 1: Categoría y Subcategoría coinciden (ej: ENTRADA y E1)
            if (fCat.includes(typeUp) && fSub.includes(idUp)) return true;
            // Caso 2: El nombre del archivo contiene el ID (ej: -E1)
            if (fFile.includes(`-${idUp}`)) return true;
            // Caso especial sumideros (empiezan por S según el usuario)
            if (typeUp === 'SUMIDERO' && (fFile.startsWith('S') || fSub.startsWith('S'))) return true;
            return false;
        });
    };

    const hasInfo = (t: any) => {
        const d = parseFloat(t.diam || t.diametro) || 0;
        const z = parseFloat(t.cotaZ || t.z) || 0;
        const mat = (t.mat || t.material || 'DESCONOCIDO').toUpperCase();
        return d > 0 || z !== 0 || (mat !== 'DESCONOCIDO' && mat !== '');
    };

    finalTuberias = finalTuberias.filter((t: any) => {
        const tipo = (t.es || t.tipo || 'entrada').toLowerCase();
        const ident = (t.id || t.label || t.deA || '').toUpperCase();
        return hasInfo(t) || hasPhoto(tipo, ident);
    });
    // -----------------------------------------------------------------

    // Separar por tipos para alineación con el Designer (0-7 Entradas, 8-15 Salidas)
    const entradas = finalTuberias.filter((t: any) => (t.es || t.tipo || '').toLowerCase() === 'entrada').slice(0, 8);
    const salidas = finalTuberias.filter((t: any) => (t.es || t.tipo || '').toLowerCase() === 'salida').slice(0, 8);

    // Crear array de 16 slots (0-7: Entradas, 8-15: Salidas)
    const tuberiasSlots = new Array(16).fill(null);

    const mapPipe = (t: any, index: number) => {
        const z = parseFloat(t.cotaZ || t.z) || 0;
        const d = parseFloat(t.diam || t.diametro) || 0;
        const mat = t.mat || t.material || 'DESCONOCIDO';
        const est = t.estado || 'BUENO';
        // REQUERIMIENTO: Usar preferiblemente 'deA', evitar IDs largos de fotos
        const ordenValue = t.deA || t.label || `${t.tipo?.[0]?.toUpperCase() || 'T'}${index + 1}`;
        const unidad = t.unit || t.unidad || (d > 2 ? 'pulg' : 'm');

        let batea = z;
        if (z > 0) {
            batea = z + 0.15;
        }

        return {
            idTuberia: toFieldValue(ordenValue, 'manual'),
            idPozo: toFieldValue(id, 'manual'),
            tipoTuberia: toFieldValue((t.es || t.tipo).toLowerCase(), 'manual'),
            diametro: toFieldValue(t.diam || t.diametro || '0', 'manual'),
            diametroMm: unidad === 'mm' ? toFieldValue(d, 'manual') : undefined,
            diametroPulgadas: unidad === 'pulg' ? toFieldValue(d, 'manual') : undefined,
            material: toFieldValue(mat, 'manual'),
            orden: toFieldValue(t.orden || (index + 1), 'manual'),
            cota: toFieldValue(z.toFixed(4), 'manual'),
            z: toFieldValue(z.toFixed(4), 'manual'),
            estado: toFieldValue(est, 'manual'),
            batea: toFieldValue(batea.toFixed(4), 'manual'),
            emboquillado: toFieldValue(t.emboq || 'SÍ', 'manual'),
        };
    };

    entradas.forEach((t: any, i: number) => { tuberiasSlots[i] = mapPipe(t, i); });
    salidas.forEach((t: any, i: number) => { tuberiasSlots[i + 8] = mapPipe(t, i + 8); });

    const sumiderosSlots = new Array(8).fill(null);
    const sumiderosList = finalTuberias.filter((t: any) => (t.tipo || t.es || '').toLowerCase() === 'sumidero').slice(0, 8);

    sumiderosList.forEach((t: any, i: number) => {
        const connectedPipe = finalTuberias.find((p: any) => (p.tipo || p.es || '').toLowerCase() !== 'sumidero' && p.id === t.id);
        const hLlegada = connectedPipe && (connectedPipe.cotaZ || connectedPipe.z) ? (connectedPipe.cotaZ || connectedPipe.z) : '0';

        const zSumidero = parseFloat(t.cotaZ || t.z) || 0;
        const bateaSumidero = zSumidero > 0 ? zSumidero + 0.15 : zSumidero;

        sumiderosSlots[i] = {
            idSumidero: toFieldValue(t.id || `SUM-${i}`, 'manual'),
            idPozo: toFieldValue(id, 'manual'),
            tipoSumidero: toFieldValue(t.mat || t.material || 'REJILLA', 'manual'),
            numeroEsquema: toFieldValue(t.deA || t.label || `SUM${i + 1}`, 'manual'),
            diametro: toFieldValue(t.diam || t.diametro || '0', 'manual'),
            materialTuberia: toFieldValue(t.mat || t.material || 'DESCONOCIDO', 'manual'),
            alturaSalida: toFieldValue(bateaSumidero.toFixed(4), 'manual'),
            alturaLlegada: toFieldValue(hLlegada, 'manual'),
        };
    });

    // Helper para seguir la lógica 'existeComp' del script del usuario
    const isSi = (val: any) => normalizeString(val) === 'SI';

    const tapa = firebaseData.tapa || {};
    const cono = firebaseData.cono || {};
    const cuerpo = firebaseData.cuerpo || {};
    const canu = firebaseData.canu || {};
    const peld = firebaseData.peld || {};

    // Helper para expandir abreviaturas
    const expandirAbreviatura = (val: string) => {
        if (!val) return 'DESCONOCIDO';
        const map: Record<string, string> = {
            'PAV_FLEX': 'PAVIMENTO FLEXIBLE',
            'PAV_RIGI': 'PAVIMENTO RÍGIDO',
            'AFIRMADO': 'AFIRMADO',
            'ADOQUINADO': 'ADOQUINADO',
            'VEGETACION': 'VEGETACIÓN',
            'TIERRA': 'TIERRA',
            'CONCRETO': 'CONCRETO',
            'ASFALTO': 'ASFALTO'
        };
        const key = val.toUpperCase().trim();
        return map[key] || val;
    };

    return {
        id,
        idPozo: toFieldValue(firebaseData.pozo || firebaseData.codigo || firebaseData.idPozo || id, 'manual'),
        coordenadaX: toFieldValue(parseFloat(String(firebaseData.coordenada_x ?? firebaseData.gps?.x ?? '')) || '', 'manual', false),
        coordenadaY: toFieldValue(parseFloat(String(firebaseData.coordenada_y ?? firebaseData.gps?.y ?? '')) || '', 'manual', false),
        latitud: toFieldValue(lat, 'manual', false),
        longitud: toFieldValue(lng, 'manual', false),
        fecha: toFieldValue(firebaseData.fecha || new Date().toISOString().split('T')[0], 'manual', false),
        levanto: toFieldValue(getInspectorName(firebaseData.creatorEmail || firebaseData.inspector || firebaseData.levanto), 'manual'),
        estado: toFieldValue(firebaseData.estadoPozo || firebaseData.estado || 'DESCONOCIDO', 'manual'),
        enlace: toFieldValue(firebaseData.enlace || '', 'manual'),
        direccion: toFieldValue(firebaseData.direccion || '', 'manual'),
        barrio: toFieldValue(firebaseData.barrio || firebaseData.municipio || '', 'manual'),
        municipio: toFieldValue(firebaseData.municipio || '', 'manual'),
        elevacion: toFieldValue(firebaseData.gps?._precision || firebaseData.gps?.precision || firebaseData.zRasante || '0', 'manual', false),
        profundidad: toFieldValue(firebaseData.altura || firebaseData.depth || '0', 'manual', false),
        sistema: toFieldValue(firebaseData.sistema || 'DESCONOCIDO', 'manual'),

        // Componentes (Flattened para PDF y con lógica condicional)
        existeTapa: toFieldValue(tapa.existe, 'manual'),
        materialTapa: isSi(tapa.existe) ? toFieldValue(tapa.mat, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
        estadoTapa: isSi(tapa.existe) ? toFieldValue(tapa.estado, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),

        tipoCamara: toFieldValue(firebaseData.camara || firebaseData.tipoElemento || 'DESCONOCIDO', 'manual'),
        materialRasante: toFieldValue(expandirAbreviatura(firebaseData.rasante || firebaseData.materialRasante || firebaseData.matRasante), 'manual'),

        existeCono: toFieldValue(cono.existe, 'manual'),
        tipoCono: isSi(cono.existe) ? toFieldValue(cono.tipo, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
        materialCono: isSi(cono.existe) ? toFieldValue(cono.mat, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
        estadoCono: isSi(cono.existe) ? toFieldValue(cono.estado, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),

        existeCilindro: toFieldValue(cuerpo.existe, 'manual'),
        diametroCilindro: toFieldValue(firebaseData.diam || firebaseData.diameter || '0', 'manual'),
        materialCilindro: isSi(cuerpo.existe) ? toFieldValue(cuerpo.mat, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
        estadoCilindro: isSi(cuerpo.existe) ? toFieldValue(cuerpo.estado, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),

        existeCanuela: toFieldValue(canu.existe, 'manual'),
        materialCanuela: isSi(canu.existe) ? toFieldValue(canu.mat, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
        estadoCanuela: isSi(canu.existe) ? toFieldValue(canu.estado, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),

        existePeldanos: toFieldValue(peld.existe, 'manual'),
        materialPeldanos: isSi(peld.existe) ? toFieldValue(peld.mat, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
        numeroPeldanos: isSi(peld.existe) ? toFieldValue(peld.num || '0', 'manual') : toFieldValue('0', 'manual'),
        estadoPeldanos: isSi(peld.existe) ? toFieldValue(peld.estado, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),

        observacionesPozo: toFieldValue(firebaseData.obs || firebaseData.observaciones || '', 'manual'),

        identificacion: {
            idPozo: toFieldValue(firebaseData.pozo || firebaseData.codigo || firebaseData.idPozo || id, 'manual', false),
            coordenadaX: toFieldValue(parseFloat(String(firebaseData.coordenada_x ?? firebaseData.gps?.x ?? '')) || '', 'manual', false),
            coordenadaY: toFieldValue(parseFloat(String(firebaseData.coordenada_y ?? firebaseData.gps?.y ?? '')) || '', 'manual', false),
            latitud: toFieldValue(lat, 'manual', false),
            longitud: toFieldValue(lng, 'manual', false),
            fecha: toFieldValue(firebaseData.fecha || new Date().toISOString().split('T')[0], 'manual', false),
            levanto: toFieldValue(getInspectorName(firebaseData.creatorEmail || firebaseData.inspector || firebaseData.levanto), 'manual'),
            estado: toFieldValue(firebaseData.estadoPozo || firebaseData.estado || 'DESCONOCIDO', 'manual'),
            municipio: toFieldValue(firebaseData.municipio || '', 'manual'),
            enlace: toFieldValue(firebaseData.enlace || '', 'manual', false),
        },

        ubicacion: {
            direccion: toFieldValue(firebaseData.direccion || '', 'manual'),
            barrio: toFieldValue(firebaseData.barrio || '', 'manual'),
            municipio: toFieldValue(firebaseData.municipio || '', 'manual'),
            elevacion: toFieldValue(firebaseData.gps?._precision || firebaseData.gps?.precision || firebaseData.zRasante || '0', 'manual', false),
            profundidad: toFieldValue(firebaseData.altura || firebaseData.depth || '0', 'manual', false),
        },

        componentes: {
            existeTapa: toFieldValue(tapa.existe, 'manual'),
            estadoTapa: isSi(tapa.existe) ? toFieldValue(tapa.estado, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
            existeCilindro: toFieldValue(cuerpo.existe, 'manual'),
            diametroCilindro: toFieldValue(firebaseData.diam || firebaseData.diameter || '0', 'manual'),
            sistema: toFieldValue(firebaseData.sistema || 'DESCONOCIDO', 'manual'),
            tipoCamara: toFieldValue(firebaseData.camara || firebaseData.tipoElemento || 'DESCONOCIDO', 'manual'),
            materialRasante: toFieldValue(expandirAbreviatura(firebaseData.rasante || firebaseData.materialRasante || firebaseData.matRasante), 'manual'),
            anoInstalacion: toFieldValue('', 'manual'),
            estructuraPavimento: toFieldValue('', 'manual'),
            estadoRasante: toFieldValue('', 'manual'),
            materialTapa: isSi(tapa.existe) ? toFieldValue(tapa.mat, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
            existeCono: toFieldValue(cono.existe, 'manual'),
            tipoCono: isSi(cono.existe) ? toFieldValue(cono.tipo, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
            materialCono: isSi(cono.existe) ? toFieldValue(cono.mat, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
            estadoCono: isSi(cono.existe) ? toFieldValue(cono.estado, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
            materialCilindro: isSi(cuerpo.existe) ? toFieldValue(cuerpo.mat, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
            estadoCilindro: isSi(cuerpo.existe) ? toFieldValue(cuerpo.estado, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
            existeCanuela: toFieldValue(canu.existe, 'manual'),
            materialCanuela: isSi(canu.existe) ? toFieldValue(canu.mat, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
            estadoCanuela: isSi(canu.existe) ? toFieldValue(canu.estado, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
            existePeldanos: toFieldValue(peld.existe, 'manual'),
            materialPeldanos: isSi(peld.existe) ? toFieldValue(peld.mat, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
            numeroPeldanos: isSi(peld.existe) ? toFieldValue(peld.num || '0', 'manual') : toFieldValue('0', 'manual'),
            estadoPeldanos: isSi(peld.existe) ? toFieldValue(peld.estado, 'manual') : toFieldValue('DESCONOCIDO', 'manual'),
        },

        observaciones: {
            observaciones: toFieldValue(firebaseData.obs || firebaseData.observaciones || '', 'manual'),
        },

        tuberias: {
            tuberias: tuberiasSlots
        },

        sumideros: {
            sumideros: sumiderosSlots
        },

        fotos: {
            fotos: (() => {
                const list = [...(firebaseData.fotoList || [])];
                // Support Marcaciones that use an object for "fotos"
                if (firebaseData.fotos && typeof firebaseData.fotos === 'object') {
                    Object.values(firebaseData.fotos).forEach((f: any) => {
                        if (f && typeof f === 'object') list.push(f);
                    });
                }
                return list
                    .map((f: any) => transformFirebaseToFotoInfo(f, id))
                    .filter((f: any) => f.blobId && f.blobId !== '');
            })()
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
    // Determinamos la fuente de la imagen primero para generar un ID estable
    const remoteUrl = photoData.url || photoData.downloadURL || '';
    const driveId = photoData.driveId || photoData.fileId || '';
    const filenameSource = photoData.filename || photoData.nombre || '';

    // Generar ID estable basado en DriveId o Nombre para evitar duplicados en re-importaciones
    const stableSuffix = driveId || filenameSource || Math.random().toString(36).substr(2, 5);
    const photoId = photoData.id || `PHOTO-${stableSuffix}`;

    // Normalizar categoría de la App móvil al sistema PDF
    let categoria: any = 'PRINCIPAL';
    const sourceCat = (photoData.categoria || '').toUpperCase();
    const filenameUC = (photoData.filename || photoData.nombre || '').toUpperCase();

    // Prioridad a componentes específicos sobre Tapa Principal
    if (sourceCat.includes('SUMIDERO') || filenameUC.includes('-SUM')) {
        categoria = 'SUMIDERO';
    } else if (sourceCat.includes('ENTRADA') || filenameUC.includes('-E')) {
        categoria = 'ENTRADA';
    } else if (sourceCat.includes('SALIDA') || filenameUC.includes('-S')) {
        categoria = 'SALIDA';
    } else if (sourceCat.includes('TAPA')) {
        categoria = 'PRINCIPAL';
    } else if (sourceCat.includes('RASANTE')) {
        categoria = 'DESCARGA';
    } else if (sourceCat.includes('CÁMARA') || sourceCat.includes('CAMARA')) {
        categoria = 'OTRO';
    } else if (sourceCat.includes('ALTURA')) {
        categoria = 'OTRO';
    }
    else {
        categoria = 'OTRO'; // Fallback si no coincide nada
    }

    let proxyUrl = '';
    if (remoteUrl) {
        proxyUrl = `/api/catastro/proxy-image?url=${encodeURIComponent(remoteUrl)}`;
    } else if (driveId) {
        proxyUrl = `/api/catastro/proxy-image?driveId=${driveId}&filename=${encodeURIComponent(filenameSource)}`;
    } else if (filenameSource) {
        proxyUrl = `/api/catastro/proxy-image?filename=${encodeURIComponent(filenameSource)}`;
    }

    return {
        id: photoId,
        idPozo: pozoId,
        tipo: photoData.tipo || sourceCat.toLowerCase() || 'general',
        categoria: categoria,
        subcategoria: photoData.subcategoria || '',
        blobId: proxyUrl,
        filename: filenameSource || 'foto_remota.jpg',
        driveId: driveId // Persistir el ID de drive original
    } as any;
}

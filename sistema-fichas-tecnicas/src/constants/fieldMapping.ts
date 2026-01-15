/**
 * Mapeo de campos del sistema a rutas en el objeto Pozo
 * Sincronizado con el modelo de datos real y el Designer
 */

export const FIELD_PATHS: Record<string, string> = {
    // POZO - Identificación
    'pozo_id': 'identificacion.idPozo.value',
    'pozo_fecha': 'identificacion.fecha.value',
    'pozo_coordX': 'identificacion.coordenadaX.value',
    'pozo_coordY': 'identificacion.coordenadaY.value',
    'pozo_levanto': 'identificacion.levanto.value',
    'pozo_estado': 'identificacion.estado.value',

    // POZO - Ubicación
    'pozo_direccion': 'ubicacion.direccion.value',
    'pozo_barrio': 'ubicacion.barrio.value',
    'pozo_localidad': 'ubicacion.localidad.value',
    'pozo_upz': 'ubicacion.upz.value',
    'pozo_profundidad': 'ubicacion.profundidad.value',
    'pozo_elevacion': 'ubicacion.elevacion.value',

    // POZO - Componentes
    'pozo_materialTapa': 'componentes.materialTapa.value',
    'pozo_diametroTapa': 'componentes.diametroTapa.value',
    'pozo_estadoTapa': 'componentes.estadoTapa.value',
    'pozo_materialCilindro': 'componentes.materialCilindro.value',
    'pozo_diametroCilindro': 'componentes.diametroCilindro.value',
    'pozo_estadoCilindro': 'componentes.estadoCilindro.value',
    'pozo_materialCono': 'componentes.materialCono.value',
    'pozo_estadoCono': 'componentes.estadoCono.value',
    'pozo_materialCanuela': 'componentes.materialCanuela.value',
    'pozo_estadoCanuela': 'componentes.estadoCanuela.value',
    'pozo_numPeldanos': 'componentes.numeroPeldanos.value',
    'pozo_materialPeldanos': 'componentes.materialPeldanos.value',
    'pozo_estadoPeldanos': 'componentes.estadoPeldanos.value',

    // POZO - Observaciones
    'pozo_observaciones': 'observaciones.observaciones.value',

    // TUBERIAS (Hasta 8 slots para diseño flexible)
    'tub_1_diametro': 'tuberias.tuberias[0].diametro.value',
    'tub_1_material': 'tuberias.tuberias[0].material.value',
    'tub_1_estado': 'tuberias.tuberias[0].estado.value',
    'tub_2_diametro': 'tuberias.tuberias[1].diametro.value',
    'tub_2_material': 'tuberias.tuberias[1].material.value',
    'tub_2_estado': 'tuberias.tuberias[1].estado.value',
    'tub_3_diametro': 'tuberias.tuberias[2].diametro.value',
    'tub_3_material': 'tuberias.tuberias[2].material.value',
    'tub_3_estado': 'tuberias.tuberias[2].estado.value',
    'tub_4_diametro': 'tuberias.tuberias[3].diametro.value',
    'tub_4_material': 'tuberias.tuberias[3].material.value',
    'tub_4_estado': 'tuberias.tuberias[3].estado.value',
    'tub_5_diametro': 'tuberias.tuberias[4].diametro.value',
    'tub_5_material': 'tuberias.tuberias[4].material.value',
    'tub_5_estado': 'tuberias.tuberias[4].estado.value',
    'tub_6_diametro': 'tuberias.tuberias[5].diametro.value',
    'tub_6_material': 'tuberias.tuberias[5].material.value',
    'tub_6_estado': 'tuberias.tuberias[5].estado.value',
    'tub_7_diametro': 'tuberias.tuberias[6].diametro.value',
    'tub_7_material': 'tuberias.tuberias[6].material.value',
    'tub_7_estado': 'tuberias.tuberias[6].estado.value',
    'tub_8_diametro': 'tuberias.tuberias[7].diametro.value',
    'tub_8_material': 'tuberias.tuberias[7].material.value',
    'tub_8_estado': 'tuberias.tuberias[7].estado.value',

    // SUMIDEROS (Hasta 4 slots)
    'sum_1_tipo': 'sumideros.sumideros[0].tipoSumidero.value',
    'sum_1_material': 'sumideros.sumideros[0].materialTuberia.value',
    'sum_2_tipo': 'sumideros.sumideros[1].tipoSumidero.value',
    'sum_2_material': 'sumideros.sumideros[1].materialTuberia.value',
    'sum_3_tipo': 'sumideros.sumideros[2].tipoSumidero.value',
    'sum_3_material': 'sumideros.sumideros[2].materialTuberia.value',
    'sum_4_tipo': 'sumideros.sumideros[3].tipoSumidero.value',
    'sum_4_material': 'sumideros.sumideros[3].materialTuberia.value',

    // FOTOS (Expandido a 12 slots)
    'foto_1': 'fotos.fotos[0].blobId',
    'foto_2': 'fotos.fotos[1].blobId',
    'foto_3': 'fotos.fotos[2].blobId',
    'foto_4': 'fotos.fotos[3].blobId',
    'foto_5': 'fotos.fotos[4].blobId',
    'foto_6': 'fotos.fotos[5].blobId',
    'foto_7': 'fotos.fotos[6].blobId',
    'foto_8': 'fotos.fotos[7].blobId',
    'foto_9': 'fotos.fotos[8].blobId',
    'foto_10': 'fotos.fotos[9].blobId',
    'foto_11': 'fotos.fotos[10].blobId',
    'foto_12': 'fotos.fotos[11].blobId',

    // Alias heredados del legacy para compatibilidad
    'identificacion.idPozo': 'identificacion.idPozo.value',
    'identificacion.fecha': 'identificacion.fecha.value',
    'identificacion.coordenadaX': 'identificacion.coordenadaX.value',
    'identificacion.coordenadaY': 'identificacion.coordenadaY.value',
};

export const AVAILABLE_DATA_FIELDS = [
    { id: 'pozo_id', label: 'ID del Pozo', category: 'Identificación' },
    { id: 'pozo_fecha', label: 'Fecha', category: 'Identificación' },
    { id: 'pozo_levanto', label: 'Levantó', category: 'Identificación' },
    { id: 'pozo_estado', label: 'Estado', category: 'Identificación' },
    { id: 'pozo_coordX', label: 'Coordenada X', category: 'Ubicación' },
    { id: 'pozo_coordY', label: 'Coordenada Y', category: 'Ubicación' },
    { id: 'pozo_direccion', label: 'Dirección', category: 'Ubicación' },
    { id: 'pozo_barrio', label: 'Barrio', category: 'Ubicación' },
    { id: 'pozo_localidad', label: 'Localidad', category: 'Ubicación' },
    { id: 'pozo_upz', label: 'UPZ', category: 'Ubicación' },
    { id: 'pozo_elevacion', label: 'Elevación', category: 'Ubicación' },
    { id: 'pozo_profundidad', label: 'Profundidad', category: 'Ubicación' },
    { id: 'pozo_materialTapa', label: 'Mat. Tapa', category: 'Componentes' },
    { id: 'pozo_estadoTapa', label: 'Estado Tapa', category: 'Componentes' },
    { id: 'pozo_diametroCilindro', label: 'Ø Cilindro', category: 'Componentes' },
    { id: 'pozo_materialCono', label: 'Mat. Cono', category: 'Componentes' },
    { id: 'pozo_materialCanuela', label: 'Mat. Cañuela', category: 'Componentes' },
    { id: 'pozo_numPeldanos', label: 'Nº Peldaños', category: 'Componentes' },
    { id: 'pozo_observaciones', label: 'Observaciones', category: 'Observaciones' },
];

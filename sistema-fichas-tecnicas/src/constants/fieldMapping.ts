/**
 * Mapeo de campos del sistema a rutas en el objeto Pozo
 */
export const FIELD_PATHS: Record<string, string> = {
    'pozo_id': 'identificacion.idPozo.value',
    'pozo_fecha': 'identificacion.fecha.value',
    'pozo_coordX': 'identificacion.coordenadaX.value',
    'pozo_coordY': 'identificacion.coordenadaY.value',
    'pozo_direccion': 'ubicacion.direccion.value',
    'pozo_barrio': 'ubicacion.barrio.value',
    'pozo_levanto': 'identificacion.levanto.value',
    'pozo_estado': 'identificacion.estado.value',
    'pozo_elevacion': 'ubicacion.elevacion.value',
    'pozo_profundidad': 'ubicacion.profundidad.value',
    'pozo_materialTapa': 'componentes.materialTapa.value',
    'pozo_estadoTapa': 'componentes.estadoTapa.value',
    'pozo_diametroCilindro': 'componentes.diametroCilindro.value',
    'pozo_sistema': 'componentes.sistema.value',
    'pozo_anoInstalacion': 'componentes.anoInstalacion.value',
    'pozo_tipoCamara': 'componentes.tipoCamara.value',
    'pozo_estructuraPavimento': 'componentes.estructuraPavimento.value',
    'pozo_observaciones': 'observaciones.observaciones.value',
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
    { id: 'pozo_elevacion', label: 'Elevación', category: 'Ubicación' },
    { id: 'pozo_profundidad', label: 'Profundidad', category: 'Ubicación' },
    { id: 'pozo_materialTapa', label: 'Mat. Tapa', category: 'Componentes' },
    { id: 'pozo_estadoTapa', label: 'Estado Tapa', category: 'Componentes' },
    { id: 'pozo_diametroCilindro', label: 'Ø Cilindro', category: 'Componentes' },
    { id: 'pozo_sistema', label: 'Sistema', category: 'Componentes' },
    { id: 'pozo_anoInstalacion', label: 'Año Inst.', category: 'Componentes' },
    { id: 'pozo_tipoCamara', label: 'Tipo Cámara', category: 'Componentes' },
    { id: 'pozo_estructuraPavimento', label: 'Estruct. Pavimento', category: 'Componentes' },
    { id: 'pozo_observaciones', label: 'Observaciones', category: 'Observaciones' },
];

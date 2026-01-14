/**
 * ExcelFormatGuide - Guía de formato Excel con plantilla descargable
 * Requirements: 1.4, 14.1-14.4
 * 
 * Muestra el formato esperado del Excel y permite descargar una plantilla de ejemplo.
 */

'use client';

import { useState, useCallback } from 'react';

interface ColumnInfo {
  name: string;
  description: string;
  required: boolean;
  example: string;
}

const COLUMNS: ColumnInfo[] = [
  { name: 'Código', description: 'Código único del pozo', required: true, example: 'M680' },
  { name: 'Coordenada X', description: 'Longitud (WGS84 o Planas)', required: false, example: '-74.0817' },
  { name: 'Coordenada Y', description: 'Latitud (WGS84 o Planas)', required: false, example: '4.6097' },
  { name: 'Fecha', description: 'Fecha de inspección (AAAA-MM-DD)', required: false, example: '2024-01-15' },
  { name: 'Levantó', description: 'Nombre del inspector', required: false, example: 'Ing. Perez' },
  { name: 'Estado', description: 'Estado general del pozo', required: false, example: 'Bueno' },
  { name: 'Dirección', description: 'Dirección física', required: false, example: 'Calle 45 #12-34' },
  { name: 'Barrio', description: 'Barrio o sector', required: false, example: 'Centro' },
  { name: 'Elevación', description: 'Cota de terreno (MSNM)', required: false, example: '1850.25' },
  { name: 'Profundidad', description: 'Profundidad total (m)', required: false, example: '2.50' },
  { name: 'Sistema', description: 'Tipo de sistema (Sanitario, Pluvial, Combinado)', required: false, example: 'Sanitario' },
  { name: 'Existe tapa', description: '¿Tiene tapa? (Sí/No)', required: false, example: 'Sí' },
  { name: 'Material tapa', description: 'Material de la tapa', required: false, example: 'Hierro fundido' },
  { name: 'Estado tapa', description: 'Estado de conservación de la tapa', required: false, example: 'Bueno' },
  { name: 'Observaciones', description: 'Notas adicionales del levantamiento', required: false, example: 'Pozo con sedimentos' },
];

// Datos de ejemplo para la plantilla
const SAMPLE_POZOS = [
  {
    'Código': 'M680',
    'Coordenada X': '-74.0817',
    'Coordenada Y': '4.6097',
    'Fecha': '2024-01-15',
    'Levantó': 'Ing. Perez',
    'Estado': 'Bueno',
    'Dirección': 'Calle 45 #12-34',
    'Barrio': 'Centro',
    'Elevación': '1850.25',
    'Profundidad': '2.50',
    'Sistema': 'Sanitario',
    'Existe tapa': 'Sí',
    'Material tapa': 'Hierro fundido',
    'Estado tapa': 'Bueno',
    'Observaciones': 'Sin novedad en superficie'
  },
  {
    'Código': 'M681',
    'Coordenada X': '-74.0820',
    'Coordenada Y': '4.6100',
    'Fecha': '2024-01-16',
    'Levantó': 'Ing. Perez',
    'Estado': 'Regular',
    'Dirección': 'Carrera 10 #20-15',
    'Barrio': 'Norte',
    'Elevación': '1852.10',
    'Profundidad': '3.00',
    'Sistema': 'Pluvial',
    'Existe tapa': 'Sí',
    'Material tapa': 'Concreto',
    'Estado tapa': 'Regular',
    'Observaciones': 'Requiere limpieza de cañuela'
  }
];

const SAMPLE_TUBERIAS = [
  { 'Código pozo': 'M680', 'Id tuberia': 'T1', 'ø (mm)': '200', 'Material': 'PVC', 'Z': '1848.50', 'Estado': 'Bueno', 'Longitud': '12.5' },
  { 'Código pozo': 'M680', 'Id tuberia': 'T2', 'ø (mm)': '250', 'Material': 'Concreto', 'Z': '1848.40', 'Estado': 'Regular', 'Longitud': '8.2' },
];

const SAMPLE_SUMIDEROS = [
  { Id_pozo: 'M680', Id_sumidero: 'S1', '#_esquema': '1', 'Tipo sumidero': 'Rejilla', 'ø (mm)': '150', 'Materia Tuberia': 'PVC', 'H salida (m)': '0.80', 'H llegada (m)': '0.75' },
  { Id_pozo: 'M681', Id_sumidero: 'S1', '#_esquema': '1', 'Tipo sumidero': 'Buzón', 'ø (mm)': '200', 'Materia Tuberia': 'Concreto', 'H salida (m)': '1.00', 'H llegada (m)': '0.90' }
];

interface ExcelFormatGuideProps {
  className?: string;
}

export function ExcelFormatGuide({ className = '' }: ExcelFormatGuideProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  /**
   * Genera y descarga la plantilla Excel
   */
  const handleDownloadTemplate = useCallback(async () => {
    setIsGenerating(true);

    try {
      // Importación dinámica de xlsx
      const XLSX = await import('xlsx');

      // Crear workbook
      const wb = XLSX.utils.book_new();

      // 1. Hoja POZOS
      const wsPozos = XLSX.utils.json_to_sheet(SAMPLE_POZOS);
      XLSX.utils.book_append_sheet(wb, wsPozos, 'Informacion_pozos');

      // 2. Hoja TUBERIAS
      const wsTuberias = XLSX.utils.json_to_sheet(SAMPLE_TUBERIAS);
      XLSX.utils.book_append_sheet(wb, wsTuberias, 'Tuberias');

      // 3. Hoja SUMIDEROS
      const wsSumideros = XLSX.utils.json_to_sheet(SAMPLE_SUMIDEROS);
      XLSX.utils.book_append_sheet(wb, wsSumideros, 'Sumideros');

      // Crear hoja de instrucciones
      const instructions = [
        { Campo: 'INSTRUCCIONES', Descripcion: '' },
        { Campo: '', Descripcion: '' },
        { Campo: '1. Columnas', Descripcion: 'Solo "codigo" es obligatorio. Las demás son opcionales.' },
        { Campo: '2. Nombres', Descripcion: 'Los nombres de columna son flexibles (con/sin tildes, mayúsculas/minúsculas).' },
        { Campo: '3. Columnas extra', Descripcion: 'Las columnas no reconocidas serán ignoradas sin error.' },
        { Campo: '4. Valores vacíos', Descripcion: 'Los campos vacíos usarán valores por defecto.' },
        { Campo: '', Descripcion: '' },
        { Campo: 'COLUMNAS DISPONIBLES', Descripcion: '' },
        ...COLUMNS.map(col => ({
          Campo: col.name + (col.required ? ' *' : ''),
          Descripcion: col.description,
          Ejemplo: col.example,
        })),
      ];

      const wsInstructions = XLSX.utils.json_to_sheet(instructions);
      wsInstructions['!cols'] = [{ wch: 25 }, { wch: 50 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

      // Descargar
      XLSX.writeFile(wb, 'plantilla_pozos.xlsx');

    } catch (error) {
      console.error('Error al generar plantilla:', error);
      alert('Error al generar la plantilla. Por favor intente de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header colapsable */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900">Formato del archivo Excel</h3>
            <p className="text-sm text-gray-500">Ver columnas esperadas y descargar plantilla</p>
          </div>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Contenido expandible */}
      {isExpanded && (
        <div className="border-t border-gray-200">
          {/* Botón de descarga */}
          <div className="p-4 bg-gray-50 border-b border-gray-200">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generando...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar plantilla Excel
                </>
              )}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              La plantilla incluye 3 ejemplos y una hoja de instrucciones
            </p>
          </div>

          {/* Tabla de columnas */}
          <div className="p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Columnas disponibles</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Columna</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Descripción</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Ejemplo</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Requerido</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {COLUMNS.map((col) => (
                    <tr key={col.name} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                          {col.name}
                        </code>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{col.description}</td>
                      <td className="px-3 py-2 text-gray-500 italic">{col.example}</td>
                      <td className="px-3 py-2 text-center">
                        {col.required ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Sí
                          </span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Notas */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <h5 className="text-sm font-medium text-blue-800 mb-2">Notas importantes</h5>
              <ul className="text-xs text-blue-700 space-y-1">
                <li>• Solo la columna <strong>codigo</strong> es obligatoria</li>
                <li>• Los nombres de columna son flexibles (ej: &quot;codigo&quot;, &quot;Código&quot;, &quot;CODIGO&quot; funcionan igual)</li>
                <li>• Las columnas no reconocidas serán ignoradas automáticamente</li>
                <li>• Los campos vacíos usarán valores por defecto</li>
                <li>• Se acepta formato .xlsx, .xls y .xlsm</li>
                <li>• Para fotos: cada archivo debe tener un nombre único (ej: M680-P.jpg, M680-T.jpg, NO M680-PT.jpg)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ExcelFormatGuide;

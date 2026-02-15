/**
 * FileList Component - Lista de archivos cargados con estado
 * Requirements: 1.2, 1.6
 * 
 * Muestra los archivos cargados con:
 * - Nombre y tamaño
 * - Estado de procesamiento
 * - Progreso de carga
 * - Acciones (eliminar, reintentar)
 */

'use client';

import { useMemo, useState } from 'react';
import { formatFileSize } from './DropZone';

export type FileStatus = 'pending' | 'processing' | 'success' | 'error' | 'warning';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  status: FileStatus;
  progress?: number;
  message?: string;
  preview?: string;
}

export interface FileListProps {
  files: FileItem[];
  onRemove?: (fileId: string) => void;
  onRetry?: (fileId: string) => void;
  showPreview?: boolean;
  className?: string;
  itemsPerPage?: number; // Número de fotos por página
}

/**
 * Obtiene el icono según el tipo de archivo
 */
function getFileIcon(type: string): JSX.Element {
  if (type.includes('spreadsheet') || type.includes('excel') || type.includes('xlsx')) {
    return (
      <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  if (type.includes('image')) {
    return (
      <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  return (
    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

/**
 * Obtiene el icono de estado
 */
function getStatusIcon(status: FileStatus): JSX.Element {
  switch (status) {
    case 'processing':
      return (
        <svg className="w-5 h-5 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      );
    case 'success':
      return (
        <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-5 h-5 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    default:
      return (
        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
}

/**
 * Obtiene el color de fondo según el estado
 */
function getStatusBgColor(status: FileStatus): string {
  switch (status) {
    case 'processing':
      return 'bg-blue-50 border-blue-200';
    case 'success':
      return 'bg-green-50 border-green-200';
    case 'error':
      return 'bg-red-50 border-red-200';
    case 'warning':
      return 'bg-yellow-50 border-yellow-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
}

export function FileList({
  files,
  onRemove,
  onRetry,
  showPreview = true,
  className = '',
  itemsPerPage = 50, // Por defecto 50 fotos por página
}: FileListProps) {
  // Estado de paginación para imágenes
  const [currentPage, setCurrentPage] = useState(1);

  // Agrupar archivos por tipo
  const groupedFiles = useMemo(() => {
    const excel: FileItem[] = [];
    const images: FileItem[] = [];
    const other: FileItem[] = [];

    files.forEach((file) => {
      if (file.type.includes('spreadsheet') || file.type.includes('excel') || file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        excel.push(file);
      } else if (file.type.includes('image')) {
        images.push(file);
      } else {
        other.push(file);
      }
    });

    return { excel, images, other };
  }, [files]);

  // Estadísticas
  const stats = useMemo(() => {
    const total = files.length;
    const success = files.filter((f) => f.status === 'success').length;
    const errors = files.filter((f) => f.status === 'error').length;
    const warnings = files.filter((f) => f.status === 'warning').length;
    const processing = files.filter((f) => f.status === 'processing').length;

    return { total, success, errors, warnings, processing };
  }, [files]);

  // Paginación de imágenes
  const paginatedImages = useMemo(() => {
    const totalPages = Math.ceil(groupedFiles.images.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentImages = groupedFiles.images.slice(startIndex, endIndex);

    return {
      images: currentImages,
      totalPages,
      hasMore: currentPage < totalPages,
      hasPrevious: currentPage > 1,
    };
  }, [groupedFiles.images, currentPage, itemsPerPage]);

  // Resetear página cuando cambian las imágenes
  useMemo(() => {
    setCurrentPage(1);
  }, [groupedFiles.images.length]);

  if (files.length === 0) {
    return null;
  }

  const renderFileItem = (file: FileItem) => (
    <div
      key={file.id}
      className={`flex items-center gap-3 p-3 rounded-lg border ${getStatusBgColor(file.status)} transition-all duration-200`}
    >
      {/* Preview o icono */}
      <div className="flex-shrink-0">
        {showPreview && file.preview ? (
          <img
            src={file.preview}
            alt={file.name}
            className="w-10 h-10 object-cover rounded"
          />
        ) : (
          getFileIcon(file.type)
        )}
      </div>

      {/* Info del archivo */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>
          {file.name}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{formatFileSize(file.size)}</span>
          {file.message && (
            <>
              <span>•</span>
              <span className={file.status === 'error' ? 'text-red-600' : file.status === 'warning' ? 'text-yellow-600' : ''}>
                {file.message}
              </span>
            </>
          )}
        </div>
        
        {/* Barra de progreso */}
        {file.status === 'processing' && file.progress !== undefined && (
          <div className="mt-1 w-full bg-gray-200 rounded-full h-1.5">
            <div
              className="bg-primary h-1.5 rounded-full transition-all duration-300"
              style={{ width: `${file.progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Estado y acciones */}
      <div className="flex items-center gap-2">
        {getStatusIcon(file.status)}
        
        {file.status === 'error' && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(file.id)}
            className="p-1 text-gray-400 hover:text-primary transition-colors"
            title="Reintentar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        )}
        
        {onRemove && (
          <button
            type="button"
            onClick={() => onRemove(file.id)}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
            title="Eliminar"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Resumen de estadísticas */}
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-600">
          {stats.total} archivo{stats.total !== 1 ? 's' : ''}
        </span>
        {stats.success > 0 && (
          <span className="text-green-600">
            {stats.success} procesado{stats.success !== 1 ? 's' : ''}
          </span>
        )}
        {stats.processing > 0 && (
          <span className="text-primary">
            {stats.processing} procesando
          </span>
        )}
        {stats.warnings > 0 && (
          <span className="text-yellow-600">
            {stats.warnings} con advertencias
          </span>
        )}
        {stats.errors > 0 && (
          <span className="text-red-600">
            {stats.errors} con errores
          </span>
        )}
      </div>

      {/* Archivos Excel */}
      {groupedFiles.excel.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Archivos Excel ({groupedFiles.excel.length})
          </h4>
          <div className="space-y-2">
            {groupedFiles.excel.map(renderFileItem)}
          </div>
        </div>
      )}

      {/* Imágenes con Grid y Paginación */}
      {groupedFiles.images.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">
              Fotografías ({groupedFiles.images.length})
            </h4>
            {paginatedImages.totalPages > 1 && (
              <span className="text-xs text-gray-500">
                Página {currentPage} de {paginatedImages.totalPages}
              </span>
            )}
          </div>
          
          {/* Grid compacto de imágenes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2">
            {paginatedImages.images.map((file) => (
              <div
                key={file.id}
                className={`relative group rounded-lg border ${getStatusBgColor(file.status)} overflow-hidden transition-all duration-200 hover:shadow-md`}
              >
                {/* Preview de imagen */}
                <div className="aspect-square bg-gray-100">
                  {showPreview && file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getFileIcon(file.type)}
                    </div>
                  )}
                </div>

                {/* Overlay con info y acciones */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex flex-col justify-between p-2 opacity-0 group-hover:opacity-100">
                  {/* Nombre del archivo */}
                  <div className="text-white text-xs font-medium truncate bg-black bg-opacity-50 rounded px-1">
                    {file.name}
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-1">
                    {file.status === 'error' && onRetry && (
                      <button
                        type="button"
                        onClick={() => onRetry(file.id)}
                        className="p-1.5 bg-white rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
                        title="Reintentar"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      </button>
                    )}
                    
                    {onRemove && (
                      <button
                        type="button"
                        onClick={() => onRemove(file.id)}
                        className="p-1.5 bg-white rounded-full text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {/* Badge de estado en la esquina */}
                <div className="absolute top-1 right-1">
                  {getStatusIcon(file.status)}
                </div>

                {/* Barra de progreso */}
                {file.status === 'processing' && file.progress !== undefined && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gray-200 h-1">
                    <div
                      className="bg-primary h-1 transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* Info adicional en la parte inferior */}
                <div className="p-1.5 bg-white bg-opacity-90">
                  <p className="text-xs text-gray-600 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatFileSize(file.size)}</span>
                    {file.message && (
                      <span className={`truncate ml-1 ${file.status === 'error' ? 'text-red-600' : file.status === 'warning' ? 'text-yellow-600' : ''}`} title={file.message}>
                        {file.message}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Controles de paginación */}
          {paginatedImages.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!paginatedImages.hasPrevious}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Anterior
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, paginatedImages.totalPages) }, (_, i) => {
                  let pageNum;
                  if (paginatedImages.totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= paginatedImages.totalPages - 2) {
                    pageNum = paginatedImages.totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                        currentPage === pageNum
                          ? 'bg-primary text-white'
                          : 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(paginatedImages.totalPages, p + 1))}
                disabled={!paginatedImages.hasMore}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Siguiente
              </button>
            </div>
          )}
        </div>
      )}

      {/* Otros archivos */}
      {groupedFiles.other.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Otros archivos ({groupedFiles.other.length})
          </h4>
          <div className="space-y-2">
            {groupedFiles.other.map(renderFileItem)}
          </div>
        </div>
      )}
    </div>
  );
}

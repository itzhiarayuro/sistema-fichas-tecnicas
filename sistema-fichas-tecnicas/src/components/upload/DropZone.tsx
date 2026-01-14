/**
 * DropZone Component - Zona de carga de archivos con feedback visual
 * Requirements: 1.1, 1.2
 * 
 * Estados visuales:
 * - idle: Estado inicial, esperando archivos
 * - dragover: Usuario arrastrando archivos sobre la zona
 * - uploading: Procesando archivos
 * - success: Carga completada exitosamente
 * - error: Error durante la carga
 */

'use client';

import { useCallback, useState } from 'react';
import { useDropzone, FileRejection, DropzoneOptions } from 'react-dropzone';

export type DropZoneStatus = 'idle' | 'dragover' | 'uploading' | 'success' | 'error';

export interface DropZoneFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  preview?: string;
}

export interface DropZoneProps {
  /** Tipos de archivo aceptados */
  accept?: DropzoneOptions['accept'];
  /** Tamaño máximo de archivo en bytes */
  maxSize?: number;
  /** Permitir múltiples archivos */
  multiple?: boolean;
  /** Callback cuando se aceptan archivos */
  onFilesAccepted?: (files: File[]) => void;
  /** Callback cuando se rechazan archivos */
  onFilesRejected?: (rejections: FileRejection[]) => void;
  /** Callback de progreso de carga */
  onProgress?: (progress: number) => void;
  /** Estado externo (para control desde el padre) */
  externalStatus?: DropZoneStatus;
  /** Mensaje de error externo */
  externalError?: string;
  /** Deshabilitar la zona de carga */
  disabled?: boolean;
  /** Clase CSS adicional */
  className?: string;
}

// Tipos de archivo aceptados por defecto
const DEFAULT_ACCEPT = {
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
};

// Tamaño máximo por defecto: 50MB
const DEFAULT_MAX_SIZE = 50 * 1024 * 1024;

/**
 * Genera un ID único para archivos
 */
function generateFileId(): string {
  return `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formatea el tamaño de archivo para mostrar
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Obtiene el mensaje de error legible para rechazos
 */
function getRejectMessage(rejection: FileRejection): string {
  const errors = rejection.errors;
  if (errors.some(e => e.code === 'file-too-large')) {
    return `Archivo muy grande (máx. ${formatFileSize(DEFAULT_MAX_SIZE)})`;
  }
  if (errors.some(e => e.code === 'file-invalid-type')) {
    return 'Tipo de archivo no soportado';
  }
  return 'Archivo no válido';
}

export function DropZone({
  accept = DEFAULT_ACCEPT,
  maxSize = DEFAULT_MAX_SIZE,
  multiple = true,
  onFilesAccepted,
  onFilesRejected,
  externalStatus,
  externalError,
  disabled = false,
  className = '',
}: DropZoneProps) {
  const [internalStatus, setInternalStatus] = useState<DropZoneStatus>('idle');
  const [rejectionMessages, setRejectionMessages] = useState<string[]>([]);

  // Usar estado externo si se proporciona, sino usar interno
  const status = externalStatus ?? internalStatus;

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: FileRejection[]) => {
      // Limpiar mensajes de rechazo anteriores
      setRejectionMessages([]);

      // Manejar archivos rechazados
      if (rejectedFiles.length > 0) {
        const messages = rejectedFiles.map(
          (r) => `${r.file.name}: ${getRejectMessage(r)}`
        );
        setRejectionMessages(messages);
        onFilesRejected?.(rejectedFiles);
        
        // Si no hay archivos aceptados, mostrar error
        if (acceptedFiles.length === 0) {
          setInternalStatus('error');
          return;
        }
      }

      // Manejar archivos aceptados
      if (acceptedFiles.length > 0) {
        setInternalStatus('uploading');
        onFilesAccepted?.(acceptedFiles);
      }
    },
    [onFilesAccepted, onFilesRejected]
  );

  const onDragEnter = useCallback(() => {
    if (!disabled) {
      setInternalStatus('dragover');
    }
  }, [disabled]);

  const onDragLeave = useCallback(() => {
    if (!disabled) {
      setInternalStatus('idle');
    }
  }, [disabled]);

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    onDragEnter,
    onDragLeave,
    accept,
    maxSize,
    multiple,
    disabled,
    noClick: false,
    noKeyboard: false,
  });

  // Resetear estado a idle
  const resetStatus = useCallback(() => {
    setInternalStatus('idle');
    setRejectionMessages([]);
  }, []);

  // Estilos según estado
  const getStatusStyles = (): string => {
    const baseStyles = 'border-2 border-dashed rounded-xl p-8 transition-all duration-200 ease-in-out';
    
    switch (status) {
      case 'dragover':
        return `${baseStyles} border-primary bg-primary/5 scale-[1.02]`;
      case 'uploading':
        return `${baseStyles} border-primary/50 bg-primary/5 cursor-wait`;
      case 'success':
        return `${baseStyles} border-green-500 bg-green-50`;
      case 'error':
        return `${baseStyles} border-red-500 bg-red-50`;
      default:
        return `${baseStyles} border-gray-300 bg-white hover:border-primary/50 hover:bg-gray-50 cursor-pointer`;
    }
  };

  // Icono según estado
  const getStatusIcon = () => {
    switch (status) {
      case 'dragover':
        return (
          <svg className="w-16 h-16 text-primary animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
      case 'uploading':
        return (
          <svg className="w-16 h-16 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        );
      case 'success':
        return (
          <svg className="w-16 h-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-16 h-16 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-16 h-16 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        );
    }
  };

  // Mensaje según estado
  const getStatusMessage = () => {
    switch (status) {
      case 'dragover':
        return (
          <p className="text-lg font-medium text-primary">
            Suelta los archivos aquí
          </p>
        );
      case 'uploading':
        return (
          <p className="text-lg font-medium text-primary">
            Procesando archivos...
          </p>
        );
      case 'success':
        return (
          <div className="text-center">
            <p className="text-lg font-medium text-green-600">
              ¡Archivos cargados exitosamente!
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetStatus();
              }}
              className="mt-2 text-sm text-primary hover:underline"
            >
              Cargar más archivos
            </button>
          </div>
        );
      case 'error':
        return (
          <div className="text-center">
            <p className="text-lg font-medium text-red-600">
              {externalError || 'Error al cargar archivos'}
            </p>
            {rejectionMessages.length > 0 && (
              <ul className="mt-2 text-sm text-red-500 space-y-1">
                {rejectionMessages.map((msg, i) => (
                  <li key={i}>{msg}</li>
                ))}
              </ul>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                resetStatus();
              }}
              className="mt-3 text-sm text-primary hover:underline"
            >
              Intentar de nuevo
            </button>
          </div>
        );
      default:
        return (
          <div className="text-center">
            <p className="text-lg font-medium text-gray-700">
              Arrastra archivos aquí
            </p>
            <p className="text-sm text-gray-500 mt-1">
              o haz clic para seleccionar
            </p>
          </div>
        );
    }
  };

  return (
    <div className={className}>
      <div
        {...getRootProps()}
        className={getStatusStyles()}
        role="button"
        tabIndex={0}
        aria-label="Zona de carga de archivos"
        aria-disabled={disabled}
      >
        <input {...getInputProps()} aria-label="Seleccionar archivos" />
        
        <div className="flex flex-col items-center justify-center min-h-[200px] space-y-4">
          {getStatusIcon()}
          {getStatusMessage()}
          
          {status === 'idle' && (
            <div className="mt-4 text-xs text-gray-400 text-center">
              <p>Archivos soportados: Excel (.xlsx, .xls), Imágenes (.jpg, .png)</p>
              <p>Tamaño máximo: {formatFileSize(maxSize)}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Exportar utilidades
export { formatFileSize, generateFileId };

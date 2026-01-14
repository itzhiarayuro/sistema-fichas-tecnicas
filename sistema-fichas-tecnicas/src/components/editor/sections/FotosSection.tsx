/**
 * FotosSection - Sección de fotografías del pozo
 * Requirements: 3.1, 3.3, 3.4
 * 
 * Muestra y permite gestionar las fotografías:
 * - Fotos principales (Panorámica, Tapa, Interna, etc.)
 * - Fotos de entradas
 * - Fotos de salidas
 * - Fotos de sumideros
 * - Soporte para drag & drop y reordenamiento
 * 
 * Utiliza ImageGrid para gestión de imágenes con drag & drop.
 */

'use client';

import { FichaSection } from './FichaSection';
import { ImageGrid } from '../ImageGrid';
import type { FotoInfo, TipoFoto } from '@/types/pozo';
import type { ImageSize } from '@/types/ficha';

export type FotoCategory = 'PRINCIPAL' | 'ENTRADA' | 'SALIDA' | 'SUMIDERO' | 'OTRO';

interface FotosSectionProps {
  /** ID de la sección */
  id: string;
  /** Fotos principales */
  principal: FotoInfo[];
  /** Fotos de entradas */
  entradas: FotoInfo[];
  /** Fotos de salidas */
  salidas: FotoInfo[];
  /** Fotos de sumideros */
  sumideros: FotoInfo[];
  /** Otras fotos */
  otras: FotoInfo[];
  /** Tamaños de imágenes por ID */
  imageSizes?: Map<string, ImageSize>;
  /** Si la sección está bloqueada */
  locked?: boolean;
  /** Si la sección está visible */
  visible?: boolean;
  /** Callback para agregar foto */
  onAddFoto?: (categoria: FotoCategory) => void;
  /** Callback para eliminar foto */
  onRemoveFoto?: (fotoId: string) => void;
  /** Callback para reordenar fotos */
  onReorderFotos?: (categoria: FotoCategory, fotos: FotoInfo[]) => void;
  /** Callback para cambiar tamaño de imagen */
  onResizeImage?: (imageId: string, size: ImageSize) => void;
  /** Callback para toggle de visibilidad */
  onToggleVisibility?: () => void;
  /** Props para drag handle */
  dragHandleProps?: Record<string, unknown>;
  /** Si está siendo arrastrada */
  isDragging?: boolean;
}

export function FotosSection({
  id,
  principal,
  entradas,
  salidas,
  sumideros,
  otras,
  imageSizes = new Map(),
  locked = false,
  visible = true,
  onAddFoto,
  onRemoveFoto,
  onReorderFotos,
  onResizeImage,
  onToggleVisibility,
  dragHandleProps,
  isDragging,
}: FotosSectionProps) {
  const totalFotos = principal.length + entradas.length + salidas.length + sumideros.length + otras.length;

  const icon = (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );

  return (
    <FichaSection
      id={id}
      type="fotos"
      title={`Fotografías (${totalFotos})`}
      icon={icon}
      locked={locked}
      visible={visible}
      isDragging={isDragging}
      draggable={!locked}
      onToggleVisibility={onToggleVisibility}
      dragHandleProps={dragHandleProps}
    >
      <div className="space-y-6">
        {/* Fotos principales */}
        <ImageGrid
          images={principal}
          imageSizes={imageSizes}
          editable={!locked}
          title="Principales"
          emptyMessage="No hay fotos principales"
          onReorder={(fotos) => onReorderFotos?.('PRINCIPAL', fotos)}
          onRemove={onRemoveFoto}
          onResize={onResizeImage}
          onAdd={() => onAddFoto?.('PRINCIPAL')}
        />

        {/* Fotos de entradas */}
        <ImageGrid
          images={entradas}
          imageSizes={imageSizes}
          editable={!locked}
          title="Entradas"
          emptyMessage="No hay fotos de entradas"
          onReorder={(fotos) => onReorderFotos?.('ENTRADA', fotos)}
          onRemove={onRemoveFoto}
          onResize={onResizeImage}
          onAdd={() => onAddFoto?.('ENTRADA')}
        />

        {/* Fotos de salidas */}
        <ImageGrid
          images={salidas}
          imageSizes={imageSizes}
          editable={!locked}
          title="Salidas"
          emptyMessage="No hay fotos de salidas"
          onReorder={(fotos) => onReorderFotos?.('SALIDA', fotos)}
          onRemove={onRemoveFoto}
          onResize={onResizeImage}
          onAdd={() => onAddFoto?.('SALIDA')}
        />

        {/* Fotos de sumideros */}
        <ImageGrid
          images={sumideros}
          imageSizes={imageSizes}
          editable={!locked}
          title="Sumideros"
          emptyMessage="No hay fotos de sumideros"
          onReorder={(fotos) => onReorderFotos?.('SUMIDERO', fotos)}
          onRemove={onRemoveFoto}
          onResize={onResizeImage}
          onAdd={() => onAddFoto?.('SUMIDERO')}
        />

        {/* Otras fotos */}
        {otras.length > 0 && (
          <ImageGrid
            images={otras}
            imageSizes={imageSizes}
            editable={!locked}
            title="Otras"
            emptyMessage="No hay otras fotos"
            onReorder={(fotos) => onReorderFotos?.('OTRO', fotos)}
            onRemove={onRemoveFoto}
            onResize={onResizeImage}
            onAdd={() => onAddFoto?.('OTRO')}
          />
        )}
      </div>
    </FichaSection>
  );
}

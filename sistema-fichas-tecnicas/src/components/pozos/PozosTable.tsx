/**
 * PozosTable - Tabla interactiva de pozos
 * Requirements: 2.1-2.3
 * 
 * Muestra todos los pozos cargados con:
 * - Ordenamiento por cualquier columna
 * - Filtrado por estado, sistema o búsqueda de texto
 * - Selección de pozos para vista previa
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { Pozo } from '@/types';
import { PozoStatusBadge, getPozoStatus } from './PozoStatusBadge';

type SortField = 'codigo' | 'direccion' | 'barrio' | 'sistema' | 'estado' | 'fecha';
type SortDirection = 'asc' | 'desc';

interface PozosTableProps {
  pozos: Pozo[];
  selectedPozoId: string | null;
  onSelectPozo: (pozoId: string) => void;
  onDoubleClickPozo?: (pozoId: string) => void;
}

interface FilterState {
  search: string;
  sistema: string;
  estado: string;
  completitud: string;
}

export function PozosTable({
  pozos,
  selectedPozoId,
  onSelectPozo,
  onDoubleClickPozo
}: PozosTableProps) {
  const [sortField, setSortField] = useState<SortField>('codigo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    sistema: '',
    estado: '',
    completitud: '',
  });

  // Get unique values for filter dropdowns
  const filterOptions = useMemo(() => {
    const sistemas = new Set<string>();
    const estados = new Set<string>();

    pozos.forEach((pozo) => {
      const sistema = String(pozo.sistema?.value || '');
      const estado = String(pozo.estado?.value || '');

      if (sistema) sistemas.add(sistema);
      if (estado) estados.add(estado);
    });

    return {
      sistemas: Array.from(sistemas).sort(),
      estados: Array.from(estados).sort(),
    };
  }, [pozos]);

  // Filter pozos
  const filteredPozos = useMemo(() => {
    return pozos.filter((pozo) => {
      const codigo = String(pozo.idPozo?.value || '').toLowerCase();
      const direccion = String(pozo.direccion?.value || '').toLowerCase();
      const barrio = String(pozo.barrio?.value || '').toLowerCase();
      const sistema = String(pozo.sistema?.value || '');
      const estado = String(pozo.estado?.value || '');

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          codigo.includes(searchLower) ||
          direccion.includes(searchLower) ||
          barrio.includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Sistema filter
      if (filters.sistema && sistema !== filters.sistema) {
        return false;
      }

      // Estado filter
      if (filters.estado && estado !== filters.estado) {
        return false;
      }

      // Completitud filter
      if (filters.completitud) {
        const status = getPozoStatus(pozo);
        if (filters.completitud !== status) return false;
      }

      return true;
    });
  }, [pozos, filters]);

  // Sort pozos
  const sortedPozos = useMemo(() => {
    return [...filteredPozos].sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      // Map sort fields to nested properties
      switch (sortField) {
        case 'codigo':
          aValue = a.idPozo?.value;
          bValue = b.idPozo?.value;
          break;
        case 'direccion':
          aValue = a.direccion?.value;
          bValue = b.direccion?.value;
          break;
        case 'barrio':
          aValue = a.barrio?.value;
          bValue = b.barrio?.value;
          break;
        case 'sistema':
          aValue = a.sistema?.value;
          bValue = b.sistema?.value;
          break;
        case 'estado':
          aValue = a.estado?.value;
          bValue = b.estado?.value;
          break;
        case 'fecha':
          aValue = a.fecha?.value;
          bValue = b.fecha?.value;
          break;
        default:
          aValue = '';
          bValue = '';
      }

      aValue = String(aValue || '');
      bValue = String(bValue || '');

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPozos, sortField, sortDirection]);

  // Handle sort
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      sistema: '',
      estado: '',
      completitud: '',
    });
  }, []);

  const hasActiveFilters = filters.search || filters.sistema || filters.estado || filters.completitud;

  // Sort indicator component
  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return (
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    ) : (
      <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Filters */}
      <div className="bg-white border-b border-gray-200 p-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por código, dirección o barrio..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Filter dropdowns */}
        <div className="flex flex-wrap gap-3">
          <select
            value={filters.sistema}
            onChange={(e) => handleFilterChange('sistema', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
          >
            <option value="">Todos los sistemas</option>
            {filterOptions.sistemas.map((sistema) => (
              <option key={sistema} value={sistema}>{sistema}</option>
            ))}
          </select>

          <select
            value={filters.estado}
            onChange={(e) => handleFilterChange('estado', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
          >
            <option value="">Todos los estados</option>
            {filterOptions.estados.map((estado) => (
              <option key={estado} value={estado}>{estado}</option>
            ))}
          </select>

          <select
            value={filters.completitud}
            onChange={(e) => handleFilterChange('completitud', e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors bg-white"
          >
            <option value="">Todos los niveles</option>
            <option value="complete">Completos</option>
            <option value="incomplete">Incompletos</option>
            <option value="warning">Con advertencias</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Results count */}
        <div className="text-sm text-gray-500">
          Mostrando {sortedPozos.length} de {pozos.length} pozos
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('codigo')}
                  className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary transition-colors"
                >
                  Código
                  <SortIndicator field="codigo" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('direccion')}
                  className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary transition-colors"
                >
                  Dirección
                  <SortIndicator field="direccion" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('barrio')}
                  className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary transition-colors"
                >
                  Barrio
                  <SortIndicator field="barrio" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('sistema')}
                  className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary transition-colors"
                >
                  Sistema
                  <SortIndicator field="sistema" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                <button
                  onClick={() => handleSort('estado')}
                  className="flex items-center gap-1 font-semibold text-gray-700 hover:text-primary transition-colors"
                >
                  Estado
                  <SortIndicator field="estado" />
                </button>
              </th>
              <th className="px-4 py-3 text-left">
                Completitud
              </th>
              <th className="px-4 py-3 text-left">
                Fotos
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedPozos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                  {pozos.length === 0 ? (
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                      <p>No hay pozos cargados</p>
                      <p className="text-sm">Carga un archivo Excel para comenzar</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p>No se encontraron pozos</p>
                      <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              sortedPozos.map((pozo) => {
                const fotosCount = countFotos(pozo);
                const isSelected = selectedPozoId === pozo.id;

                return (
                  <tr
                    key={pozo.id}
                    onClick={() => onSelectPozo(pozo.id)}
                    onDoubleClick={() => onDoubleClickPozo?.(pozo.id)}
                    className={`
                      cursor-pointer transition-colors
                      ${isSelected
                        ? 'bg-primary-50 hover:bg-primary-100'
                        : 'hover:bg-gray-50'
                      }
                    `}
                  >
                    <td className="px-4 py-3">
                      <span className={`font-medium ${isSelected ? 'text-primary' : 'text-gray-900'}`}>
                        {String(pozo.idPozo?.value || '')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {String(pozo.direccion?.value || '') || <span className="text-gray-400 italic">Sin dirección</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {String(pozo.barrio?.value || '') || <span className="text-gray-400 italic">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {String(pozo.sistema?.value || '') || <span className="text-gray-400 italic">-</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {String(pozo.estado?.value || '') || <span className="text-gray-400 italic">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      <PozoStatusBadge pozo={pozo} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`
                        inline-flex items-center gap-1 text-sm
                        ${fotosCount > 0 ? 'text-gray-700' : 'text-gray-400'}
                      `}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {fotosCount}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Helper function to count photos
function countFotos(pozo: Pozo): number {
  const { fotos } = pozo;
  return fotos.fotos?.length || 0;
}

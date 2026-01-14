/**
 * ExcelFormatGuide - Tests
 * Verifica que la descarga de plantilla funciona correctamente
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExcelFormatGuide } from './ExcelFormatGuide';

// Mock de xlsx
vi.mock('xlsx', () => ({
  utils: {
    book_new: vi.fn(() => ({ SheetNames: [], Sheets: {} })),
    json_to_sheet: vi.fn((data) => ({ data })),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

describe('ExcelFormatGuide', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('debe renderizar el componente correctamente', () => {
    render(<ExcelFormatGuide />);
    
    expect(screen.getByText('Formato del archivo Excel')).toBeTruthy();
    expect(screen.getByText('Ver columnas esperadas y descargar plantilla')).toBeTruthy();
  });

  it('debe expandir el contenido al hacer clic', () => {
    render(<ExcelFormatGuide />);
    
    const button = screen.getByRole('button', { name: /Formato del archivo Excel/i });
    
    // Inicialmente contraído
    expect(screen.queryByText('Columnas disponibles')).toBeNull();
    
    // Expandir
    fireEvent.click(button);
    expect(screen.getByText('Columnas disponibles')).toBeTruthy();
  });

  it('debe mostrar el botón de descarga cuando está expandido', () => {
    render(<ExcelFormatGuide />);
    
    const button = screen.getByRole('button', { name: /Formato del archivo Excel/i });
    fireEvent.click(button);
    
    expect(screen.getByRole('button', { name: /Descargar plantilla Excel/i })).toBeTruthy();
  });

  it('debe mostrar la tabla de columnas disponibles', () => {
    render(<ExcelFormatGuide />);
    
    const button = screen.getByRole('button', { name: /Formato del archivo Excel/i });
    fireEvent.click(button);
    
    // Verificar que la tabla está presente
    expect(screen.getByText('Columnas disponibles')).toBeTruthy();
    expect(screen.getByText('Código único del pozo')).toBeTruthy();
  });

  it('debe mostrar notas importantes', () => {
    render(<ExcelFormatGuide />);
    
    const button = screen.getByRole('button', { name: /Formato del archivo Excel/i });
    fireEvent.click(button);
    
    expect(screen.getByText('Notas importantes')).toBeTruthy();
  });
});

/**
 * CustomizationPanel - Panel de personalización de formato
 * Requirements: 6.1-6.3, 16.8, 16.9, 18.2
 * 
 * Permite personalizar:
 * - Colores de encabezados y secciones
 * - Tamaños de fuente para títulos, etiquetas y valores
 * - Espaciado entre secciones y campos
 * 
 * Diferencia entre cambios locales (solo esta ficha) y globales (plantilla).
 */

'use client';

import { useState, useCallback } from 'react';
import type { ColorScheme, FontScheme, SpacingScheme, FichaCustomization } from '@/types/ficha';

interface CustomizationPanelProps {
  /** Personalizaciones actuales */
  customizations: FichaCustomization;
  /** Callback cuando cambian las personalizaciones */
  onCustomizationsChange: (customizations: Partial<FichaCustomization>) => void;
  /** Si el panel está colapsado */
  collapsed?: boolean;
  /** Callback para colapsar/expandir */
  onToggleCollapse?: () => void;
  /** Si está en modo solo lectura */
  readOnly?: boolean;
}

// Colores predefinidos para selección rápida
const PRESET_COLORS = [
  { name: 'Azul Corporativo', value: '#1F4E79' },
  { name: 'Verde Ambiental', value: '#2E7D32' },
  { name: 'Gris Oscuro', value: '#374151' },
  { name: 'Azul Marino', value: '#1E3A5F' },
  { name: 'Verde Oscuro', value: '#166534' },
  { name: 'Rojo Corporativo', value: '#991B1B' },
];

// Fuentes disponibles
const FONT_FAMILIES = [
  { name: 'Inter', value: 'Inter' },
  { name: 'Arial', value: 'Arial' },
  { name: 'Helvetica', value: 'Helvetica' },
  { name: 'Times New Roman', value: 'Times New Roman' },
  { name: 'Georgia', value: 'Georgia' },
];

// Tamaños de fuente predefinidos
const FONT_SIZES = [8, 10, 11, 12, 14, 16, 18, 20, 24];

// Valores de espaciado predefinidos
const SPACING_VALUES = [4, 8, 12, 16, 20, 24, 32];

export function CustomizationPanel({
  customizations,
  onCustomizationsChange,
  collapsed = false,
  onToggleCollapse,
  readOnly = false,
}: CustomizationPanelProps) {
  const [activeTab, setActiveTab] = useState<'colors' | 'fonts' | 'spacing'>('colors');

  // Handlers para cambios de colores
  const handleColorChange = useCallback((key: keyof ColorScheme, value: string) => {
    if (readOnly) return;
    onCustomizationsChange({
      colors: {
        ...customizations.colors,
        [key]: value,
      },
    });
  }, [customizations.colors, onCustomizationsChange, readOnly]);

  // Handlers para cambios de fuentes
  const handleFontChange = useCallback((key: keyof FontScheme, value: string | number) => {
    if (readOnly) return;
    onCustomizationsChange({
      fonts: {
        ...customizations.fonts,
        [key]: value,
      },
    });
  }, [customizations.fonts, onCustomizationsChange, readOnly]);

  // Handlers para cambios de espaciado
  const handleSpacingChange = useCallback((key: keyof SpacingScheme, value: number) => {
    if (readOnly) return;
    onCustomizationsChange({
      spacing: {
        ...customizations.spacing,
        [key]: value,
      },
    });
  }, [customizations.spacing, onCustomizationsChange, readOnly]);

  // Handler para cambiar scope (local vs global)
  const handleScopeChange = useCallback((isGlobal: boolean) => {
    if (readOnly) return;
    onCustomizationsChange({ isGlobal });
  }, [onCustomizationsChange, readOnly]);

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-gray-50 transition-colors"
        title="Abrir panel de personalización"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
        <span className="text-sm font-medium text-gray-700">Personalizar</span>
      </button>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          Personalización
        </h3>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Cerrar panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Scope indicator - Requirements 16.8, 16.9, 18.2 */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center justify-between">
          <span className="text-xs text-blue-700">
            {customizations.isGlobal 
              ? '🌐 Cambios se aplicarán a futuras fichas'
              : '📄 Cambios solo afectan esta ficha'
            }
          </span>
          <button
            onClick={() => handleScopeChange(!customizations.isGlobal)}
            disabled={readOnly}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              readOnly 
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-blue-600 hover:bg-blue-100'
            }`}
          >
            {customizations.isGlobal ? 'Hacer local' : 'Aplicar como plantilla'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <TabButton
          active={activeTab === 'colors'}
          onClick={() => setActiveTab('colors')}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
          }
          label="Colores"
        />
        <TabButton
          active={activeTab === 'fonts'}
          onClick={() => setActiveTab('fonts')}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h8m-8 6h16" />
            </svg>
          }
          label="Fuentes"
        />
        <TabButton
          active={activeTab === 'spacing'}
          onClick={() => setActiveTab('spacing')}
          icon={
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          }
          label="Espaciado"
        />
      </div>

      {/* Tab content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {activeTab === 'colors' && (
          <ColorsTab
            colors={customizations.colors}
            onChange={handleColorChange}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'fonts' && (
          <FontsTab
            fonts={customizations.fonts}
            onChange={handleFontChange}
            readOnly={readOnly}
          />
        )}
        {activeTab === 'spacing' && (
          <SpacingTab
            spacing={customizations.spacing}
            onChange={handleSpacingChange}
            readOnly={readOnly}
          />
        )}
      </div>
    </div>
  );
}


// Tab button component
interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors ${
        active
          ? 'text-primary border-b-2 border-primary bg-primary/5'
          : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// Colors tab component
interface ColorsTabProps {
  colors: ColorScheme;
  onChange: (key: keyof ColorScheme, value: string) => void;
  readOnly: boolean;
}

function ColorsTab({ colors, onChange, readOnly }: ColorsTabProps) {
  return (
    <div className="space-y-4">
      {/* Preset colors */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Colores predefinidos
        </label>
        <div className="flex flex-wrap gap-2">
          {PRESET_COLORS.map((preset) => (
            <button
              key={preset.value}
              onClick={() => onChange('headerBg', preset.value)}
              disabled={readOnly}
              className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                colors.headerBg === preset.value ? 'border-gray-800 ring-2 ring-offset-2 ring-primary' : 'border-gray-200'
              } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
              style={{ backgroundColor: preset.value }}
              title={preset.name}
            />
          ))}
        </div>
      </div>

      {/* Individual color pickers */}
      <ColorPicker
        label="Fondo de encabezado"
        value={colors.headerBg}
        onChange={(v) => onChange('headerBg', v)}
        readOnly={readOnly}
      />
      <ColorPicker
        label="Texto de encabezado"
        value={colors.headerText}
        onChange={(v) => onChange('headerText', v)}
        readOnly={readOnly}
      />
      <ColorPicker
        label="Fondo de sección"
        value={colors.sectionBg}
        onChange={(v) => onChange('sectionBg', v)}
        readOnly={readOnly}
      />
      <ColorPicker
        label="Texto de sección"
        value={colors.sectionText}
        onChange={(v) => onChange('sectionText', v)}
        readOnly={readOnly}
      />
      <ColorPicker
        label="Texto de etiquetas"
        value={colors.labelText}
        onChange={(v) => onChange('labelText', v)}
        readOnly={readOnly}
      />
      <ColorPicker
        label="Texto de valores"
        value={colors.valueText}
        onChange={(v) => onChange('valueText', v)}
        readOnly={readOnly}
      />
      <ColorPicker
        label="Color de bordes"
        value={colors.borderColor}
        onChange={(v) => onChange('borderColor', v)}
        readOnly={readOnly}
      />
    </div>
  );
}

// Color picker component
interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  readOnly: boolean;
}

function ColorPicker({ label, value, onChange, readOnly }: ColorPickerProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={`w-8 h-8 rounded border border-gray-200 cursor-pointer ${
            readOnly ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          className={`w-20 px-2 py-1 text-xs font-mono border border-gray-200 rounded ${
            readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        />
      </div>
    </div>
  );
}

// Fonts tab component
interface FontsTabProps {
  fonts: FontScheme;
  onChange: (key: keyof FontScheme, value: string | number) => void;
  readOnly: boolean;
}

function FontsTab({ fonts, onChange, readOnly }: FontsTabProps) {
  return (
    <div className="space-y-4">
      {/* Font family */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-2">
          Familia de fuente
        </label>
        <select
          value={fonts.fontFamily}
          onChange={(e) => onChange('fontFamily', e.target.value)}
          disabled={readOnly}
          className={`w-full px-3 py-2 border border-gray-200 rounded-lg text-sm ${
            readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        >
          {FONT_FAMILIES.map((font) => (
            <option key={font.value} value={font.value}>
              {font.name}
            </option>
          ))}
        </select>
      </div>

      {/* Font sizes */}
      <FontSizeSelector
        label="Tamaño de títulos"
        value={fonts.titleSize}
        onChange={(v) => onChange('titleSize', v)}
        readOnly={readOnly}
      />
      <FontSizeSelector
        label="Tamaño de etiquetas"
        value={fonts.labelSize}
        onChange={(v) => onChange('labelSize', v)}
        readOnly={readOnly}
      />
      <FontSizeSelector
        label="Tamaño de valores"
        value={fonts.valueSize}
        onChange={(v) => onChange('valueSize', v)}
        readOnly={readOnly}
      />

      {/* Preview */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
        <p style={{ fontFamily: fonts.fontFamily, fontSize: `${fonts.titleSize}px` }} className="font-semibold text-gray-800">
          Título de ejemplo
        </p>
        <p style={{ fontFamily: fonts.fontFamily, fontSize: `${fonts.labelSize}px` }} className="text-gray-600">
          Etiqueta de ejemplo
        </p>
        <p style={{ fontFamily: fonts.fontFamily, fontSize: `${fonts.valueSize}px` }} className="text-gray-800">
          Valor de ejemplo
        </p>
      </div>
    </div>
  );
}

// Font size selector component
interface FontSizeSelectorProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  readOnly: boolean;
}

function FontSizeSelector({ label, value, onChange, readOnly }: FontSizeSelectorProps) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-600">{label}</label>
      <div className="flex items-center gap-2">
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={readOnly}
          className={`px-2 py-1 border border-gray-200 rounded text-sm ${
            readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}px
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

// Spacing tab component
interface SpacingTabProps {
  spacing: SpacingScheme;
  onChange: (key: keyof SpacingScheme, value: number) => void;
  readOnly: boolean;
}

function SpacingTab({ spacing, onChange, readOnly }: SpacingTabProps) {
  return (
    <div className="space-y-4">
      <SpacingSlider
        label="Espacio entre secciones"
        value={spacing.sectionGap}
        onChange={(v) => onChange('sectionGap', v)}
        readOnly={readOnly}
      />
      <SpacingSlider
        label="Espacio entre campos"
        value={spacing.fieldGap}
        onChange={(v) => onChange('fieldGap', v)}
        readOnly={readOnly}
      />
      <SpacingSlider
        label="Padding interno"
        value={spacing.padding}
        onChange={(v) => onChange('padding', v)}
        readOnly={readOnly}
      />
      <SpacingSlider
        label="Margen externo"
        value={spacing.margin}
        onChange={(v) => onChange('margin', v)}
        readOnly={readOnly}
      />

      {/* Visual preview */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-xs text-gray-500 mb-2">Vista previa de espaciado:</p>
        <div 
          className="bg-white border border-gray-300 rounded"
          style={{ margin: `${spacing.margin / 4}px`, padding: `${spacing.padding / 2}px` }}
        >
          <div 
            className="bg-primary/10 rounded p-2 mb-1"
            style={{ marginBottom: `${spacing.sectionGap / 2}px` }}
          >
            <div className="text-xs text-gray-600">Sección 1</div>
          </div>
          <div className="bg-primary/10 rounded p-2">
            <div 
              className="text-xs text-gray-600"
              style={{ marginBottom: `${spacing.fieldGap / 2}px` }}
            >
              Campo 1
            </div>
            <div className="text-xs text-gray-600">Campo 2</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Spacing slider component
interface SpacingSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  readOnly: boolean;
}

function SpacingSlider({ label, value, onChange, readOnly }: SpacingSliderProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-sm text-gray-600">{label}</label>
        <span className="text-xs text-gray-500">{value}px</span>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="range"
          min={SPACING_VALUES[0]}
          max={SPACING_VALUES[SPACING_VALUES.length - 1]}
          step={4}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={readOnly}
          className={`flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer ${
            readOnly ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
        <select
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          disabled={readOnly}
          className={`w-16 px-1 py-1 border border-gray-200 rounded text-xs ${
            readOnly ? 'bg-gray-100 cursor-not-allowed' : ''
          }`}
        >
          {SPACING_VALUES.map((v) => (
            <option key={v} value={v}>
              {v}px
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

export default CustomizationPanel;

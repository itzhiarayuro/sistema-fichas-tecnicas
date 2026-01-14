/**
 * TemplateSelector - Selector de plantillas predefinidas
 * Requirements: 6.4, 6.5
 * 
 * Permite seleccionar entre plantillas predefinidas para aplicar
 * estilos consistentes a las fichas técnicas.
 * 
 * Las plantillas incluyen configuraciones de colores, fuentes y espaciado.
 */

'use client';

import { useState, useCallback } from 'react';
import { useGlobalStore, type Template } from '@/stores/globalStore';
import type { FichaCustomization } from '@/types/ficha';

interface TemplateSelectorProps {
  /** Plantilla actualmente seleccionada */
  currentTemplate: string;
  /** Callback cuando se selecciona una plantilla */
  onTemplateSelect: (template: Template) => void;
  /** Si está en modo solo lectura */
  readOnly?: boolean;
  /** Mostrar como dropdown o grid */
  variant?: 'dropdown' | 'grid';
}

// Plantillas predefinidas adicionales (además de las del store)
const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: 'standard',
    name: 'Estándar',
    description: 'Plantilla estándar con colores corporativos azules',
    isDefault: true,
    customizations: {
      colors: {
        headerBg: '#1F4E79',
        headerText: '#FFFFFF',
        sectionBg: '#FFFFFF',
        sectionText: '#333333',
      },
      fonts: {
        titleSize: 16,
        labelSize: 12,
        valueSize: 12,
        fontFamily: 'Inter',
      },
    },
  },
  {
    id: 'compact',
    name: 'Compacta',
    description: 'Diseño compacto con menos espaciado, ideal para impresión',
    isDefault: false,
    customizations: {
      colors: {
        headerBg: '#374151',
        headerText: '#FFFFFF',
        sectionBg: '#F9FAFB',
        sectionText: '#1F2937',
      },
      fonts: {
        titleSize: 14,
        labelSize: 10,
        valueSize: 10,
        fontFamily: 'Arial',
      },
    },
  },
  {
    id: 'environmental',
    name: 'Ambiental',
    description: 'Colores verdes para proyectos ambientales',
    isDefault: false,
    customizations: {
      colors: {
        headerBg: '#2E7D32',
        headerText: '#FFFFFF',
        sectionBg: '#F1F8E9',
        sectionText: '#33691E',
      },
      fonts: {
        titleSize: 16,
        labelSize: 12,
        valueSize: 12,
        fontFamily: 'Inter',
      },
    },
  },
  {
    id: 'professional',
    name: 'Profesional',
    description: 'Diseño elegante con tonos oscuros',
    isDefault: false,
    customizations: {
      colors: {
        headerBg: '#1E3A5F',
        headerText: '#FFFFFF',
        sectionBg: '#FFFFFF',
        sectionText: '#1E3A5F',
      },
      fonts: {
        titleSize: 16,
        labelSize: 11,
        valueSize: 12,
        fontFamily: 'Georgia',
      },
    },
  },
  {
    id: 'high-contrast',
    name: 'Alto Contraste',
    description: 'Máximo contraste para mejor legibilidad',
    isDefault: false,
    customizations: {
      colors: {
        headerBg: '#000000',
        headerText: '#FFFFFF',
        sectionBg: '#FFFFFF',
        sectionText: '#000000',
      },
      fonts: {
        titleSize: 18,
        labelSize: 13,
        valueSize: 13,
        fontFamily: 'Arial',
      },
    },
  },
];

export function TemplateSelector({
  currentTemplate,
  onTemplateSelect,
  readOnly = false,
  variant = 'grid',
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const storeTemplates = useGlobalStore((state) => state.templates);
  
  // Combinar plantillas del store con las built-in
  const allTemplates = [...BUILT_IN_TEMPLATES];
  storeTemplates.forEach((t) => {
    if (!allTemplates.find((bt) => bt.id === t.id)) {
      allTemplates.push(t);
    }
  });

  const selectedTemplate = allTemplates.find((t) => t.id === currentTemplate) || allTemplates[0];

  const handleSelect = useCallback((template: Template) => {
    if (readOnly) return;
    onTemplateSelect(template);
    setIsOpen(false);
  }, [onTemplateSelect, readOnly]);

  if (variant === 'dropdown') {
    return (
      <div className="relative">
        <button
          onClick={() => !readOnly && setIsOpen(!isOpen)}
          disabled={readOnly}
          className={`w-full flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm ${
            readOnly ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <TemplatePreviewMini template={selectedTemplate} />
            <span className="font-medium text-gray-700">{selectedTemplate.name}</span>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
            {allTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelect(template)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                  template.id === currentTemplate ? 'bg-primary/5' : ''
                }`}
              >
                <TemplatePreviewMini template={template} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 text-sm">{template.name}</span>
                    {template.isDefault && (
                      <span className="px-1.5 py-0.5 text-xs bg-primary/10 text-primary rounded">
                        Por defecto
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">{template.description}</p>
                </div>
                {template.id === currentTemplate && (
                  <svg className="w-4 h-4 text-primary flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Grid variant
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Seleccionar plantilla
      </label>
      <div className="grid grid-cols-2 gap-3">
        {allTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            isSelected={template.id === currentTemplate}
            onSelect={() => handleSelect(template)}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

// Mini preview for dropdown
interface TemplatePreviewMiniProps {
  template: Template;
}

function TemplatePreviewMini({ template }: TemplatePreviewMiniProps) {
  const { colors } = template.customizations;
  return (
    <div className="w-8 h-8 rounded border border-gray-200 overflow-hidden flex-shrink-0">
      <div 
        className="h-2"
        style={{ backgroundColor: colors.headerBg }}
      />
      <div 
        className="h-6 flex items-center justify-center"
        style={{ backgroundColor: colors.sectionBg }}
      >
        <div 
          className="w-4 h-1 rounded"
          style={{ backgroundColor: colors.sectionText }}
        />
      </div>
    </div>
  );
}

// Template card for grid view
interface TemplateCardProps {
  template: Template;
  isSelected: boolean;
  onSelect: () => void;
  readOnly: boolean;
}

function TemplateCard({ template, isSelected, onSelect, readOnly }: TemplateCardProps) {
  const { colors, fonts } = template.customizations;
  
  return (
    <button
      onClick={onSelect}
      disabled={readOnly}
      className={`relative p-3 rounded-lg border-2 transition-all text-left ${
        isSelected
          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
          : 'border-gray-200 hover:border-gray-300'
      } ${readOnly ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <svg className="w-5 h-5 text-primary" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
      )}

      {/* Template preview */}
      <div className="mb-2 rounded border border-gray-200 overflow-hidden">
        {/* Header preview */}
        <div 
          className="px-2 py-1"
          style={{ backgroundColor: colors.headerBg }}
        >
          <div 
            className="text-xs font-medium truncate"
            style={{ 
              color: colors.headerText,
              fontSize: `${Math.max(8, fonts.titleSize - 6)}px`,
              fontFamily: fonts.fontFamily,
            }}
          >
            Encabezado
          </div>
        </div>
        {/* Content preview */}
        <div 
          className="px-2 py-2 space-y-1"
          style={{ backgroundColor: colors.sectionBg }}
        >
          <div className="flex items-center gap-1">
            <span 
              className="text-xs"
              style={{ 
                color: colors.sectionText,
                fontSize: `${Math.max(7, fonts.labelSize - 4)}px`,
                fontFamily: fonts.fontFamily,
              }}
            >
              Etiqueta:
            </span>
            <span 
              className="text-xs"
              style={{ 
                color: colors.sectionText,
                fontSize: `${Math.max(7, fonts.valueSize - 4)}px`,
                fontFamily: fonts.fontFamily,
              }}
            >
              Valor
            </span>
          </div>
          <div 
            className="h-1 w-3/4 rounded"
            style={{ backgroundColor: colors.sectionText, opacity: 0.2 }}
          />
        </div>
      </div>

      {/* Template info */}
      <div className="flex items-center gap-1 mb-1">
        <span className="text-sm font-medium text-gray-800">{template.name}</span>
        {template.isDefault && (
          <span className="px-1 py-0.5 text-[10px] bg-primary/10 text-primary rounded">
            Default
          </span>
        )}
      </div>
      <p className="text-xs text-gray-500 line-clamp-2">{template.description}</p>
    </button>
  );
}

// Helper to convert Template to FichaCustomization
export function templateToCustomization(template: Template): Partial<FichaCustomization> {
  return {
    colors: {
      headerBg: template.customizations.colors.headerBg,
      headerText: template.customizations.colors.headerText,
      sectionBg: template.customizations.colors.sectionBg,
      sectionText: template.customizations.colors.sectionText,
      labelText: template.customizations.colors.sectionText, // Use section text as default
      valueText: template.customizations.colors.sectionText,
      borderColor: '#E5E7EB',
    },
    fonts: {
      titleSize: template.customizations.fonts.titleSize,
      labelSize: template.customizations.fonts.labelSize,
      valueSize: template.customizations.fonts.valueSize,
      fontFamily: template.customizations.fonts.fontFamily,
    },
    template: template.id,
  };
}

export default TemplateSelector;

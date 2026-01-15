/**
 * SelectEditor - Editor de selección inline con trazabilidad
 * Requirements: 3.2, 5.1-5.4
 * 
 * Similar a TextEditor pero utiliza un dropdown (select) para
 * restringir los valores permitidos según reglas de negocio.
 */

'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { FieldValue, FieldSource } from '@/types/ficha';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectEditorProps {
    /** Valor del campo con trazabilidad */
    fieldValue: FieldValue;
    /** Etiqueta del campo */
    label?: string;
    /** Opciones del dropdown */
    options: SelectOption[] | string[];
    /** Placeholder cuando está vacío */
    placeholder?: string;
    /** Si el campo es editable */
    editable?: boolean;
    /** Callback cuando cambia el valor */
    onChange?: (value: string) => void;
    /** Callback cuando se confirma el cambio (blur o Enter) */
    onCommit?: (value: string) => void;
    /** Clase CSS adicional */
    className?: string;
    /** Si mostrar el indicador de fuente */
    showSource?: boolean;
    /** Si mostrar el tooltip de trazabilidad */
    showTraceability?: boolean;
    /** Tamaño del texto */
    size?: 'sm' | 'md' | 'lg';
    /** Variante de estilo */
    variant?: 'default' | 'minimal' | 'bordered';
}

const sourceConfig: Record<FieldSource, { label: string; bgColor: string; textColor: string; borderColor: string }> = {
    excel: {
        label: 'Excel',
        bgColor: 'bg-blue-50',
        textColor: 'text-blue-700',
        borderColor: 'border-blue-200',
    },
    manual: {
        label: 'Editado',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-700',
        borderColor: 'border-yellow-200',
    },
    default: {
        label: 'Por defecto',
        bgColor: 'bg-gray-50',
        textColor: 'text-gray-600',
        borderColor: 'border-gray-200',
    },
};

const sizeConfig = {
    sm: 'text-sm px-2 py-1',
    md: 'text-sm px-3 py-2',
    lg: 'text-base px-4 py-3',
};

export function SelectEditor({
    fieldValue,
    label,
    options,
    placeholder = 'Seleccionar...',
    editable = true,
    onChange,
    onCommit,
    className = '',
    showSource = true,
    showTraceability = true,
    size = 'md',
    variant = 'default',
}: SelectEditorProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [localValue, setLocalValue] = useState(fieldValue.value);
    const [showTooltip, setShowTooltip] = useState(false);
    const selectRef = useRef<HTMLSelectElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Normalizar opciones
    const normalizedOptions: SelectOption[] = options.map(opt =>
        typeof opt === 'string' ? { value: opt, label: opt } : opt
    );

    // Sync local value with prop
    useEffect(() => {
        if (!isEditing) {
            setLocalValue(fieldValue.value);
        }
    }, [fieldValue.value, isEditing]);

    // Focus select when entering edit mode
    useEffect(() => {
        if (isEditing && selectRef.current) {
            selectRef.current.focus();
        }
    }, [isEditing]);

    const handleClick = useCallback(() => {
        if (editable && !isEditing) {
            setIsEditing(true);
        }
    }, [editable, isEditing]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        const newValue = e.target.value;
        setLocalValue(newValue);
        onChange?.(newValue);
        // En el caso de select, confirmamos inmediatamente al cambiar
        setIsEditing(false);
        onCommit?.(newValue);
    }, [onChange, onCommit]);

    const handleBlur = useCallback(() => {
        setIsEditing(false);
    }, []);

    const sourceStyle = sourceConfig[fieldValue.source];
    const hasBeenModified = fieldValue.source === 'manual' && fieldValue.originalValue !== undefined;
    const isValueEmpty = !fieldValue.value || fieldValue.value.trim() === '';

    const formatTimestamp = (timestamp?: number) => {
        if (!timestamp) return null;
        return new Date(timestamp).toLocaleString('es-ES', {
            dateStyle: 'short',
            timeStyle: 'short',
        });
    };

    const getVariantStyles = () => {
        switch (variant) {
            case 'minimal':
                return 'border-transparent hover:border-gray-200 focus-within:border-primary';
            case 'bordered':
                return `border ${sourceStyle.borderColor}`;
            default:
                return `border ${sourceStyle.borderColor} ${sourceStyle.bgColor}`;
        }
    };

    // Encontrar el label para el valor actual
    const currentLabel = normalizedOptions.find(opt => opt.value === fieldValue.value)?.label || fieldValue.value;

    return (
        <div className={`group relative ${className}`} ref={containerRef}>
            {/* Label */}
            {label && (
                <label className="block text-xs font-medium text-gray-500 mb-1">
                    {label}
                    {hasBeenModified && (
                        <span className="ml-1 text-yellow-600" title="Campo modificado">
                            •
                        </span>
                    )}
                </label>
            )}

            {/* Editor container */}
            <div
                className={`relative rounded-md transition-all ${getVariantStyles()} ${isEditing ? 'ring-2 ring-primary/30 border-primary' : ''
                    } ${editable ? 'cursor-pointer' : 'cursor-default'}`}
                onClick={handleClick}
                onMouseEnter={() => showTraceability && setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
            >
                {isEditing ? (
                    // Edit mode (Select)
                    <select
                        ref={selectRef}
                        value={localValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        className={`w-full bg-transparent border-none outline-none appearance-none cursor-pointer ${sizeConfig[size]}`}
                    >
                        <option value="">{placeholder}</option>
                        {normalizedOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                ) : (
                    // Display mode
                    <div className={`flex items-center justify-between ${sizeConfig[size]} ${isValueEmpty ? 'text-gray-400 italic' : ''}`}>
                        <span className="truncate">{isValueEmpty ? placeholder : currentLabel}</span>
                        {editable && (
                            <svg className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        )}
                    </div>
                )}

                {/* Source indicator badge */}
                {showSource && !isEditing && (
                    <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${sourceStyle.bgColor} ${sourceStyle.textColor}`}>
                            {sourceStyle.label}
                        </span>
                    </div>
                )}
            </div>

            {/* Traceability tooltip (mismo que TextEditor) */}
            {showTraceability && showTooltip && !isEditing && (
                <div className="absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-3 p-4 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-2xl text-xs min-w-[240px] animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-100">
                        <div className={`w-2 h-2 rounded-full ${sourceStyle.bgColor.replace('bg-', 'bg-')}`} />
                        <div className="font-bold text-gray-800 tracking-tight">Trazabilidad del Dato</div>
                    </div>

                    <div className="space-y-2.5">
                        <div className="flex justify-between items-center text-[11px]">
                            <span className="text-gray-400 font-medium">Fuente:</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${sourceStyle.bgColor} ${sourceStyle.textColor} border ${sourceStyle.borderColor}`}>
                                {sourceStyle.label}
                            </span>
                        </div>

                        {hasBeenModified && fieldValue.originalValue !== undefined && (
                            <div className="pt-2">
                                <div className="text-gray-400 text-[10px] mb-1 font-medium">Valor original:</div>
                                <div className="bg-gray-50 rounded px-2 py-1.5 font-mono text-gray-600 break-all border border-gray-100 italic">
                                    {fieldValue.originalValue || '(vacío)'}
                                </div>
                            </div>
                        )}

                        {fieldValue.modifiedAt && (
                            <div className="flex justify-between items-center pt-1 text-[10px] text-gray-400 border-t border-gray-50 mt-1">
                                <span>Editado el:</span>
                                <span className="font-medium text-gray-500">
                                    {formatTimestamp(fieldValue.modifiedAt)}
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Flecha */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-[6px] border-transparent border-t-white/95" />
                </div>
            )}
        </div>
    );
}

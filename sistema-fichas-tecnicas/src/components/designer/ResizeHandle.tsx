/**
 * ResizeHandle - Pequeño componente para redimensionar paneles laterales
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface ResizeHandleProps {
    direction: 'left' | 'right';
    onResize: (newWidth: number) => void;
    minWidth?: number;
    maxWidth?: number;
    initialWidth: number;
}

export function ResizeHandle({ direction, onResize, minWidth = 150, maxWidth = 600, initialWidth }: ResizeHandleProps) {
    const [isResizing, setIsResizing] = useState(false);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    useEffect(() => {
        if (!isResizing) return;

        const handleMouseMove = (e: MouseEvent) => {
            let newWidth: number;

            if (direction === 'right') {
                // Cálculo para paneles a la izquierda (redimensionan hacia la derecha)
                newWidth = e.clientX;
            } else {
                // Cálculo para paneles a la derecha (redimensionan hacia la izquierda)
                newWidth = window.innerWidth - e.clientX;
            }

            if (newWidth >= minWidth && newWidth <= maxWidth) {
                onResize(newWidth);
            }
        };

        const handleMouseUp = () => {
            setIsResizing(false);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, direction, minWidth, maxWidth, onResize]);

    return (
        <div
            onMouseDown={handleMouseDown}
            className={`w-1.5 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-50 flex-shrink-0 ${isResizing ? 'bg-primary/50' : 'bg-transparent'
                }`}
        />
    );
}

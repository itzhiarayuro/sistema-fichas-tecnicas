/**
 * Photo Worker - Procesamiento de imágenes en segundo plano (Hashing y Compresión)
 * 
 * Implementa el principio: "Nunca bloquear la UI con procesamiento de imágenes".
 * Requirements: 20.5, 32.2
 */

interface PhotoTask {
    id: string;
    file: File | Blob;
    options: {
        maxWidth?: number;
        maxHeight?: number;
        quality?: number;
        generateHash?: boolean;
    };
}

self.onmessage = async (e: MessageEvent<PhotoTask>) => {
    const { id, file, options } = e.data;

    try {
        self.postMessage({ type: 'PROGRESS', id, progress: 10, message: 'Iniciando procesamiento de imagen...' });

        let processedBlob = file;
        let hash: string | undefined;

        // 1. Generar Hash (para deduplicación)
        if (options.generateHash) {
            self.postMessage({ type: 'PROGRESS', id, progress: 30, message: 'Generando identificador único...' });
            const arrayBuffer = await file.arrayBuffer();
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        }

        // 2. Compresión básica (si es posible en el entorno del worker)
        // Nota: OffscreenCanvas no está disponible en todos los navegadores para workers
        // pero es el estándar moderno.
        if (typeof OffscreenCanvas !== 'undefined' && (options.maxWidth || options.maxHeight)) {
            self.postMessage({ type: 'PROGRESS', id, progress: 60, message: 'Optimizando resolución...' });

            try {
                const img = await createImageBitmap(file);
                let width = img.width;
                let height = img.height;

                if (options.maxWidth && width > options.maxWidth) {
                    height = (height * options.maxWidth) / width;
                    width = options.maxWidth;
                }

                if (options.maxHeight && height > options.maxHeight) {
                    width = (width * options.maxHeight) / height;
                    height = options.maxHeight;
                }

                const canvas = new OffscreenCanvas(width, height);
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    processedBlob = await canvas.convertToBlob({
                        type: 'image/jpeg',
                        quality: options.quality || 0.8
                    });
                }
            } catch (canvasError) {
                console.warn('Error al usar OffscreenCanvas, se usará el archivo original:', canvasError);
            }
        }

        self.postMessage({ type: 'PROGRESS', id, progress: 90, message: 'Finalizando...' });

        // 3. Retornar resultado
        self.postMessage({
            type: 'SUCCESS',
            id,
            result: {
                blob: processedBlob,
                hash,
                originalSize: file.size,
                processedSize: processedBlob.size,
                width: (processedBlob as any).width, // Si pudiéramos extraerlo fácilmente
                height: (processedBlob as any).height
            }
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            id,
            error: error instanceof Error ? error.message : 'Error desconocido procesando imagen'
        });
    }
};

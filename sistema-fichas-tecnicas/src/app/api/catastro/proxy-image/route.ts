import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy API
 * Resuelve el error de CORS al intentar cargar fotos de Google Drive
 * usando el mismo flujo exacto que el sistema Catastro (driveSync.ts → fetchPhotoFromDrive).
 * 
 * El GAS (Google Apps Script) espera:
 *   POST con body JSON (sin header Content-Type para evitar preflight CORS):
 *   { token, action: 'download', filename }
 * 
 * Y devuelve:
 *   { success: true, base64: '...', mimeType: '...' }
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const imageUrl = searchParams.get('url');
        const driveId = searchParams.get('driveId');
        const filename = searchParams.get('filename');

        console.log(`[Proxy] Request: driveId=${driveId}, filename=${filename}, url=${imageUrl}`);

        if (!imageUrl && !driveId && !filename) {
            return NextResponse.json({ error: 'Missing image identifier (url, driveId or filename)' }, { status: 400 });
        }

        // ─── CASO 1: Buscar por filename o driveId via GAS Proxy ───────────
        if (!imageUrl && (driveId || filename)) {
            const gasUrl = process.env.NEXT_PUBLIC_GAS_URL;
            const token = process.env.NEXT_PUBLIC_SECRET_TOKEN;

            if (!gasUrl) {
                console.error('[Proxy] NEXT_PUBLIC_GAS_URL is not defined in environment');
                return NextResponse.json({ error: 'GAS Proxy not configured on server' }, { status: 500 });
            }

            console.log(`[Proxy] Calling GAS: ${gasUrl} with filename=${filename}, driveId=${driveId}`);

            // ⚠️ IMPORTANTE: Replicamos EXACTAMENTE el flujo del sistema Catastro original
            // (ver catastro-ut-star-app/src/utils/driveSync.ts → fetchPhotoFromDrive)
            // - NO enviar Content-Type header (evita preflight CORS en GAS)
            // - Usar mode: 'cors'
            // - Enviar action: 'download' y filename
            const requestBody: any = {
                token: token,
                action: 'download',
                filename: filename || '',
            };

            // Si tenemos driveId, lo enviamos también como fileId
            if (driveId) {
                requestBody.fileId = driveId;
            }

            const gasResponse = await fetch(gasUrl, {
                method: 'POST',
                // NO enviamos Content-Type header — este es el detalle crítico
                // GAS maneja mejor las solicitudes sin el header explícito
                body: JSON.stringify(requestBody),
            });

            if (!gasResponse.ok) {
                const errorText = await gasResponse.text();
                console.error(`[Proxy] GAS HTTP ${gasResponse.status}:`, errorText.substring(0, 500));
                return NextResponse.json({ 
                    error: 'GAS Proxy failed',
                    status: gasResponse.status,
                    details: errorText.substring(0, 200)
                }, { status: 502 });
            }

            const gasData = await gasResponse.json();
            console.log(`[Proxy] GAS Response: success=${gasData.success}, hasBase64=${!!gasData.base64}, error=${gasData.error || 'none'}`);

            // El sistema original verifica gasData.success && gasData.base64
            if (!gasData.success || !gasData.base64) {
                const errorMsg = gasData.error || 'GAS did not return image data';
                console.warn(`[Proxy] GAS Error for ${filename}: ${errorMsg}`);
                return NextResponse.json({ 
                    error: errorMsg,
                    filename: filename 
                }, { status: 404 });
            }

            // Convertir Base64 a Buffer
            // ⚠️ CRÍTICO: El GAS devuelve base64 que puede incluir prefijo data URI
            let rawBase64: string = gasData.base64;
            let contentType = gasData.mimeType || 'image/jpeg';

            console.log(`[Proxy] Raw base64 starts with: "${rawBase64.substring(0, 60)}..."`);
            console.log(`[Proxy] Raw base64 length: ${rawBase64.length}`);

            // Método 1: Búsqueda robusta de 'base64,' para cortar TODO lo anterior
            const base64Match = 'base64,';
            const base64Index = rawBase64.indexOf(base64Match);
            if (base64Index !== -1) {
                console.warn(`[Proxy] Encontrado prefijo data URI, cortando en el índice ${base64Index}`);
                rawBase64 = rawBase64.substring(base64Index + base64Match.length);
            } else {
                // Método 2 fallback: Si todavía no es base64 válido
                // buscar el inicio real del base64 (los primeros caracteres base64 válidos)
                const commaIndex = rawBase64.indexOf(',');
                if (commaIndex > 0 && commaIndex < 100) {
                    console.warn(`[Proxy] Removing potential prefix before comma at index ${commaIndex}`);
                    rawBase64 = rawBase64.substring(commaIndex + 1);
                }
            }

            // Limpiar whitespace, newlines y comillas que puedan corromper el base64
            // 🚨 NO eliminar 'd', 'a', 't' etc accidentalmente con regex raros
            rawBase64 = rawBase64.replace(/[\s\r\n"']/g, '');

            const buffer = Buffer.from(rawBase64, 'base64');

            // Validar que el buffer empiece con bytes válidos de imagen
            const header = buffer.slice(0, 4);
            const isJPEG = header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
            const isPNG = header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
            
            if (isJPEG) contentType = 'image/jpeg';
            else if (isPNG) contentType = 'image/png';
            
            console.log(`[Proxy] Buffer header bytes: [${header[0]?.toString(16)}, ${header[1]?.toString(16)}, ${header[2]?.toString(16)}, ${header[3]?.toString(16)}]`);
            console.log(`[Proxy] ✅ Imagen servida: ${filename} (${buffer.byteLength} bytes, ${contentType}, valid=${isJPEG || isPNG})`);

            if (!isJPEG && !isPNG) {
                console.error(`[Proxy] ⚠️ Buffer does NOT start with valid JPEG/PNG magic bytes!`);
            }

            return new NextResponse(buffer, {
                headers: {
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=31536000, immutable',
                    'Access-Control-Allow-Origin': '*',
                },
            });
        }

        // ─── CASO 2: URL directa (Google Drive legacy o cualquier otra) ────
        let finalUrl = imageUrl || '';

        if (finalUrl.includes('drive.google.com')) {
            const fileId = finalUrl.match(/[-\w]{25,}/)?.[0];
            if (fileId) {
                finalUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
            }
        }

        const response = await fetch(finalUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error: any) {
        console.error('[Proxy] Fatal Error:', error.message);
        return NextResponse.json({
            error: 'Error fetching remote image',
            details: error.message
        }, { status: 500 });
    }
}

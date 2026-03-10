import { NextRequest, NextResponse } from 'next/server';

/**
 * Image Proxy API
 * Resuelve el error de CORS al intentar cargar fotos de Google Drive o Firebase Storage
 * desde librerías de frontend como html2canvas.
 */
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const imageUrl = searchParams.get('url');

        if (!imageUrl) {
            return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
        }

        let finalUrl = imageUrl;

        // Soporte inteligente para URLs de Google Drive
        if (imageUrl.includes('drive.google.com')) {
            const fileId = imageUrl.match(/[-\w]{25,}/)?.[0];
            if (fileId) {
                // Forzar URL de descarga directa
                finalUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
            }
        }

        const response = await fetch(finalUrl);

        if (!response.ok) {
            throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'image/jpeg';
        const buffer = await response.arrayBuffer();

        // Retornamos la imagen con headers de cache y permitiendo el acceso local
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*', // Permitimos que nuestro frontend la use sin CORS
            },
        });
    } catch (error: any) {
        console.error('Image Proxy Error:', error);
        return NextResponse.json({
            error: 'Error fetching remote image',
            details: error.message
        }, { status: 500 });
    }
}

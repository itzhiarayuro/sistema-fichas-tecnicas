import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/server/firebaseAdmin';
import { transformFirebaseToPozo } from '@/lib/services/firebaseAdapter';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const limit = parseInt(searchParams.get('limit') || '20');
        const startAfter = searchParams.get('startAfter');
        const date = searchParams.get('date');

        let query = db.collection('fichas')
            .orderBy('lastSync', 'desc')
            .limit(limit);

        const snapshot = await query.get();

        const records = snapshot.docs.map(doc => {
            const data = doc.data();
            return transformFirebaseToPozo({ ...data, id: doc.id });
        });

        return NextResponse.json({
            success: true,
            data: records,
            count: records.length,
        });
    } catch (error: any) {
        console.error('API Records Error:', error);
        return NextResponse.json({
            success: false,
            error: error.message
        }, { status: 500 });
    }
}

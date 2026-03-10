import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
    const hasAdminKey = !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const hasPublicConfig = !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    return NextResponse.json({
        adminKey: hasAdminKey,
        publicConfig: hasPublicConfig,
        allReady: hasAdminKey && hasPublicConfig
    });
}

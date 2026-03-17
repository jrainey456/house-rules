import { store } from '@/lib/store';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    const sessionId = req.cookies.get('keeperSession')?.value;
    if (!sessionId || sessionId !== store.keeperSessionId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { message } = await req.json();
    store.message = message;
    const data = JSON.stringify({ type: 'message', message });
    store.clients.forEach(send => send(data));
    return NextResponse.json({ ok: true });
}

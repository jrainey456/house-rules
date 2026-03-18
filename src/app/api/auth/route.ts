import { store } from '@/lib/store';
import { NextRequest, NextResponse } from 'next/server';

const KEEPER_PASSWORD = 'Arise';

// Login
export async function POST(req: NextRequest) {
    const { role, password } = await req.json();

    if (role === 'player') {
        const res = NextResponse.json({ ok: true });
        res.cookies.set('role', 'player', { httpOnly: true, path: '/' });
        res.cookies.delete('keeperSession');
        return res;
    }

    if (role === 'keeper') {
        if (password !== KEEPER_PASSWORD) {
            return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
        }
        const sessionId = crypto.randomUUID();
        store.keeperSessionId = sessionId;
        const res = NextResponse.json({ ok: true });
        res.cookies.set('role', 'keeper', { httpOnly: true, path: '/' });
        res.cookies.set('keeperSession', sessionId, { httpOnly: true, path: '/' });
        return res;
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
}

// Logout
export async function DELETE(req: NextRequest) {
    const keeperSessionId = req.cookies.get('keeperSession')?.value;
    
    if (keeperSessionId && keeperSessionId === store.keeperSessionId) {
        store.keeperSessionId = null;
    }
    
    const res = NextResponse.json({ ok: true });
    res.cookies.delete('role');
    res.cookies.delete('keeperSession');
    return res;
}

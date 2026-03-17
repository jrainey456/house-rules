import { store } from '@/lib/store';
import { NextRequest, NextResponse } from 'next/server';

const KEEPER_PASSWORD = 'Arise';

// Login
export async function POST(req: NextRequest) {
    const { role, password } = await req.json();

    if (role === 'player') {
        // Check if player already has a session
        const existingPlayerSession = req.cookies.get('playerSession')?.value;
        
        if (existingPlayerSession) {
            // Return existing session info
            return NextResponse.json({ ok: true, sessionId: existingPlayerSession });
        }
        
        // Generate unique session ID for new player
        const sessionId = crypto.randomUUID();
        const res = NextResponse.json({ ok: true, sessionId });
        res.cookies.set('role', 'player', { httpOnly: true, path: '/' });
        res.cookies.set('playerSession', sessionId, { httpOnly: true, path: '/' });
        // Ensure no keeper session cookie exists for player
        res.cookies.delete('keeperSession');
        return res;
    }

    if (role === 'keeper') {
        if (password !== KEEPER_PASSWORD) {
            return NextResponse.json({ error: 'Wrong password' }, { status: 401 });
        }
        // Override any existing keeper session
        const sessionId = crypto.randomUUID();
        store.keeperSessionId = sessionId;
        const res = NextResponse.json({ ok: true });
        res.cookies.set('role', 'keeper', { httpOnly: true, path: '/' });
        res.cookies.set('keeperSession', sessionId, { httpOnly: true, path: '/' });
        // Ensure no player session cookie exists for keeper
        res.cookies.delete('playerSession');
        return res;
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
}

// Logout
export async function DELETE(req: NextRequest) {
    const keeperSessionId = req.cookies.get('keeperSession')?.value;
    const playerSessionId = req.cookies.get('playerSession')?.value;
    
    // Handle keeper logout
    if (keeperSessionId && keeperSessionId === store.keeperSessionId) {
        console.log('Keeper logging out');
        store.keeperSessionId = null;
        store.clients.forEach(send => {
            try {
                send(JSON.stringify({ type: 'keeper-left' }));
            } catch (e) {
                console.error('Failed to send keeper-left message:', e);
            }
        });
    }
    
    // Handle player logout
    if (playerSessionId && store.playerSessions.has(playerSessionId)) {
        console.log(`Player ${playerSessionId.slice(-8)} logging out`);
        store.playerSessions.delete(playerSessionId);
        // Notify keeper of player disconnection
        if (store.keeperSessionId) {
            const sessionsList = Array.from(store.playerSessions.keys());
            setTimeout(() => {
                store.clients.forEach(send => {
                    try {
                        send(JSON.stringify({ 
                            type: 'player-sessions-update', 
                            sessions: sessionsList 
                        }));
                    } catch (e) {
                        console.error('Failed to send session update:', e);
                    }
                });
            }, 100);
        }
    }
    
    const res = NextResponse.json({ ok: true });
    res.cookies.delete('role');
    res.cookies.delete('keeperSession');
    res.cookies.delete('playerSession');
    return res;
}

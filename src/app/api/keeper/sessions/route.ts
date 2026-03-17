import { store } from '@/lib/store';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
    // Check if request is from keeper
    const keeperSessionId = req.cookies.get('keeperSession')?.value;
    if (!keeperSessionId || keeperSessionId !== store.keeperSessionId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active player sessions with connection info
    const sessions = Array.from(store.playerSessions.entries()).map(([id, session]) => ({
        id: id.slice(-8), // Show last 8 characters for display
        fullId: id,
        connectedAt: session.connectedAt.toISOString(),
        connectedFor: Math.floor((Date.now() - session.connectedAt.getTime()) / 1000), // seconds
        currentMessage: session.currentMessage
    }));

    // Get player message states
    const messageMap = new Map<string, string[]>();
    store.playerSessions.forEach((playerSession, fullSessionId) => {
        const trimmedId = fullSessionId.slice(-8);
        const message = playerSession.currentMessage;
        
        if (!messageMap.has(message)) {
            messageMap.set(message, []);
        }
        messageMap.get(message)!.push(trimmedId);
    });
    
    const messageStates = Array.from(messageMap.entries()).map(([message, players]) => ({
        message,
        players
    }));

    return NextResponse.json({ 
        sessions,
        count: sessions.length,
        messageStates,
        timestamp: new Date().toISOString()
    });
}
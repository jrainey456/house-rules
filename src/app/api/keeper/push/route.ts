import { store } from '@/lib/store';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { message, targetPlayers } = await req.json();
        const msg = message || '';
        const data = JSON.stringify({ type: 'message', message: msg });

        // If targetPlayers are specified, send only to those player sessions
        if (targetPlayers && Array.isArray(targetPlayers) && targetPlayers.length > 0) {
            const deadSessions: string[] = [];

            store.playerSessions.forEach((session, fullId) => {
                const trimmedId = fullId.slice(-8);
                if (targetPlayers.includes(trimmedId)) {
                    try {
                        session.send(data);
                        session.currentMessage = msg;
                    } catch {
                        deadSessions.push(fullId);
                    }
                }
            });

            // Clean up dead sessions
            deadSessions.forEach(id => store.playerSessions.delete(id));
        } else {
            // Fallback: broadcast to all players
            store.message = msg;
            const deadSessions: string[] = [];

            store.playerSessions.forEach((session, fullId) => {
                try {
                    session.send(data);
                    session.currentMessage = msg;
                } catch {
                    deadSessions.push(fullId);
                }
            });

            deadSessions.forEach(id => store.playerSessions.delete(id));
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Push route error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

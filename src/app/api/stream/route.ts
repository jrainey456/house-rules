import { store } from '@/lib/store';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function broadcastPlayerSessions() {
    const sessionIds = Array.from(store.playerSessions.keys());
    const data = JSON.stringify({ type: 'player-sessions-update', sessions: sessionIds });
    store.clients.forEach(send => {
        try { send(data); } catch { /* handled elsewhere */ }
    });
}

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    let clientSend: ((data: string) => void) | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
        start(controller) {
            clientSend = (data: string) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch {
                    cleanup();
                }
            };

            // Add to generic clients set (for keeper + all broadcasts)
            store.clients.add(clientSend);

            // If this is a player connection, register the session
            if (sessionId) {
                store.playerSessions.set(sessionId, {
                    id: sessionId,
                    connectedAt: new Date(),
                    send: clientSend,
                    currentMessage: store.message || '',
                });
                // Broadcast updated player list to all clients (including keeper)
                broadcastPlayerSessions();
            }

            // Send current message state to this client
            const currentMsg = sessionId
                ? (store.playerSessions.get(sessionId)?.currentMessage ?? '')
                : (store.message || '');
            const initial = JSON.stringify({ type: 'message', message: currentMsg });
            controller.enqueue(encoder.encode(`data: ${initial}\n\n`));

            // Simple heartbeat to keep connection alive
            heartbeatTimer = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': heartbeat\n\n'));
                } catch {
                    cleanup();
                }
            }, 30000);
        },
        cancel() {
            cleanup();
        },
    });

    function cleanup() {
        if (clientSend) {
            store.clients.delete(clientSend);
        }
        if (sessionId) {
            store.playerSessions.delete(sessionId);
            broadcastPlayerSessions();
        }
        if (heartbeatTimer) {
            clearInterval(heartbeatTimer);
        }
    }

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}

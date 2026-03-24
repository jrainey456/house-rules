import { store } from '@/lib/store';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

function broadcastPlayerSessions() {
    const sessions = Array.from(store.playerSessions.values()).map(s => ({ id: s.id, name: s.playerName }));
    const data = JSON.stringify({ type: 'player-sessions-update', sessions });
    store.keeperClients.forEach(send => {
        try { send(data); } catch { /* handled elsewhere */ }
    });
}

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();
    const sessionId = req.nextUrl.searchParams.get('sessionId');
    const playerName = req.nextUrl.searchParams.get('playerName') || 'UNKNOWN';
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

            if (sessionId) {
                // Player connection — register session only, not in generic clients
                store.playerSessions.set(sessionId, {
                    id: sessionId,
                    playerName,
                    connectedAt: new Date(),
                    send: clientSend,
                    currentMessage: store.message || '',
                });
                broadcastPlayerSessions();
            } else {
                // Keeper connection — track in keeperClients for broadcasts
                store.clients.add(clientSend);
                store.keeperClients.add(clientSend);
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
            store.keeperClients.delete(clientSend);
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

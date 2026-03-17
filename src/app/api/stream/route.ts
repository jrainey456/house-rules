import { store } from '@/lib/store';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();
    let clientSend: ((data: string) => void) | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
        start(controller) {
            // Send current state immediately
            const initial = JSON.stringify({ type: 'message', message: store.message || '' });
            controller.enqueue(encoder.encode(`data: ${initial}\n\n`));

            clientSend = (data: string) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch {
                    cleanup();
                }
            };
            
            // Add to clients set
            store.clients.add(clientSend);

            // Simple heartbeat to keep connection alive
            heartbeatTimer = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': heartbeat\n\n'));
                } catch {
                    cleanup();
                }
            }, 30000); // Longer interval for stability
        },
        cancel() {
            cleanup();
        },
    });

    function cleanup() {
        if (clientSend) {
            store.clients.delete(clientSend);
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

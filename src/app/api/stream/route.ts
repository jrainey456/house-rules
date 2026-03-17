import { store } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function GET() {
    const encoder = new TextEncoder();
    let clientSend: ((data: string) => void) | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

    const stream = new ReadableStream({
        start(controller) {
            // Send current state immediately
            const initial = JSON.stringify({ type: 'message', message: store.message });
            controller.enqueue(encoder.encode(`data: ${initial}\n\n`));

            clientSend = (data: string) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch {
                    if (clientSend) store.clients.delete(clientSend);
                }
            };
            store.clients.add(clientSend);

            // Heartbeat to keep connection alive
            heartbeatTimer = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': heartbeat\n\n'));
                } catch {
                    if (heartbeatTimer) clearInterval(heartbeatTimer);
                }
            }, 15000);
        },
        cancel() {
            if (clientSend) store.clients.delete(clientSend);
            if (heartbeatTimer) clearInterval(heartbeatTimer);
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}

import { store } from '@/lib/store';
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    const encoder = new TextEncoder();
    let clientSend: ((data: string) => void) | null = null;
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null;
    let playerSessionId: string | null = null;

    const stream = new ReadableStream({
        start(controller) {
            // Get session IDs from cookies
            playerSessionId = req.cookies.get('playerSession')?.value || null;
            const keeperSessionId = req.cookies.get('keeperSession')?.value || null;
            const isKeeper = keeperSessionId === store.keeperSessionId;
            
            console.log('Stream connection:', { 
                playerSessionId: playerSessionId?.slice(-8), 
                isKeeper,
                keeperSessionId: keeperSessionId?.slice(-8)
            });
            
            // Send current state immediately
            const initial = JSON.stringify({ type: 'message', message: store.message });
            controller.enqueue(encoder.encode(`data: ${initial}\n\n`));

            clientSend = (data: string) => {
                try {
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch {
                    cleanup();
                }
            };
            
            // Add to general clients set (for backwards compatibility)
            store.clients.add(clientSend);
            
            // Only track as player if this is NOT the keeper and has a player session
            if (playerSessionId && !isKeeper) {
                store.playerSessions.set(playerSessionId, {
                    id: playerSessionId,
                    connectedAt: new Date(),
                    send: clientSend,
                    currentMessage: store.message || '' // Initialize with current global message
                });
                
                console.log(`Player ${playerSessionId.slice(-8)} connected`);
                
                // Notify keeper of new player connection
                if (store.keeperSessionId) {
                    const sessionsList = Array.from(store.playerSessions.keys());
                    setTimeout(() => {
                        store.clients.forEach(send => {
                            if (send !== clientSend) { // Don't send to the connecting player
                                try {
                                    send(JSON.stringify({ 
                                        type: 'player-sessions-update', 
                                        sessions: sessionsList 
                                    }));
                                } catch (e) {
                                    console.error('Failed to send session update:', e);
                                }
                            }
                        });
                    }, 100);
                }
            } else if (isKeeper) {
                console.log('Keeper connected to stream');
            }

            // Heartbeat to keep connection alive
            heartbeatTimer = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(': heartbeat\n\n'));
                } catch {
                    cleanup();
                }
            }, 15000);
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
        if (playerSessionId && store.playerSessions.has(playerSessionId)) {
            const keeperSessionId = req.cookies.get('keeperSession')?.value || null;
            const isKeeper = keeperSessionId === store.keeperSessionId;
            
            // Only clean up player session if this wasn't the keeper
            if (!isKeeper) {
                console.log(`Player ${playerSessionId.slice(-8)} disconnected`);
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
            } else {
                console.log('Keeper disconnected from stream');
            }
        }
    }

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}

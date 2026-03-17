import { store } from '@/lib/store';
import { NextRequest, NextResponse } from 'next/server';

function getPlayerMessageStates() {
    const messageMap = new Map<string, string[]>();
    
    store.playerSessions.forEach((playerSession, fullSessionId: string) => {
        const trimmedId = fullSessionId.slice(-8);
        const message = playerSession.currentMessage;
        
        if (!messageMap.has(message)) {
            messageMap.set(message, []);
        }
        messageMap.get(message)!.push(trimmedId);
    });
    
    return Array.from(messageMap.entries()).map(([message, players]) => ({
        message,
        players
    }));
}

export async function POST(req: NextRequest) {
    const sessionId = req.cookies.get('keeperSession')?.value;
    if (!sessionId || sessionId !== store.keeperSessionId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { message, targetPlayers } = await req.json();
    store.message = message;
    
    const data = JSON.stringify({ type: 'message', message });
    
    if (targetPlayers && Array.isArray(targetPlayers) && targetPlayers.length > 0) {
        // Send to specific players only
        let sentCount = 0;
        const updatedPlayers: string[] = [];
        
        targetPlayers.forEach((trimmedSessionId: string) => {
            // Find the full session ID from the trimmed version
            for (const [fullSessionId, playerSession] of store.playerSessions.entries()) {
                if (fullSessionId.slice(-8) === trimmedSessionId) {
                    try {
                        playerSession.send(data);
                        // Update the player's current message
                        playerSession.currentMessage = message;
                        updatedPlayers.push(trimmedSessionId);
                        sentCount++;
                    } catch (error) {
                        console.error(`Failed to send to player ${trimmedSessionId}:`, error);
                        // Remove dead connection
                        store.playerSessions.delete(fullSessionId);
                        store.clients.delete(playerSession.send);
                    }
                    break;
                }
            }
        });
        
        // Notify keeper of player message states
        const messageStates = getPlayerMessageStates();
        setTimeout(() => {
            store.clients.forEach(send => {
                try {
                    send(JSON.stringify({ 
                        type: 'player-message-states', 
                        states: messageStates 
                    }));
                } catch (e) {
                    console.error('Failed to send message states update:', e);
                }
            });
        }, 100);
        
        console.log(`Message sent to ${sentCount} selected players`);
    } else {
        // Send to all clients (backward compatibility)
        store.clients.forEach(send => {
            try {
                send(data);
            } catch (error) {
                console.error('Failed to send to client:', error);
                store.clients.delete(send);
            }
        });
        
        // Update all player current messages
        store.playerSessions.forEach(playerSession => {
            playerSession.currentMessage = message;
        });
        
        // Notify keeper of player message states
        const messageStates = getPlayerMessageStates();
        setTimeout(() => {
            store.clients.forEach(send => {
                try {
                    send(JSON.stringify({ 
                        type: 'player-message-states', 
                        states: messageStates 
                    }));
                } catch (e) {
                    console.error('Failed to send message states update:', e);
                }
            });
        }, 100);
        
        console.log('Message sent to all clients');
    }
    
    return NextResponse.json({ ok: true });
}

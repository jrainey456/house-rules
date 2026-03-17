import { store } from '@/lib/store';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const { message } = await req.json();
        
        // Update global message
        store.message = message || '';
        
        // Broadcast to all clients
        const data = JSON.stringify({ type: 'message', message: store.message });
        const deadClients: ((data: string) => void)[] = [];
        
        store.clients.forEach(send => {
            try {
                send(data);
            } catch {
                deadClients.push(send);
            }
        });
        
        // Clean up dead connections
        deadClients.forEach(deadClient => {
            store.clients.delete(deadClient);
        });
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Push route error:', error);
        return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }
}

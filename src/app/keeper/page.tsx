'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import FullscreenButton from '../../components/FullscreenButton';

const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--font-special-elite), serif',
    fontSize: '3vw',
    padding: '0.4em 0.8em',
    border: '3px solid black',
    background: 'transparent',
    letterSpacing: '0.1em',
    outline: 'none',
    textAlign: 'center',
    width: '70vw',
};

const btnStyle: React.CSSProperties = {
    fontFamily: 'var(--font-special-elite), serif',
    fontSize: '2vw',
    padding: '0.4em 1.4em',
    background: 'black',
    color: '#e8e0d0',
    border: '3px solid black',
    cursor: 'pointer',
    letterSpacing: '0.15em',
};

const ghostBtn: React.CSSProperties = {
    ...btnStyle,
    background: 'transparent',
    color: 'black',
    fontSize: '1.2vw',
    opacity: 0.5,
};

export default function KeeperPage() {
    const [input, setInput] = useState('');
    const [current, setCurrent] = useState('');
    const [currentTargets, setCurrentTargets] = useState<string[]>([]);
    const [status, setStatus] = useState('');
    const [playerSessions, setPlayerSessions] = useState<string[]>([]);
    const [selectedPlayers, setSelectedPlayers] = useState<Set<string>>(new Set());
    const [playerMessageStates, setPlayerMessageStates] = useState<Array<{message: string, players: string[]}>>([]);
    const router = useRouter();

    // Fetch current message and maintain SSE connection
    useEffect(() => {
        const es = new EventSource('/api/stream');
        
        es.onmessage = (e: MessageEvent) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'message') {
                    setCurrent(data.message);
                } else if (data.type === 'player-sessions-update') {
                    console.log('Received session update:', data.sessions);
                    const trimmedSessions = (data.sessions || []).map((id: string) => 
                        typeof id === 'string' ? id.slice(-8) : id
                    );
                    setPlayerSessions(trimmedSessions);
                    
                    setSelectedPlayers(prev => {
                        const newSelected = new Set<string>();
                        trimmedSessions.forEach((sessionId: string) => {
                            if (prev.has(sessionId)) {
                                newSelected.add(sessionId);
                            }
                        });
                        return newSelected;
                    });
                    
                    setCurrentTargets(prev => {
                        return prev.filter((sessionId: string) => trimmedSessions.includes(sessionId));
                    });
                } else if (data.type === 'player-message-states') {
                    console.log('Received message states:', data.states);
                    setPlayerMessageStates(data.states || []);
                }
            } catch (error) {
                console.error('Error parsing SSE message:', error);
            }
        };
        
        es.onerror = () => es.close();
        
        fetchPlayerSessions();
        
        return () => es.close();
    }, []);

    async function fetchPlayerSessions() {
        try {
            const res = await fetch('/api/keeper/sessions');
            if (res.ok) {
                const data = await res.json();
                const sessionIds = data.sessions.map((s: any) => s.id);
                console.log('Fetched initial sessions:', sessionIds);
                setPlayerSessions(sessionIds);
                // Auto-select all players initially
                setSelectedPlayers(new Set(sessionIds));
                // Set initial message states
                setPlayerMessageStates(data.messageStates || []);
            } else if (res.status === 401) {
                router.push('/');
            }
        } catch (error) {
            console.error('Failed to fetch player sessions:', error);
        }
    }

    // Handle individual player selection
    function togglePlayerSelection(sessionId: string) {
        setSelectedPlayers(prev => {
            const newSelected = new Set(prev);
            if (newSelected.has(sessionId)) {
                newSelected.delete(sessionId);
            } else {
                newSelected.add(sessionId);
            }
            return newSelected;
        });
    }

    // Handle select all / deselect all
    function toggleSelectAll() {
        if (selectedPlayers.size === playerSessions.length) {
            // All selected, deselect all
            setSelectedPlayers(new Set());
        } else {
            // Not all selected, select all
            setSelectedPlayers(new Set(playerSessions));
        }
    }

    async function handlePush() {
        const trimmed = input.trim();
        const selectedPlayersList = Array.from(selectedPlayers);
        
        if (selectedPlayersList.length === 0) {
            setStatus('NO PLAYERS SELECTED');
            setTimeout(() => setStatus(''), 2000);
            return;
        }

        const res = await fetch('/api/keeper/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: trimmed, 
                targetPlayers: selectedPlayersList 
            }),
        });
        
        if (res.ok) {
            setCurrent(trimmed);
            setCurrentTargets(selectedPlayersList);
            const count = selectedPlayersList.length;
            const isAll = count === playerSessions.length;
            setStatus(isAll ? 'TRANSMITTED TO ALL' : `TRANSMITTED TO ${count} PLAYER${count > 1 ? 'S' : ''}`);
            setTimeout(() => setStatus(''), 2000);
        } else if (res.status === 401) {
            router.push('/');
        }
    }

    async function handleClear() {
        const selectedPlayersList = Array.from(selectedPlayers);
        
        if (selectedPlayersList.length === 0) {
            setStatus('NO PLAYERS SELECTED');
            setTimeout(() => setStatus(''), 2000);
            return;
        }

        await fetch('/api/keeper/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                message: '', 
                targetPlayers: selectedPlayersList 
            }),
        });
        setCurrent('');
        setCurrentTargets([]);
        setInput('');
        const count = selectedPlayersList.length;
        const isAll = count === playerSessions.length;
        setStatus(isAll ? 'CLEARED ALL' : `CLEARED ${count} PLAYER${count > 1 ? 'S' : ''}`);
        setTimeout(() => setStatus(''), 2000);
    }

    async function handleLogout() {
        await fetch('/api/auth', { method: 'DELETE' });
        router.push('/');
    }

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            gap: '2rem',
            fontFamily: 'var(--font-special-elite), serif',
        }}>
            <h2 style={{ fontSize: '3vw', letterSpacing: '0.3em', marginBottom: '0' }}>
                KEEPER
            </h2>

            {/* Player Sessions Display with Selection */}
            <div style={{ 
                textAlign: 'center', 
                marginBottom: '1rem',
                opacity: 0.7 
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '1rem',
                    marginBottom: '0.5rem'
                }}>
                    <p style={{ 
                        fontSize: '1.2vw', 
                        letterSpacing: '0.15em', 
                        margin: '0',
                        fontWeight: 'bold'
                    }}>
                        CONNECTED PLAYERS: {playerSessions.length}
                    </p>
                    {playerSessions.length > 0 && (
                        <button
                            onClick={toggleSelectAll}
                            style={{
                                fontFamily: 'var(--font-special-elite), serif',
                                fontSize: '0.8vw',
                                padding: '0.2em 0.5em',
                                background: selectedPlayers.size === playerSessions.length ? 'black' : 'transparent',
                                color: selectedPlayers.size === playerSessions.length ? '#e8e0d0' : 'black',
                                border: '1px solid black',
                                cursor: 'pointer',
                                letterSpacing: '0.1em',
                                borderRadius: '4px',
                            }}
                        >
                            {selectedPlayers.size === playerSessions.length ? 'DESELECT ALL' : 'SELECT ALL'}
                        </button>
                    )}
                </div>
                {playerSessions.length > 0 && (
                    <div style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        fontSize: '1vw',
                        letterSpacing: '0.1em'
                    }}>
                        {playerSessions.map((sessionId: string) => (
                            <label 
                                key={sessionId}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.3rem',
                                    background: selectedPlayers.has(sessionId) ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.05)',
                                    border: selectedPlayers.has(sessionId) ? '2px solid rgba(0, 0, 0, 0.4)' : '1px solid rgba(0, 0, 0, 0.2)',
                                    padding: '0.3em 0.5em',
                                    borderRadius: '6px',
                                    fontFamily: 'monospace',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                }}
                                onClick={() => togglePlayerSelection(sessionId)}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedPlayers.has(sessionId)}
                                    onChange={() => togglePlayerSelection(sessionId)}
                                    style={{
                                        margin: '0',
                                        transform: 'scale(1.2)',
                                        cursor: 'pointer',
                                    }}
                                />
                                <span style={{ 
                                    fontWeight: selectedPlayers.has(sessionId) ? 'bold' : 'normal' 
                                }}>
                                    {sessionId}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
                {playerSessions.length > 0 && (
                    <p style={{
                        fontSize: '0.8vw',
                        letterSpacing: '0.1em',
                        margin: '0.5rem 0 0 0',
                        opacity: 0.6,
                    }}>
                        SELECTED: {selectedPlayers.size} / {playerSessions.length}
                    </p>
                )}
            </div>

            {/* Active Messages Display */}
            {playerMessageStates.length > 0 && (
                <div style={{ 
                    textAlign: 'center', 
                    marginBottom: '1rem',
                    opacity: 0.5,
                    maxWidth: '80vw'
                }}>
                    <p style={{ 
                        fontSize: '1.2vw', 
                        letterSpacing: '0.15em', 
                        margin: '0 0 0.5rem 0',
                        fontWeight: 'bold'
                    }}>
                        ON SCREEN:
                    </p>
                    {playerMessageStates.map((state, index) => (
                        <div key={index} style={{
                            marginBottom: '0.8rem',
                            padding: '0.5rem',
                            background: 'rgba(0, 0, 0, 0.05)',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            borderRadius: '6px'
                        }}>
                            <div style={{
                                fontSize: '1.3vw',
                                letterSpacing: '0.1em',
                                marginBottom: '0.3rem',
                                fontWeight: 'bold'
                            }}>
                                {state.message ? `"${state.message}"` : '(BLANK SCREEN)'}
                            </div>
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                alignItems: 'center',
                                gap: '0.3rem',
                                fontSize: '0.9vw',
                                letterSpacing: '0.1em',
                                opacity: 0.8
                            }}>
                                <span style={{ fontWeight: 'bold' }}>
                                    PLAYERS ({state.players.length}):
                                </span>
                                {state.players.map((sessionId: string, playerIndex: number) => (
                                    <span key={sessionId}>
                                        <span 
                                            style={{
                                                background: 'rgba(0, 0, 0, 0.1)',
                                                border: '1px solid rgba(0, 0, 0, 0.2)',
                                                padding: '0.1em 0.3em',
                                                borderRadius: '3px',
                                                fontFamily: 'monospace',
                                                fontSize: '0.8vw',
                                            }}
                                        >
                                            {sessionId}
                                        </span>
                                        {playerIndex < state.players.length - 1 && <span style={{ margin: '0 0.1rem' }}>,</span>}
                                    </span>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handlePush()}
                placeholder="TYPE MESSAGE..."
                style={inputStyle}
                autoFocus
            />

            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                <button style={btnStyle} onClick={handlePush}>
                    TRANSMIT
                </button>
                <button style={ghostBtn} onClick={handleClear}>
                    CLEAR
                </button>
            </div>

            {status && (
                <p style={{ fontSize: '1.2vw', letterSpacing: '0.2em', opacity: 0.6 }}>
                    {status}
                </p>
            )}

            {/* Fullscreen toggle button */}
            <FullscreenButton
                position="top-right"
                style={{
                    background: 'rgba(0, 0, 0, 0.6)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    opacity: 0.7,
                    fontSize: '1.2rem',
                }}
            />

            <button
                onClick={handleLogout}
                style={{
                    position: 'fixed',
                    bottom: '2rem',
                    right: '2rem',
                    fontFamily: 'var(--font-special-elite), serif',
                    fontSize: '1vw',
                    padding: '0.4em 1em',
                    background: 'transparent',
                    border: '2px solid black',
                    cursor: 'pointer',
                    letterSpacing: '0.1em',
                    opacity: 0.4,
                }}
            >
                LOGOUT
            </button>
        </div>
    );
}

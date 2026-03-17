'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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
    const [status, setStatus] = useState('');
    const router = useRouter();

    // Fetch current message on load (from SSE initial event)
    useEffect(() => {
        const es = new EventSource('/api/stream');
        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'message') {
                    setCurrent(data.message);
                }
            } catch { }
            es.close(); // only need the initial state
        };
        return () => es.close();
    }, []);

    async function handlePush() {
        const trimmed = input.trim();
        const res = await fetch('/api/keeper/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: trimmed }),
        });
        if (res.ok) {
            setCurrent(trimmed);
            setStatus('TRANSMITTED');
            setTimeout(() => setStatus(''), 2000);
        } else if (res.status === 401) {
            router.push('/');
        }
    }

    async function handleClear() {
        await fetch('/api/keeper/push', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '' }),
        });
        setCurrent('');
        setInput('');
        setStatus('CLEARED');
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

            {current && (
                <p style={{ fontSize: '1.5vw', letterSpacing: '0.15em', opacity: 0.5, margin: 0 }}>
                    ON SCREEN: &ldquo;{current}&rdquo;
                </p>
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

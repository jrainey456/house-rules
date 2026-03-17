'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const TYPEWRITER_DELAY = 180; // ms per character

export default function PlayerPage() {
    const [fullMessage, setFullMessage] = useState('');
    const [displayedCount, setDisplayedCount] = useState(0);
    const [glitchReady, setGlitchReady] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const router = useRouter();

    // When a new message arrives, restart the typewriter
    useEffect(() => {
        if (timerRef.current) clearTimeout(timerRef.current);
        setDisplayedCount(0);
        setGlitchReady(false);
    }, [fullMessage]);

    // Step the typewriter forward
    useEffect(() => {
        if (!fullMessage) return;
        if (displayedCount >= fullMessage.length) {
            setGlitchReady(true);
            return;
        }
        timerRef.current = setTimeout(() => {
            setDisplayedCount(c => c + 1);
        }, TYPEWRITER_DELAY);
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [displayedCount, fullMessage]);

    useEffect(() => {
        const es = new EventSource('/api/stream');
        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'message') {
                    setFullMessage(data.message);
                }
            } catch { }
        };
        es.onerror = () => es.close();
        return () => es.close();
    }, []);

    async function handleLeave() {
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
            fontFamily: 'var(--font-special-elite), serif',
        }}>
            {fullMessage && (
                <h1
                    className={glitchReady ? 'glitch' : undefined}
                    data-text={glitchReady ? fullMessage : undefined}
                    style={{
                        fontSize: '30vw',
                        lineHeight: 1,
                        textAlign: 'center',
                        margin: 0,
                    }}
                >
                    {/* All chars rendered for layout; invisible ones hold the width */}
                    {fullMessage.split('').map((char, i) => (
                        <span key={i} style={{ opacity: i < displayedCount ? 1 : 0 }}>
                            {char}
                        </span>
                    ))}
                </h1>
            )}

            <button
                onClick={handleLeave}
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
                LEAVE
            </button>
        </div>
    );
}


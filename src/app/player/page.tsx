'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

const TYPEWRITER_DELAY = 180; // ms per character

export default function PlayerPage() {
    const [displayText, setDisplayText] = useState('');      // text rendered on screen
    const [visibleCount, setVisibleCount] = useState(0);     // how many chars are visible
    const [animMode, setAnimMode] = useState<'in' | 'out' | 'idle'>('idle');
    const [glitchReady, setGlitchReady] = useState(false);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingRef = useRef<string | null>(null);           // next word queued after erase
    const router = useRouter();

    // Handle incoming messages
    function handleMessage(msg: string) {
        if (timerRef.current) clearTimeout(timerRef.current);
        setGlitchReady(false);
        if (msg) {
            pendingRef.current = msg;   // queue the new word
        } else {
            pendingRef.current = null;  // just a clear, nothing to type after
        }
        // Always erase whatever is currently visible first
        setAnimMode('out');
    }

    // Typewriter tick
    useEffect(() => {
        if (animMode === 'in') {
            if (visibleCount >= displayText.length) {
                setGlitchReady(true);
                setAnimMode('idle');
                return;
            }
            timerRef.current = setTimeout(() => setVisibleCount(c => c + 1), TYPEWRITER_DELAY);
        } else if (animMode === 'out') {
            if (visibleCount <= 0) {
                // Erase done — check if a new word is waiting
                const next = pendingRef.current;
                pendingRef.current = null;
                if (next) {
                    setDisplayText(next);
                    setVisibleCount(0);
                    setAnimMode('in');
                } else {
                    setDisplayText('');
                    setAnimMode('idle');
                }
                return;
            }
            timerRef.current = setTimeout(() => setVisibleCount(c => c - 1), TYPEWRITER_DELAY);
        }
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, [animMode, visibleCount, displayText.length]);

    useEffect(() => {
        const es = new EventSource('/api/stream');
        es.onmessage = (e) => {
            try {
                const data = JSON.parse(e.data);
                if (data.type === 'message') {
                    handleMessage(data.message);
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
            {displayText && (
                <h1
                    className={glitchReady ? 'glitch' : undefined}
                    data-text={glitchReady ? displayText : undefined}
                    style={{
                        fontSize: '15vw',
                        lineHeight: 1,
                        textAlign: 'center',
                        margin: 0,
                    }}
                >
                    {displayText.split('').map((char, i) => (
                        <span key={i} style={{ opacity: i < visibleCount ? 1 : 0 }}>
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


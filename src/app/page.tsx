'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const btn: React.CSSProperties = {
  fontFamily: 'var(--font-special-elite), serif',
  fontSize: '2.5vw',
  padding: '0.4em 1.2em',
  background: 'transparent',
  border: '3px solid black',
  cursor: 'pointer',
  letterSpacing: '0.1em',
  overflow: 'visible',
};

const activeBtn: React.CSSProperties = {
  ...btn,
  background: 'black',
  color: '#e8e0d0',
};

const inputStyle: React.CSSProperties = {
  fontFamily: 'var(--font-special-elite), serif',
  fontSize: '2vw',
  padding: '0.4em 0.8em',
  border: '3px solid black',
  background: 'transparent',
  letterSpacing: '0.1em',
  outline: 'none',
  textAlign: 'center',
  width: '16em',
};

const enterBtn: React.CSSProperties = {
  ...btn,
  fontSize: '2vw',
  marginTop: '2rem',
};

export default function LoginPage() {
  const [role, setRole] = useState<'player' | 'keeper' | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleEnter(roleOverride?: 'player' | 'keeper') {
    const activeRole = roleOverride ?? role;
    if (!activeRole) return;
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: activeRole, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(`/${activeRole}`);
    } else {
      const data = await res.json();
      setError(data.error);
    }
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
      <h1 className="glitch" data-text="HOUSE RULES" style={{ fontSize: '7vw', marginBottom: '3rem', letterSpacing: '0.05em' }}>
        HOUSE RULES
      </h1>

      <div style={{ display: 'flex', gap: '3rem', marginBottom: '2.5rem' }}>
        <button className="glitch-b" data-text="PLAYER" style={role === 'player' ? activeBtn : btn} onClick={() => { setError(''); handleEnter('player'); }}>
          PLAYER
        </button>
        <button className="glitch-c" data-text="KEEPER" style={role === 'keeper' ? activeBtn : btn} onClick={() => { setRole('keeper'); setError(''); }}>
          KEEPER
        </button>
      </div>

      {role === 'keeper' && (
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleEnter()}
          placeholder="PASSWORD"
          style={inputStyle}
          autoFocus
        />
      )}

      {role === 'keeper' && (
        <button style={enterBtn} onClick={() => handleEnter()} disabled={loading}>
          {loading ? '...' : 'ENTER'}
        </button>
      )}

      {error && (
        <p style={{ marginTop: '1.5rem', fontSize: '1.2vw', letterSpacing: '0.1em', color: '#800000' }}>
          {error.toUpperCase()}
        </p>
      )}
    </div>
  );
}


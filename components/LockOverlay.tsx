'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Lock as LockIcon, Delete } from 'lucide-react';

const PIN_LEN = 4;

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

type Mode = 'enter' | 'set-1' | 'set-2';

const LockContext = createContext<{ lock: () => void } | null>(null);

export function useLock() {
  const ctx = useContext(LockContext);
  if (!ctx) throw new Error('useLock must be used within LockProvider');
  return ctx;
}

export function LockProvider({ children }: { children: ReactNode }) {
  const [locked, setLocked] = useState(false);
  const [mode, setMode] = useState<Mode>('enter');
  const [pin, setPin] = useState('');
  const [firstPin, setFirstPin] = useState('');
  const [error, setError] = useState('');

  function lock() {
    const hasPin = !!localStorage.getItem('ms_pin_hash');
    setMode(hasPin ? 'enter' : 'set-1');
    setPin('');
    setFirstPin('');
    setError('');
    setLocked(true);
  }

  useEffect(() => {
    if (pin.length < PIN_LEN) return;
    (async () => {
      if (mode === 'set-1') {
        setFirstPin(pin);
        setPin('');
        setMode('set-2');
        return;
      }
      if (mode === 'set-2') {
        if (pin !== firstPin) {
          setError('Pins did not match — try again');
          setTimeout(() => {
            setPin('');
            setFirstPin('');
            setMode('set-1');
            setError('');
          }, 700);
          return;
        }
        localStorage.setItem('ms_pin_hash', await sha256(pin));
        setLocked(false);
        return;
      }
      // mode === 'enter'
      const hash = await sha256(pin);
      if (hash === localStorage.getItem('ms_pin_hash')) {
        setLocked(false);
      } else {
        setError('Incorrect passcode — try again');
        setTimeout(() => {
          setPin('');
          setError('');
        }, 700);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pin]);

  return (
    <LockContext.Provider value={{ lock }}>
      {children}
      {locked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f1b2d]">
          <div className="animate-[fadeIn_0.4s_ease] text-center">
            <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/10 bg-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
              <LockIcon className="h-9 w-9 text-white" strokeWidth={1.6} />
            </div>
            <h1 className="mb-1.5 text-2xl font-bold tracking-tight text-white">My Space</h1>
            <p className="mb-8 text-[14px] text-white/40">
              {mode === 'set-1' && 'Set a local screen-lock PIN'}
              {mode === 'set-2' && 'Confirm your PIN'}
              {mode === 'enter' && 'Enter your passcode'}
            </p>
            <div className="mb-8 flex justify-center gap-3.5">
              {Array.from({ length: PIN_LEN }).map((_, i) => (
                <div
                  key={i}
                  className={`h-3.5 w-3.5 rounded-full border-2 transition ${
                    error
                      ? 'border-red-400 bg-red-400'
                      : i < pin.length
                        ? 'scale-110 border-white bg-white'
                        : 'border-white/25'
                  }`}
                />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-3.5">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((k, i) =>
                k === '' ? (
                  <div key={i} />
                ) : (
                  <button
                    key={i}
                    onClick={() =>
                      k === 'del' ? setPin((p) => p.slice(0, -1)) : setPin((p) => (p.length < PIN_LEN ? p + k : p))
                    }
                    className="flex h-[68px] w-[68px] items-center justify-center rounded-full border border-white/10 bg-white/10 text-xl font-normal text-white backdrop-blur-md transition hover:bg-white/[0.18] active:scale-90"
                  >
                    {k === 'del' ? <Delete size={20} /> : k}
                  </button>
                ),
              )}
            </div>
            <div className="mt-5 min-h-[22px] text-sm font-medium text-red-400">{error}</div>
          </div>
        </div>
      )}
    </LockContext.Provider>
  );
}

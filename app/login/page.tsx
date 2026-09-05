'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      router.replace('/dashboard');
      router.refresh();
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      setInfo('Account created — check your email to confirm, then sign in.');
      setMode('signin');
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f0f0f] via-[#1a1a1a] to-[#0f1b2d] px-4">
      <div className="w-full max-w-sm animate-[fadeIn_0.5s_ease] text-center">
        <div className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/10 bg-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.4)] backdrop-blur-xl">
          <Lock className="h-9 w-9 text-white" strokeWidth={1.6} />
        </div>
        <h1 className="mb-1.5 text-3xl font-bold tracking-tight text-white">My Space</h1>
        <p className="mb-9 text-[15px] text-white/40">
          {mode === 'signin' ? 'Sign in to your space' : 'Create your space'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3 text-left">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-white/50">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.06] px-3.5 py-2.5 text-sm text-white outline-none placeholder:text-white/30 focus:border-white/30"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
          {info && <p className="text-sm font-medium text-emerald-400">{info}</p>}

          <button
            type="submit"
            disabled={loading}
            className="!mt-6 w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === 'signin' ? 'signup' : 'signin');
            setError('');
            setInfo('');
          }}
          className="mt-5 text-[13px] text-white/40 transition hover:text-white/70"
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { CalendarPlus, X, Copy, Check, ListChecks, RefreshCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export function CalendarSyncModal() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState('');

  async function openModal() {
    setOpen(true);
    checkGoogleStatus();
    if (url) return;
    setLoading(true);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    let { data: row } = await supabase.from('calendar_tokens').select('token').eq('user_id', user.id).maybeSingle();
    if (!row) {
      const { data: inserted } = await supabase.from('calendar_tokens').insert({ user_id: user.id }).select('token').single();
      row = inserted;
    }
    if (row) setUrl(`${window.location.origin}/api/feed/${row.token}`);
    setLoading(false);
  }

  async function checkGoogleStatus() {
    try {
      const res = await fetch('/api/google/status');
      const data = await res.json();
      setGoogleConnected(!!data.connected);
    } catch {
      setGoogleConnected(false);
    }
  }

  async function syncNow() {
    setSyncing(true);
    setSyncMsg('');
    try {
      const res = await fetch('/api/google/pull', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      const parts = [];
      if (data.pulled > 0) parts.push(`${data.pulled} new`);
      if (data.updated > 0) parts.push(`${data.updated} updated`);
      setSyncMsg(parts.length ? `Imported: ${parts.join(', ')} ✓ Reloading…` : 'Nothing new ✓');
      if (parts.length) {
        setTimeout(() => window.location.reload(), 900);
        return;
      }
    } catch (e) {
      setSyncMsg(e instanceof Error ? e.message : 'Import failed');
    }
    setSyncing(false);
  }

  function copy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <>
      <button
        onClick={openModal}
        className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text3 transition hover:bg-accent-bg hover:text-accent"
      >
        <CalendarPlus size={13} /> Sync
      </button>

      {open && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[15px] font-semibold text-text">
                <CalendarPlus size={17} /> Sync
              </div>
              <button onClick={() => setOpen(false)} className="text-text4 hover:text-text">
                <X size={16} />
              </button>
            </div>

            <div className="mb-2 text-[12.5px] font-semibold text-text2">Calendar (read-only)</div>
            <p className="mb-3 text-[12px] leading-relaxed text-text3">
              Subscribe to this link from Google Calendar (Samsung Calendar syncs with it automatically) to see your
              dated tasks and reminders — it refreshes on its own every hour or so.
            </p>

            {loading && <div className="text-[13px] text-text3">Generating your link…</div>}

            {!loading && url && (
              <>
                <div className="mb-3 flex items-center gap-2 rounded-lg border border-border bg-bg3 px-2.5 py-2">
                  <code className="flex-1 truncate text-[11.5px] text-text2">{url}</code>
                  <button onClick={copy} className="shrink-0 rounded-md bg-accent-bg p-1.5 text-accent hover:brightness-95">
                    {copied ? <Check size={13} /> : <Copy size={13} />}
                  </button>
                </div>
                <div className="mb-4 space-y-1 text-[11.5px] text-text3">
                  <div>1. Google Calendar app → Settings → Add calendar → From URL</div>
                  <div>2. Paste the link above and tap Add calendar</div>
                  <div>3. Shows up in Samsung Calendar automatically via your Google account</div>
                </div>
              </>
            )}

            {!loading && !url && <div className="mb-4 text-[13px] text-red">Couldn&apos;t generate a link — try again.</div>}

            <div className="border-t border-border2 pt-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-text2">
                <ListChecks size={13} /> Google Tasks (import only)
              </div>
              <p className="mb-2 text-[11.5px] leading-relaxed text-text3">
                One-way: anything you add via Google Assistant/Gemini (which lands in your default Google Tasks list)
                gets imported here. My Space never changes anything in Google Tasks.
              </p>

              {googleConnected === null && <div className="text-[12.5px] text-text3">Checking connection…</div>}

              {googleConnected === false && (
                <a
                  href="/api/google/connect"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-[12.5px] font-medium text-white hover:brightness-105"
                >
                  Connect Google Tasks
                </a>
              )}

              {googleConnected === true && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={syncNow}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-accent-bg px-3 py-1.5 text-[12.5px] font-medium text-accent hover:brightness-95 disabled:opacity-50"
                  >
                    <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} /> {syncing ? 'Checking…' : 'Import now'}
                  </button>
                  {syncMsg && <span className="text-[11.5px] text-text3">{syncMsg}</span>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

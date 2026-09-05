'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Activity,
  ListChecks,
  Bell,
  PenLine,
  Calendar,
  BarChart3,
  Eye,
  MoreHorizontal,
  Lock,
  Download,
  Upload,
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { createClient } from '@/lib/supabase/client';
import { useRef } from 'react';
import { useLock } from '@/components/LockOverlay';
import { exportData, importData } from '@/lib/exportImport';
import { CalendarSyncModal } from '@/components/CalendarSyncModal';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/journal', label: 'Journal', icon: FileText },
  { href: '/habits', label: 'Habits', icon: Activity },
  { href: '/tasks', label: 'Tasks', icon: ListChecks },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/notes', label: 'Notes', icon: PenLine },
  { href: '/planner', label: 'Planner', icon: Calendar },
  { href: '/log', label: 'Daily Log', icon: BarChart3 },
  { href: '/watch', label: 'Watch', icon: Eye },
  { href: '/others', label: 'Others', icon: MoreHorizontal },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lock } = useLock();
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace('/login');
  }

  return (
    <aside className="flex w-[232px] min-w-[232px] flex-col border-r border-border bg-surface">
      <div className="px-4 pb-3.5 pt-4.5 pt-[18px]">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-br from-accent to-[#8b7cf0] text-[15px] font-extrabold text-white shadow-[0_3px_10px_rgba(108,92,231,0.35)]">
            A
          </div>
          <div>
            <div className="text-[14.5px] font-bold tracking-tight text-text">My Space</div>
            <div className="mt-px text-[11px] text-text3">Your personal OS</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-2">
        <div className="px-2.5 pb-1.5 pt-3 text-[10.5px] font-bold uppercase tracking-wide text-text4">
          Workspace
        </div>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`mb-0.5 flex select-none items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13.5px] font-medium transition ${
                active
                  ? 'bg-accent text-white shadow-[0_4px_12px_rgba(108,92,231,0.28)]'
                  : 'text-text2 hover:bg-bg3 hover:text-text'
              }`}
            >
              <Icon size={15} strokeWidth={1.8} className={active ? 'text-white' : 'text-text3'} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-2 border-t border-border2 p-3">
        <div className="flex items-center justify-between">
          <ThemeToggle />
          <button
            onClick={lock}
            className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-text3 transition hover:bg-red-bg hover:text-red"
          >
            <Lock size={13} /> Lock
          </button>
        </div>
        <CalendarSyncModal />
        <div className="flex gap-1.5">
          <button
            onClick={exportData}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-bg py-1.5 text-xs font-medium text-green"
          >
            <Download size={13} /> Export
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-accent-bg py-1.5 text-xs font-medium text-accent"
          >
            <Upload size={13} /> Import
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            className="hidden"
            onChange={(e) => importData(e).catch(() => {})}
          />
        </div>
        <button
          onClick={handleSignOut}
          className="text-center text-[11px] text-text4 transition hover:text-red"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}

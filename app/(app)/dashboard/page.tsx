'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Segment, SegmentButton } from '@/components/ui/Segment';
import { useStore } from '@/lib/store';
import { today, toDS, timeToMin, minToTime, fmtD } from '@/lib/date';
import type { Todo, JournalEntry, RecurringTask, Reminder, WatchItem, DayShort } from '@/lib/types';
import { DAYS_SHORT } from '@/lib/types';
import { ChevronLeft, ChevronRight, Star, AlertTriangle, Ban, Eye, Briefcase, Home, Inbox } from 'lucide-react';

const CAL_HOUR_START = 6;
const CAL_HOUR_END = 22;
const CAT_COLOR: Record<string, string> = {
  Work: '#ff9f0a',
  Meeting: '#8b5cf6',
  Learning: '#2383e2',
  Exercise: '#0f7b6c',
  Personal: '#e03e3e',
  Admin: '#9b9b9b',
  Other: '#0b6e99',
};
const PRI_COLOR: Record<string, string> = { high: '#e0455a', medium: '#e08a2b', low: '#1fa672' };
const TASK_COL = {
  office: { bg: 'rgba(124,111,224,0.16)', c: '#6f5fd6', bar: '#6f5fd6' },
  personal: { bg: 'rgba(15,158,145,0.16)', c: '#0f9e91', bar: '#0f9e91' },
  google: { bg: 'rgba(66,133,244,0.16)', c: '#4285F4', bar: '#4285F4' },
};
const RECUR_COL = { bg: 'var(--bg3)', c: 'var(--text3)', bar: 'var(--text4)' };

function fmt12(t: string) {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
}

function dayKeyFor(date: Date): DayShort {
  const dayMap = [6, 0, 1, 2, 3, 4, 5];
  return DAYS_SHORT[dayMap[date.getDay()]];
}

interface CalItem {
  kind: 'task' | 'journal' | 'recurring';
  time: string;
  endTime: string;
  durMin: number;
  text: string;
  sub: string;
  id: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const { value: todos } = useStore<Todo[]>('todos', []);
  const { value: journal } = useStore<JournalEntry[]>('journal', []);
  const { value: recurring } = useStore<RecurringTask[]>('recurring_tasks', []);
  const { value: reminders } = useStore<Reminder[]>('reminders', []);
  const { value: watchItems } = useStore<WatchItem[]>('watch_items', []);

  const [viewMode, setViewMode] = useState<'day' | 'week'>('day');
  const [offset, setOffset] = useState(0);

  const now = new Date();
  const tds = today();
  const hour = now.getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dateLabel = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const overdueReminders = reminders.filter((r) => !r.done && new Date(r.datetime) < now).length;
  const blockedWatch = watchItems.filter((w) => w.status === 'blocked').length;

  function getTodayRecurringItems() {
    const dayKey = dayKeyFor(new Date());
    return recurring
      .filter((t) => t.active !== false && t.schedule[dayKey])
      .map((t) => ({
        type: 'recurring' as const,
        time: t.schedule[dayKey]!,
        sortKey: t.schedule[dayKey]!,
        endTime: t.endSchedule?.[dayKey] || '',
        id: t.id,
        text: t.name,
        cat: t.cat,
        pri: t.pri,
      }));
  }

  const allTasks = todos.filter((t) => !t.done);
  const timedTasks = allTasks.filter((t) => t.time);
  const starredNoTime = allTasks.filter((t) => t.today && !t.time);
  const otherTasks = allTasks.filter((t) => t.due === tds && !t.time && !t.today);
  const todayJournal = journal.filter((e) => e.date === tds);
  const recurringToday = getTodayRecurringItems();

  type TimelineItem =
    | { type: 'task'; sortKey: string; time: string; endTime: string; id: string; text: string; notes: string; pri: string; tab: string; today: boolean; due: string }
    | { type: 'journal'; sortKey: string; time: string; id: string; text: string; cat: string; dur: number }
    | { type: 'recurring'; sortKey: string; time: string; endTime: string; id: string; text: string; cat: string; pri: string };

  const timelineItems: TimelineItem[] = [
    ...timedTasks.map((t) => ({
      type: 'task' as const,
      sortKey: t.time,
      time: t.time,
      endTime: t.endTime || '',
      id: t.id,
      text: t.text,
      notes: t.notes,
      pri: t.pri,
      tab: t.tab,
      today: t.today,
      due: t.due,
    })),
    ...todayJournal.map((e) => ({
      type: 'journal' as const,
      sortKey: e.start || '00:00',
      time: e.start,
      id: e.id,
      text: e.title,
      cat: e.cat,
      dur: e.dur,
    })),
    ...recurringToday.map((r) => ({ type: 'recurring' as const, sortKey: r.sortKey, time: r.time, endTime: r.endTime, id: r.id, text: r.text, cat: r.cat, pri: r.pri })),
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const nowDividerIndex = timelineItems.findIndex((item) => item.sortKey >= currentTimeStr);
  const nowInsertedAtAll = nowDividerIndex !== -1;

  const dates = useMemo(() => {
    if (viewMode === 'day') {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      return [d];
    }
    const d = new Date();
    const dow = d.getDay();
    const mon = new Date(d);
    mon.setDate(d.getDate() - ((dow + 6) % 7) + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(mon);
      x.setDate(mon.getDate() + i);
      return x;
    });
  }, [viewMode, offset]);

  function getCalItemsForDate(date: Date): CalItem[] {
    const ds = toDS(date);
    const items: CalItem[] = [];
    todos
      .filter((t) => !t.done && t.due === ds && t.time)
      .forEach((t) => items.push({ kind: 'task', time: t.time, endTime: t.endTime || '', durMin: t.durMin || 45, text: t.text, sub: t.tab, id: t.id }));
    journal
      .filter((e) => e.date === ds && e.start)
      .forEach((e) => {
        const endM = timeToMin(e.start) + (e.dur || 30);
        items.push({ kind: 'journal', time: e.start, endTime: minToTime(endM), durMin: e.dur || 30, text: e.title, sub: e.cat, id: e.id });
      });
    const dayKey = dayKeyFor(date);
    recurring
      .filter((t) => t.active !== false && t.schedule[dayKey])
      .forEach((t) => items.push({ kind: 'recurring', time: t.schedule[dayKey]!, endTime: t.endSchedule?.[dayKey] || '', durMin: 30, text: t.name, sub: t.cat, id: t.id }));
    return items;
  }

  const rowH = viewMode === 'day' ? 56 : 46;
  const totalHours = CAL_HOUR_END - CAL_HOUR_START;
  const hours = Array.from({ length: totalHours }, (_, i) => CAL_HOUR_START + i);

  function calStyle(item: CalItem) {
    if (item.kind === 'journal') return { bg: `${CAT_COLOR[item.sub] || '#888'}26`, c: CAT_COLOR[item.sub] || '#888' };
    if (item.kind === 'recurring') return RECUR_COL;
    return TASK_COL[item.sub as 'office' | 'personal' | 'google'] || TASK_COL.office;
  }

  function itemTop(time: string) {
    const mins = timeToMin(time) - CAL_HOUR_START * 60;
    return Math.max(0, (mins / 60) * rowH);
  }
  function itemHeight(durMin: number) {
    return Math.max(18, (durMin / 60) * rowH - 2);
  }

  const watchOpen = watchItems.filter((w) => w.status !== 'done');

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[26px] font-bold tracking-tight text-text">{greet}</div>
          <div className="mt-0.5 text-[13px] text-text3">{dateLabel}</div>
        </div>
        <div className="flex gap-2">
          {overdueReminders > 0 && (
            <button
              onClick={() => router.push('/reminders')}
              className="flex items-center gap-1 rounded bg-red-bg px-2.5 py-1 text-[11px] font-semibold text-red"
            >
              <AlertTriangle size={11} /> {overdueReminders} overdue reminder{overdueReminders > 1 ? 's' : ''}
            </button>
          )}
          {blockedWatch > 0 && (
            <button
              onClick={() => router.push('/watch')}
              className="flex items-center gap-1 rounded bg-red-bg px-2.5 py-1 text-[11px] font-semibold text-red"
            >
              <Ban size={11} /> {blockedWatch} blocked item{blockedWatch > 1 ? 's' : ''}
            </button>
          )}
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Segment>
          <SegmentButton active={viewMode === 'day'} onClick={() => setViewMode('day')}>
            Day
          </SegmentButton>
          <SegmentButton active={viewMode === 'week'} onClick={() => setViewMode('week')}>
            Week
          </SegmentButton>
        </Segment>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setOffset((o) => o - 1)} className="rounded-md p-1 text-text3 hover:bg-bg3">
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[140px] text-center text-[13px] font-medium text-text">
            {viewMode === 'day'
              ? dates[0].toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
              : `${dates[0].toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} — ${dates[6].toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}`}
          </span>
          <button onClick={() => setOffset((o) => o + 1)} className="rounded-md p-1 text-text3 hover:bg-bg3">
            <ChevronRight size={16} />
          </button>
          {offset !== 0 && (
            <button onClick={() => setOffset(0)} className="ml-1 rounded-md bg-bg3 px-2 py-1 text-[11px] text-text3 hover:text-text">
              Today
            </button>
          )}
        </div>
      </div>

      <Card className="mb-6 overflow-hidden">
        <div className="flex">
          <div className="shrink-0 border-r border-border2" style={{ width: 46 }}>
            <div style={{ height: 20 }} />
            {hours.map((h) => (
              <div key={h} style={{ height: rowH }} className="pr-1.5 text-right text-[10px] text-text4">
                {h % 12 || 12}
                {h >= 12 ? 'p' : 'a'}
              </div>
            ))}
          </div>
          <div className="flex flex-1 overflow-x-auto">
            {dates.map((d) => {
              const items = getCalItemsForDate(d);
              const isToday = toDS(d) === tds;
              return (
                <div key={d.toISOString()} className={`relative flex-1 border-r border-border2 last:border-r-0 ${viewMode === 'week' ? 'min-w-[110px]' : ''}`}>
                  <div className={`sticky top-0 z-10 flex h-5 items-center justify-center border-b border-border2 bg-surface text-[10px] font-semibold ${isToday ? 'text-accent' : 'text-text3'}`}>
                    {viewMode === 'week' ? d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }) : ''}
                  </div>
                  <div className="relative" style={{ height: rowH * totalHours }}>
                    {hours.map((h) => (
                      <div key={h} className="absolute left-0 right-0 border-b border-border2" style={{ top: (h - CAL_HOUR_START) * rowH, height: rowH }} />
                    ))}
                    {items.map((item) => {
                      const style = calStyle(item);
                      return (
                        <button
                          key={item.id + item.kind}
                          onClick={() => router.push(item.kind === 'journal' ? '/journal' : '/tasks')}
                          className="absolute left-1 right-1 overflow-hidden rounded-md border-l-2 px-1.5 py-0.5 text-left text-[10.5px] leading-tight"
                          style={{ top: itemTop(item.time), height: itemHeight(item.durMin), background: style.bg, borderColor: style.c, color: style.c }}
                        >
                          <div className="truncate font-medium">{item.text}</div>
                          <div className="truncate opacity-80">{fmt12(item.time)}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      {timelineItems.length > 0 && (
        <>
          <SectionLabel>Today&apos;s Timeline</SectionLabel>
          <Card className="mb-5">
            {timelineItems.map((item, idx) => {
              const isPast = item.sortKey < currentTimeStr;
              const showDivider = idx === nowDividerIndex;
              return (
                <div key={item.type + item.id}>
                  {showDivider && (
                    <div className="flex items-center gap-2 px-3.5 py-1">
                      <span className="h-2 w-2 rounded-full bg-red" />
                      <span className="text-[11px] font-bold text-red">NOW · {fmt12(currentTimeStr)}</span>
                      <span className="h-px flex-1 bg-red/30" />
                    </div>
                  )}
                  <button
                    onClick={() => router.push(item.type === 'journal' ? '/journal' : '/tasks')}
                    className={`flex w-full items-start gap-2.5 border-b border-border2 px-3.5 py-2.5 text-left last:border-b-0 hover:bg-bg3 ${isPast ? 'opacity-45' : ''}`}
                  >
                    <div className="w-[54px] shrink-0 pt-0.5 text-right">
                      <div className={`text-[11px] font-semibold ${item.type === 'task' && item.today ? 'text-accent' : 'text-text3'}`}>{fmt12(item.time)}</div>
                      {'endTime' in item && item.endTime && <div className="text-[10px] text-text4">{fmt12(item.endTime)}</div>}
                    </div>
                    <div
                      className="mt-0.5 min-h-[36px] w-0.5 shrink-0 rounded opacity-60"
                      style={{
                        background:
                          item.type === 'journal' ? CAT_COLOR[item.cat] || '#ccc' : item.type === 'task' ? PRI_COLOR[item.pri] : 'var(--text4)',
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[13px] font-medium text-text">
                        <span className="truncate">{item.text}</span>
                        {item.type === 'task' && item.today && <Star size={10} className="shrink-0 fill-accent text-accent" />}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-text3">
                        {item.type === 'task' && (
                          <>
                            <span className="inline-flex items-center gap-0.5">
                              {item.tab === 'office' && <Briefcase size={10} />}
                              {item.tab === 'personal' && <Home size={10} />}
                              {item.tab === 'google' && <Inbox size={10} />}
                              {item.tab}
                            </span>
                            <span style={{ color: PRI_COLOR[item.pri] }} className="font-semibold">
                              {item.pri}
                            </span>
                            {item.due && <span className="text-text4">Due {fmtD(item.due)}</span>}
                          </>
                        )}
                        {item.type === 'journal' && (
                          <>
                            <span style={{ color: CAT_COLOR[item.cat] }} className="font-semibold">
                              {item.cat}
                            </span>
                            {item.dur && <span>{item.dur} min</span>}
                          </>
                        )}
                        {item.type === 'recurring' && (
                          <>
                            <span>{item.cat}</span>
                            <span className="rounded bg-bg3 px-1 text-text4">↻ recurring</span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                </div>
              );
            })}
            {!nowInsertedAtAll && (
              <div className="flex items-center gap-2 px-3.5 py-2">
                <span className="h-2 w-2 rounded-full bg-red" />
                <span className="text-[11px] font-bold text-red">NOW · {fmt12(currentTimeStr)}</span>
              </div>
            )}
          </Card>
        </>
      )}

      {starredNoTime.length > 0 && (
        <>
          <SectionLabel>Today&apos;s Focus</SectionLabel>
          <Card className="mb-5">
            {starredNoTime.map((t) => (
              <button
                key={t.id}
                onClick={() => router.push('/tasks')}
                className="flex w-full items-center gap-2 border-b border-border2 px-3.5 py-2 text-left last:border-b-0 hover:bg-bg3"
              >
                <span className="h-3.5 w-3.5 shrink-0 rounded-full border border-text4" />
                <span className="flex-1 text-[13px] text-text">{t.text}</span>
                <span className="text-[10px] font-semibold" style={{ color: PRI_COLOR[t.pri] }}>
                  {t.pri}
                </span>
                <Star size={11} className="fill-accent text-accent" />
              </button>
            ))}
          </Card>
        </>
      )}

      {(['office', 'personal', 'google'] as const).map((tab) => {
        const list = otherTasks.filter((t) => t.tab === tab).sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.pri] - { high: 0, medium: 1, low: 2 }[b.pri]));
        if (!list.length) return null;
        const label = tab === 'office' ? 'Office' : tab === 'personal' ? 'Personal' : 'Google Tasks';
        return (
          <div key={tab}>
            <SectionLabel>
              {tab === 'office' && <Briefcase size={11} className="mr-1 inline" />}
              {tab === 'personal' && <Home size={11} className="mr-1 inline" />}
              {tab === 'google' && <Inbox size={11} className="mr-1 inline" />}
              Due Today — {label}
            </SectionLabel>
            <Card className="mb-5">
              {list.map((t) => (
                <button
                  key={t.id}
                  onClick={() => router.push('/tasks')}
                  className="flex w-full items-center gap-2 border-b border-border2 px-3.5 py-2 text-left last:border-b-0 hover:bg-bg3"
                >
                  <span className="h-3.5 w-3.5 shrink-0 rounded border border-text4" />
                  <span className="flex-1 text-[13px] text-text">{t.text}</span>
                  <span
                    className="text-[10px]"
                    style={{ color: t.due < tds ? 'var(--red)' : t.due === tds ? 'var(--orange)' : 'var(--text4)' }}
                  >
                    {t.due === tds ? 'today' : fmtD(t.due)}
                  </span>
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PRI_COLOR[t.pri] }} />
                </button>
              ))}
            </Card>
          </div>
        );
      })}

      {!timelineItems.length && !starredNoTime.length && !otherTasks.length && (
        <Card className="mb-5">
          <div className="px-6 py-10 text-center">
            <div className="mb-1 text-sm font-medium text-text">Nothing planned for today</div>
            <div className="text-xs text-text3">Go to Tasks and star what you want to work on today</div>
          </div>
        </Card>
      )}

      {watchOpen.length > 0 && (
        <>
          <SectionLabel>
            <Eye size={11} className="mr-1 inline" /> Watch List
          </SectionLabel>
          <Card>
            {watchOpen
              .sort((a, b) => ({ blocked: 0, 'at-risk': 1, pending: 2, 'on-track': 3, done: 4 }[a.status] - { blocked: 0, 'at-risk': 1, pending: 2, 'on-track': 3, done: 4 }[b.status]))
              .map((w) => {
                const dot = { 'on-track': '#0f7b6c', 'at-risk': '#d9730d', blocked: '#e03e3e', pending: '#787774', done: '#aeaaa4' }[w.status];
                const label = { 'on-track': 'On Track', 'at-risk': 'At Risk', blocked: 'Blocked', pending: 'Pending', done: 'Done' }[w.status];
                const isOverdue = w.due && w.due < tds;
                const isDueToday = w.due === tds;
                const lastUpdate = w.updates?.[0];
                return (
                  <button
                    key={w.id}
                    onClick={() => router.push('/watch')}
                    className="flex w-full items-start gap-2.5 border-b border-border2 px-3.5 py-2.5 text-left last:border-b-0 hover:bg-bg3"
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-text">{w.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className="text-[11px] font-semibold" style={{ color: dot }}>
                          {label}
                        </span>
                        {w.owner && <span className="text-[11px] text-text3">→ {w.owner}</span>}
                        {w.due && (
                          <span className="text-[11px]" style={{ color: isOverdue ? 'var(--red)' : isDueToday ? 'var(--orange)' : 'var(--text4)' }}>
                            {isOverdue ? 'Overdue' : isDueToday ? 'Due today' : fmtD(w.due)}
                          </span>
                        )}
                      </div>
                      {lastUpdate && <div className="mt-0.5 text-[11px] italic text-text3">&quot;{lastUpdate.text}&quot;</div>}
                    </div>
                    {w.updates?.length > 0 && (
                      <div className="shrink-0 pt-0.5 text-[10px] text-text4">
                        {w.updates.length} update{w.updates.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </button>
                );
              })}
          </Card>
        </>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-text3">{children}</div>;
}

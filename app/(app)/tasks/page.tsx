'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardPadded } from '@/components/ui/Card';
import { Field, Input, Textarea, Select } from '@/components/ui/Field';
import { Button, IconButton } from '@/components/ui/Button';
import { Segment, SegmentButton } from '@/components/ui/Segment';
import { useStore } from '@/lib/store';
import { uid, today, fmtD, timeToMin, minToTime } from '@/lib/date';
import type { Todo, Subtask, RecurringTask, DayShort, Priority } from '@/lib/types';
import { DAYS_SHORT } from '@/lib/types';
import {
  Pencil,
  X,
  Check,
  Star,
  Search,
  Briefcase,
  Home,
  Repeat,
  Calendar,
  Clock,
  Hourglass,
  ListChecks,
  Pause,
  Play,
  ChevronDown,
  Inbox,
  type LucideIcon,
} from 'lucide-react';

const DAYS_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PRI_META: Record<Priority, { label: string; badge: string }> = {
  high: { label: 'High', badge: 'bg-red-bg text-red' },
  medium: { label: 'Medium', badge: 'bg-orange-bg text-orange' },
  low: { label: 'Low', badge: 'bg-green-bg text-green' },
};
const TAB_BAR = { office: 'bg-[#6f5fd6]', personal: 'bg-[#0f9e91]', google: 'bg-[#4285F4]' };

const emptyForm = { text: '', notes: '', pri: 'medium' as Priority, due: '', time: '', dur: '' };

function fmtTimeLabel(t: string) {
  if (!t) return '--:--';
  const [h, m] = t.split(':').map(Number);
  const ap = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ap}`;
}

export default function TasksPage() {
  const { value: todos, setValue: setTodos, loaded, reload: reloadTodos } = useStore<Todo[]>('todos', []);
  const { value: recurring, setValue: setRecurring, loaded: recurLoaded } = useStore<RecurringTask[]>('recurring_tasks', []);
  const [pulledNotice, setPulledNotice] = useState('');
  const [pendingGooglePush, setPendingGooglePush] = useState<Set<string>>(new Set());
  const hasAutoPulledRef = useRef(false);

  useEffect(() => {
    if (!loaded) return;
    // React StrictMode runs effects twice in dev — without this guard, two
    // overlapping pull+reload cycles race each other and can wipe out an
    // id you just clicked before the click is processed.
    if (hasAutoPulledRef.current) return;
    hasAutoPulledRef.current = true;
    (async () => {
      try {
        const res = await fetch('/api/google/pull', { method: 'POST' });
        const data = await res.json();
        if (data.connected === false) return;
        if (data.pulled > 0 || data.updated > 0) {
          await reloadTodos();
          const parts = [];
          if (data.pulled > 0) parts.push(`${data.pulled} new from Google`);
          if (data.updated > 0) parts.push(`${data.updated} updated`);
          setPulledNotice(parts.join(', '));
          setTimeout(() => setPulledNotice(''), 4000);
        }
      } catch {
        // silent — background convenience sync, not user-initiated
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  const [tab, setTab] = useState<'office' | 'personal' | 'google' | 'recurring'>('office');
  const [filter, setFilter] = useState<'all' | 'unplanned' | 'planned'>('all');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [formExpanded, setFormExpanded] = useState(false);
  const [editingCell, setEditingCell] = useState<{ id: string; field: 'due' | 'time' | 'dur' | 'pri' } | null>(null);

  function inlineUpdate(t: Todo, patch: Partial<Todo>) {
    const merged = { ...t, ...patch };
    if (patch.time !== undefined || patch.durMin !== undefined) {
      merged.endTime = merged.time && merged.durMin ? minToTime(timeToMin(merged.time) + merged.durMin) : '';
    }
    setTodos((arr) => arr.map((x) => (x.id === t.id ? merged : x)));
  }

  const [rtName, setRtName] = useState('');
  const [rtCat, setRtCat] = useState<'office' | 'personal'>('office');
  const [rtPri, setRtPri] = useState<Priority>('medium');
  const [rtSchedule, setRtSchedule] = useState<Partial<Record<DayShort, string>>>({});
  const [rtEndSchedule, setRtEndSchedule] = useState<Partial<Record<DayShort, string>>>({});
  const [rtEditId, setRtEditId] = useState<string | null>(null);

  function addSubtask() {
    const t = subtaskDraft.trim();
    if (!t) return;
    setSubtasks((s) => [...s, { id: 's_' + uid(), text: t, done: false }]);
    setSubtaskDraft('');
  }

  function saveTodo() {
    if (!form.text.trim()) return alert('Enter a task');
    const durMin = form.dur ? Math.max(5, Math.round(parseFloat(form.dur) * 60)) : 0;
    const endTime = form.time && durMin ? minToTime(timeToMin(form.time) + durMin) : '';
    if (editId) {
      setTodos((arr) =>
        arr.map((t) =>
          t.id === editId
            ? { ...t, text: form.text.trim(), notes: form.notes.trim(), pri: form.pri, due: form.due, time: form.time, durMin, endTime, subtasks }
            : t,
        ),
      );
      setEditId(null);
    } else {
      setTodos((arr) => [
        ...arr,
        {
          id: uid(),
          tab: tab === 'recurring' ? 'office' : tab,
          text: form.text.trim(),
          notes: form.notes.trim(),
          pri: form.pri,
          due: form.due,
          time: form.time,
          durMin,
          endTime,
          subtasks,
          done: false,
          today: false,
          completedAt: '',
          created: today(),
        },
      ]);
    }
    setForm(emptyForm);
    setSubtasks([]);
    setFormExpanded(false);
  }

  function editTodo(t: Todo) {
    setForm({
      text: t.text,
      notes: t.notes,
      pri: t.pri,
      due: t.due,
      time: t.time,
      dur: t.durMin ? String(Math.round((t.durMin / 60) * 100) / 100) : '',
    });
    setSubtasks(t.subtasks || []);
    setEditId(t.id);
    setFormExpanded(true);
    if (t.tab !== tab) setTab(t.tab);
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm);
    setSubtasks([]);
    setFormExpanded(false);
  }

  function removeTodo(id: string) {
    if (!confirm('Delete task?')) return;
    setTodos((arr) => arr.filter((t) => t.id !== id));
  }

  async function toggleDone(id: string) {
    // Read from the current render's `todos` (real component state) rather
    // than from inside the setTodos updater callback — React doesn't
    // guarantee that callback runs synchronously, so values captured from
    // inside it were unreliable (always undefined here in practice).
    const current = todos.find((t) => t.id === id);
    if (!current) return;
    const nextDone = !current.done;
    const { googleTaskId, googleListId } = current;

    setTodos((arr) => arr.map((t) => (t.id === id ? { ...t, done: nextDone, completedAt: nextDone ? today() : '' } : t)));

    if (googleTaskId && googleListId) {
      // Wait for Google to actually confirm the status change before this id
      // is considered "safe" — otherwise a Sync/Import click fired in the
      // gap would read Google's still-stale status and flip it back here.
      setPendingGooglePush((s) => new Set(s).add(id));
      try {
        await fetch('/api/google/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ taskId: googleTaskId, listId: googleListId, completed: nextDone }),
        });
      } catch {
        // ignore — local state already reflects the intended change
      }
      setPendingGooglePush((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  function toggleToday(id: string) {
    setTodos((arr) => arr.map((t) => (t.id === id ? { ...t, today: !t.today } : t)));
  }

  function toggleSubtaskDone(taskId: string, stId: string) {
    setTodos((arr) =>
      arr.map((t) =>
        t.id === taskId ? { ...t, subtasks: t.subtasks.map((s) => (s.id === stId ? { ...s, done: !s.done } : s)) } : t,
      ),
    );
  }

  const todayList = useMemo(() => todos.filter((t) => t.today && !t.done), [todos]);

  const filtered = useMemo(() => {
    let arr = todos.filter((t) => t.tab === tab);
    if (filter === 'unplanned') arr = arr.filter((t) => !t.due && !t.time && !t.done);
    else if (filter === 'planned') arr = arr.filter((t) => (t.due || t.time) && !t.done);
    if (search) {
      const s = search.toLowerCase();
      arr = arr.filter((t) => t.text.toLowerCase().includes(s) || (t.notes || '').toLowerCase().includes(s));
    }
    return [...arr].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      return (a.due || '9999').localeCompare(b.due || '9999');
    });
  }, [todos, tab, filter, search]);

  const tdy = today();

  function saveRecurring() {
    if (!rtName.trim()) return alert('Enter a task name');
    if (!Object.keys(rtSchedule).some((d) => rtSchedule[d as DayShort])) return alert('Set at least one day time');
    const task: RecurringTask = {
      id: rtEditId ?? uid(),
      name: rtName.trim(),
      cat: rtCat,
      pri: rtPri,
      schedule: rtSchedule,
      endSchedule: rtEndSchedule,
      active: true,
      created: today(),
    };
    setRecurring((arr) => (rtEditId ? arr.map((t) => (t.id === rtEditId ? { ...task, active: t.active } : t)) : [...arr, task]));
    setRtEditId(null);
    setRtName('');
    setRtSchedule({});
    setRtEndSchedule({});
  }

  function editRecurring(t: RecurringTask) {
    setRtName(t.name);
    setRtCat(t.cat);
    setRtPri(t.pri);
    setRtSchedule(t.schedule);
    setRtEndSchedule(t.endSchedule);
    setRtEditId(t.id);
  }

  function removeRecurring(id: string) {
    if (!confirm('Delete this recurring task?')) return;
    setRecurring((arr) => arr.filter((t) => t.id !== id));
  }

  function toggleRecurringActive(id: string) {
    setRecurring((arr) => arr.map((t) => (t.id === id ? { ...t, active: !t.active } : t)));
  }

  return (
    <div>
      <div className="mb-4.5 flex flex-wrap items-start justify-between gap-4">
        <PageHeader title="Tasks" sub="Plan smart — focus on what matters today" />
        {tab !== 'recurring' && (
          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text4" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks..." className="w-56 pl-8" />
          </div>
        )}
      </div>

      {pulledNotice && (
        <div className="mb-4 rounded-lg bg-accent-bg px-3 py-2 text-[12.5px] font-medium text-accent">
          Synced from Google Tasks: {pulledNotice}
        </div>
      )}

      {tab !== 'recurring' && (
        <Card className="mb-4 border-accent-bg bg-accent-bg/30">
          <CardPadded>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent" />
              <span className="text-[11px] font-bold uppercase tracking-wide text-accent">Today&apos;s Focus</span>
            </div>
            {todayList.length === 0 ? (
              <div className="text-[12.5px] text-text3">Star any task to pull it onto your dashboard for today</div>
            ) : (
              <div className="space-y-1">
                {todayList.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 border-b border-border2 py-1 last:border-b-0">
                    <button
                      onClick={() => toggleDone(t.id)}
                      className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border border-border"
                    />
                    <span className="flex-1 text-[13px] font-medium text-text">{t.text}</span>
                    <span className="text-[10px] text-accent opacity-70">{t.tab}</span>
                    <button onClick={() => toggleToday(t.id)}>
                      <Star size={13} className="fill-orange text-orange" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardPadded>
        </Card>
      )}

      <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
        {tab !== 'recurring' ? (
          <Segment>
            <SegmentButton active={filter === 'all'} onClick={() => setFilter('all')}>
              All
            </SegmentButton>
            <SegmentButton active={filter === 'unplanned'} onClick={() => setFilter('unplanned')}>
              Unplanned
            </SegmentButton>
            <SegmentButton active={filter === 'planned'} onClick={() => setFilter('planned')}>
              Planned
            </SegmentButton>
          </Segment>
        ) : (
          <div />
        )}
        <Segment>
          <SegmentButton active={tab === 'office'} onClick={() => setTab('office')}>
            <span className="inline-flex items-center gap-1.5">
              <Briefcase size={13} /> Office
            </span>
          </SegmentButton>
          <SegmentButton active={tab === 'personal'} onClick={() => setTab('personal')}>
            <span className="inline-flex items-center gap-1.5">
              <Home size={13} /> Personal
            </span>
          </SegmentButton>
          <SegmentButton active={tab === 'google'} onClick={() => setTab('google')}>
            <span className="inline-flex items-center gap-1.5">
              <Inbox size={13} /> Google Tasks
            </span>
          </SegmentButton>
          <SegmentButton active={tab === 'recurring'} onClick={() => setTab('recurring')}>
            <span className="inline-flex items-center gap-1.5">
              <Repeat size={13} /> Recurring
            </span>
          </SegmentButton>
        </Segment>
      </div>

      {tab === 'recurring' ? (
        <>
          <Card className="mb-4">
            <CardPadded>
              <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <Field label="Task Name">
                  <Input value={rtName} onChange={(e) => setRtName(e.target.value)} placeholder="e.g. Standup, Gym..." />
                </Field>
                <Field label="Category">
                  <Select value={rtCat} onChange={(e) => setRtCat(e.target.value as 'office' | 'personal')}>
                    <option value="office">Office</option>
                    <option value="personal">Personal</option>
                  </Select>
                </Field>
                <Field label="Priority">
                  <Select value={rtPri} onChange={(e) => setRtPri(e.target.value as Priority)}>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </Select>
                </Field>
              </div>
              <div className="mb-1.5 text-[11.5px] font-medium text-text3">Weekly schedule (start / end time per day)</div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {DAYS_SHORT.map((d, i) => (
                  <div key={d} className="rounded-lg bg-bg3 p-2">
                    <div className="mb-1 text-[11px] font-semibold text-text3">{DAYS_LABELS[i]}</div>
                    <input
                      type="time"
                      value={rtSchedule[d] || ''}
                      onChange={(e) => setRtSchedule((s) => ({ ...s, [d]: e.target.value }))}
                      className="mb-1 w-full rounded border border-border bg-surface px-1 py-0.5 text-[11px] text-text"
                    />
                    <input
                      type="time"
                      value={rtEndSchedule[d] || ''}
                      onChange={(e) => setRtEndSchedule((s) => ({ ...s, [d]: e.target.value }))}
                      className="w-full rounded border border-border bg-surface px-1 py-0.5 text-[11px] text-text"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-3 flex gap-2">
                <Button onClick={saveRecurring}>{rtEditId ? 'Save' : 'Add Recurring Task'}</Button>
                {rtEditId && (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setRtEditId(null);
                      setRtName('');
                      setRtSchedule({});
                      setRtEndSchedule({});
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </CardPadded>
          </Card>

          <div className="space-y-2">
            {!recurLoaded && <div className="text-sm text-text3">Loading…</div>}
            {recurLoaded && recurring.length === 0 && (
              <Card>
                <CardPadded className="py-8 text-center">
                  <Repeat className="mx-auto mb-2 text-text4" size={20} />
                  <div className="text-sm font-medium text-text">No recurring tasks</div>
                  <div className="mt-0.5 text-xs text-text3">Add tasks that repeat on a weekly schedule</div>
                </CardPadded>
              </Card>
            )}
            {recurring.map((t) => (
              <Card key={t.id}>
                <CardPadded className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="font-medium text-text">{t.name}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${t.cat === 'office' ? 'bg-accent-bg text-accent' : 'bg-green-bg text-green'}`}>
                        {t.cat}
                      </span>
                      <span className="rounded bg-bg3 px-1.5 py-0.5 text-[10px] text-text3">{t.pri}</span>
                      {!t.active && <span className="rounded bg-bg3 px-1.5 py-0.5 text-[10px] text-text3">Paused</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_SHORT.map((d, i) => (
                        <div key={d} className="w-14 rounded-md bg-bg3 px-1.5 py-1 text-center">
                          <div className="text-[9px] font-semibold text-text3">{DAYS_LABELS[i]}</div>
                          <div className={`text-[11px] ${t.schedule[d] ? 'font-medium text-text' : 'text-text4'}`}>
                            {t.schedule[d] ? fmtTimeLabel(t.schedule[d]!) : '—'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton danger={false} onClick={() => toggleRecurringActive(t.id)}>
                      {t.active ? <Pause size={13} /> : <Play size={13} />}
                    </IconButton>
                    <IconButton danger={false} onClick={() => editRecurring(t)}>
                      <Pencil size={13} />
                    </IconButton>
                    <IconButton onClick={() => removeRecurring(t.id)}>
                      <X size={13} />
                    </IconButton>
                  </div>
                </CardPadded>
              </Card>
            ))}
          </div>
        </>
      ) : (
        <>
          <Card className="mb-4">
            <CardPadded>
              <div className="flex items-center gap-2">
                <Input
                  value={form.text}
                  onChange={(e) => setForm({ ...form, text: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), saveTodo())}
                  placeholder="Add a task and press Enter..."
                  className="flex-1"
                />
                <Button onClick={saveTodo}>{editId ? 'Save' : 'Add'}</Button>
                {editId && (
                  <Button variant="ghost" onClick={cancelEdit}>
                    Cancel
                  </Button>
                )}
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <PillDateInput icon={Calendar} value={form.due} onChange={(v) => setForm({ ...form, due: v })} placeholder="Due date" />
                <PillTimeInput icon={Clock} value={form.time} onChange={(v) => setForm({ ...form, time: v })} placeholder="Time" />
                <label className="flex items-center gap-1 rounded-full border border-border bg-bg3 px-2 py-1 text-[11.5px] text-text3">
                  <Hourglass size={11} />
                  <input
                    type="number"
                    step="0.25"
                    min="0"
                    value={form.dur}
                    onChange={(e) => setForm({ ...form, dur: e.target.value })}
                    placeholder="hrs"
                    className="w-10 bg-transparent outline-none placeholder:text-text4"
                  />
                </label>
                <select
                  value={form.pri}
                  onChange={(e) => setForm({ ...form, pri: e.target.value as Priority })}
                  className={`rounded-full border border-border px-2.5 py-1 text-[11.5px] font-medium outline-none ${PRI_META[form.pri].badge}`}
                >
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <button
                  onClick={() => setFormExpanded((v) => !v)}
                  className="ml-auto flex items-center gap-1 rounded-full px-2 py-1 text-[11.5px] text-text3 hover:text-text"
                >
                  {formExpanded ? 'Less' : 'Notes & subtasks'}
                  <ChevronDown size={12} className={`transition ${formExpanded ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {formExpanded && (
                <div className="mt-3 space-y-2.5 border-t border-border2 pt-3">
                  <Field label="Notes">
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Add notes (optional)..." />
                  </Field>
                  <Field label="Subtasks">
                    {subtasks.length > 0 && (
                      <div className="mb-2 space-y-1">
                        {subtasks.map((s) => (
                          <div key={s.id} className="flex items-center gap-2 rounded-md bg-bg3 px-2 py-1 text-[12px] text-text2">
                            <span className="text-text4">—</span>
                            <span className="flex-1">{s.text}</span>
                            <button onClick={() => setSubtasks((arr) => arr.filter((x) => x.id !== s.id))} className="text-text4 hover:text-red">
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={subtaskDraft}
                        onChange={(e) => setSubtaskDraft(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSubtask())}
                        placeholder="Add a subtask..."
                      />
                      <Button variant="ghost" size="sm" onClick={addSubtask}>
                        + Add
                      </Button>
                    </div>
                  </Field>
                </div>
              )}
            </CardPadded>
          </Card>

          <div className="space-y-1.5">
            {!loaded && <div className="text-sm text-text3">Loading…</div>}
            {loaded && filtered.length === 0 && (
              <Card>
                <CardPadded className="py-8 text-center">
                  <Check className="mx-auto mb-2 text-text4" size={20} />
                  <div className="text-sm font-medium text-text">
                    {filter === 'unplanned' ? 'All planned!' : filter === 'planned' ? 'Nothing planned yet' : 'All clear!'}
                  </div>
                </CardPadded>
              </Card>
            )}
            {filtered.length > 0 && (
            <Card className="divide-y divide-border2">
              {filtered.map((t) => {
                const overdue = !t.done && !!t.due && t.due < tdy;
                const isToday = t.due === tdy;
                const stDone = t.subtasks?.filter((s) => s.done).length ?? 0;
                const editingDue = editingCell?.id === t.id && editingCell.field === 'due';
                const editingTime = editingCell?.id === t.id && editingCell.field === 'time';
                const editingDur = editingCell?.id === t.id && editingCell.field === 'dur';
                const editingPri = editingCell?.id === t.id && editingCell.field === 'pri';
                return (
                  <div key={t.id} className="group relative">
                    <div className={`absolute left-0 top-0 h-full w-[3px] ${TAB_BAR[t.tab]} ${t.done ? 'opacity-40' : ''}`} />
                    <div className="flex items-center gap-2.5 py-2 pl-4 pr-3">
                      <button
                        onClick={() => toggleDone(t.id)}
                        disabled={pendingGooglePush.has(t.id)}
                        title={pendingGooglePush.has(t.id) ? 'Confirming with Google…' : undefined}
                        className={`flex h-[17px] w-[17px] shrink-0 items-center justify-center rounded-md border transition disabled:opacity-50 ${
                          t.done ? 'border-accent bg-accent text-white' : 'border-border'
                        }`}
                      >
                        {pendingGooglePush.has(t.id) ? (
                          <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
                        ) : (
                          t.done && <Check size={11} />
                        )}
                      </button>
                      <button onClick={() => toggleToday(t.id)} className="shrink-0">
                        <Star size={14} className={t.today ? 'fill-orange text-orange' : 'text-text4 opacity-0 group-hover:opacity-100'} />
                      </button>
                      <div className="min-w-0 flex-1">
                        <input
                          key={t.id + t.text}
                          defaultValue={t.text}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v && v !== t.text) inlineUpdate(t, { text: v });
                            else e.target.value = t.text;
                          }}
                          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                          className={`w-full truncate bg-transparent text-[13px] font-medium text-text outline-none ${t.done ? 'text-text3 line-through' : ''}`}
                        />
                        {t.notes && <div className="mt-0.5 truncate text-[11px] text-text3">{t.notes}</div>}
                        {t.subtasks?.length > 0 && (
                          <div className="mt-0.5 flex items-center gap-1 text-[11px] text-text3">
                            <ListChecks size={11} /> {stDone}/{t.subtasks.length}
                          </div>
                        )}
                      </div>
                      <div className="hidden shrink-0 items-center gap-1 sm:flex">
                        {editingDue ? (
                          <input
                            type="date"
                            autoFocus
                            defaultValue={t.due}
                            onChange={(e) => {
                              inlineUpdate(t, { due: e.target.value });
                              setEditingCell(null);
                            }}
                            onBlur={() => setEditingCell(null)}
                            className="rounded-full border border-accent bg-bg3 px-1.5 py-0.5 text-[11px] text-text2 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingCell({ id: t.id, field: 'due' })}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition hover:brightness-95 ${
                              t.due ? (overdue ? 'bg-red-bg text-red' : isToday ? 'bg-orange-bg text-orange' : 'bg-bg3 text-text3') : 'text-text4 opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <Calendar size={10} /> {t.due ? (isToday ? 'Today' : fmtD(t.due)) : 'date'}
                          </button>
                        )}

                        {editingTime ? (
                          <input
                            type="time"
                            autoFocus
                            defaultValue={t.time}
                            onChange={(e) => {
                              inlineUpdate(t, { time: e.target.value });
                              setEditingCell(null);
                            }}
                            onBlur={() => setEditingCell(null)}
                            className="rounded-full border border-accent bg-bg3 px-1.5 py-0.5 text-[11px] text-text2 outline-none [color-scheme:light] dark:[color-scheme:dark]"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingCell({ id: t.id, field: 'time' })}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition hover:brightness-95 ${
                              t.time ? 'bg-bg3 text-text3' : 'text-text4 opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <Clock size={10} /> {t.time ? fmtTimeLabel(t.time) : 'time'}
                          </button>
                        )}

                        {editingDur ? (
                          <input
                            type="number"
                            step="0.25"
                            min="0"
                            autoFocus
                            defaultValue={t.durMin ? Math.round((t.durMin / 60) * 100) / 100 : ''}
                            onBlur={(e) => {
                              const hrs = parseFloat(e.target.value);
                              inlineUpdate(t, { durMin: !isNaN(hrs) && hrs > 0 ? Math.round(hrs * 60) : 0 });
                              setEditingCell(null);
                            }}
                            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                            className="w-11 rounded-full border border-accent bg-bg3 px-1.5 py-0.5 text-[11px] text-text2 outline-none"
                          />
                        ) : (
                          <button
                            onClick={() => setEditingCell({ id: t.id, field: 'dur' })}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] transition hover:brightness-95 ${
                              t.durMin ? 'bg-bg3 text-text3' : 'text-text4 opacity-0 group-hover:opacity-100'
                            }`}
                          >
                            <Hourglass size={10} /> {t.durMin ? `${Math.round((t.durMin / 60) * 100) / 100}h` : 'hrs'}
                          </button>
                        )}

                        {editingPri ? (
                          <select
                            autoFocus
                            defaultValue={t.pri}
                            onChange={(e) => {
                              inlineUpdate(t, { pri: e.target.value as Priority });
                              setEditingCell(null);
                            }}
                            onBlur={() => setEditingCell(null)}
                            className={`rounded-full border border-accent px-1.5 py-0.5 text-[11px] font-medium outline-none ${PRI_META[t.pri].badge}`}
                          >
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        ) : (
                          <button
                            onClick={() => setEditingCell({ id: t.id, field: 'pri' })}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition hover:brightness-95 ${PRI_META[t.pri].badge}`}
                          >
                            {PRI_META[t.pri].label}
                          </button>
                        )}
                      </div>
                      <div className="relative shrink-0">
                        <IconButton
                          danger={false}
                          onClick={() => setOpenMenu(openMenu === t.id ? null : t.id)}
                          className="opacity-0 group-hover:opacity-100"
                        >
                          <span className="text-base leading-none">⋯</span>
                        </IconButton>
                        {openMenu === t.id && (
                          <div className="absolute right-0 top-8 z-10 w-40 rounded-lg border border-border bg-surface py-1 shadow-lg">
                            <button
                              onClick={() => {
                                editTodo(t);
                                setOpenMenu(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-text2 hover:bg-bg3"
                            >
                              <Pencil size={12} /> Edit notes / subtasks
                            </button>
                            <button
                              onClick={() => {
                                removeTodo(t.id);
                                setOpenMenu(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12.5px] text-red hover:bg-red-bg"
                            >
                              <X size={12} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {t.subtasks?.length > 0 && (
                      <div className="px-4 pb-2 pl-11">
                        {t.subtasks.map((s) => (
                          <label key={s.id} className="flex items-center gap-2 py-0.5 text-[12px]">
                            <input type="checkbox" checked={s.done} onChange={() => toggleSubtaskDone(t.id, s.id)} className="accent-accent" />
                            <span className={s.done ? 'text-text4 line-through' : 'text-text2'}>{s.text}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function PillDateInput({
  icon: Icon,
  value,
  onChange,
}: {
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label
      className={`flex items-center gap-1 rounded-full border border-border bg-bg3 px-2 py-1 text-[11.5px] transition ${value ? 'text-text2' : 'text-text3'}`}
    >
      <Icon size={11} />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[90px] bg-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
      />
    </label>
  );
}

function PillTimeInput({
  icon: Icon,
  value,
  onChange,
}: {
  icon: LucideIcon;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <label
      className={`flex items-center gap-1 rounded-full border border-border bg-bg3 px-2 py-1 text-[11.5px] transition ${value ? 'text-text2' : 'text-text3'}`}
    >
      <Icon size={11} />
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-[74px] bg-transparent outline-none [color-scheme:light] dark:[color-scheme:dark]"
      />
    </label>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardPadded } from '@/components/ui/Card';
import { Field, Input, Textarea, Select } from '@/components/ui/Field';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/lib/store';
import { uid, today, fmtDT } from '@/lib/date';
import type { Reminder } from '@/lib/types';
import { Pencil, X, Check, AlertTriangle, Bell, CalendarClock } from 'lucide-react';

const CATS = ['Work', 'Personal', 'Health', 'Finance', 'Family', 'Other'];

function defaultDT() {
  const d = new Date();
  d.setHours(d.getHours() + 1);
  return d.toISOString().slice(0, 16);
}

const empty = { title: '', datetime: defaultDT(), pri: 'medium' as Reminder['pri'], cat: 'Work', notes: '' };

function getStatus(r: Reminder) {
  if (r.done) return { label: 'Done', color: 'green' as const, icon: Check };
  const now = new Date();
  const dt = new Date(r.datetime);
  const diff = dt.getTime() - now.getTime();
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  if (diff < 0) return { label: 'Overdue', color: 'red' as const, icon: AlertTriangle };
  if (dt <= todayEnd) return { label: 'Today', color: 'orange' as const, icon: Bell };
  if (diff < 7 * 24 * 3600000) return { label: 'This week', color: 'blue' as const, icon: CalendarClock };
  return { label: 'Upcoming', color: 'muted' as const, icon: CalendarClock };
}

const PRI_COLOR = { high: 'red', medium: 'orange', low: 'green' } as const;

export default function RemindersPage() {
  const { value: reminders, setValue: setReminders, loaded } = useStore<Reminder[]>('reminders', []);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);

  function save() {
    if (!form.title.trim()) return alert('Enter a reminder title');
    if (!form.datetime) return alert('Pick a date and time');
    const rem: Reminder = {
      id: editId ?? uid(),
      title: form.title.trim(),
      datetime: form.datetime,
      pri: form.pri,
      cat: form.cat,
      notes: form.notes.trim(),
      done: editId ? (reminders.find((r) => r.id === editId)?.done ?? false) : false,
      created: editId ? (reminders.find((r) => r.id === editId)?.created ?? today()) : today(),
    };
    setReminders((arr) => (editId ? arr.map((r) => (r.id === editId ? rem : r)) : [...arr, rem]));
    setEditId(null);
    setForm({ ...empty, datetime: defaultDT() });
  }

  function edit(r: Reminder) {
    setForm({ title: r.title, datetime: r.datetime, pri: r.pri, cat: r.cat, notes: r.notes });
    setEditId(r.id);
  }

  function remove(id: string) {
    if (!confirm('Delete reminder?')) return;
    setReminders((arr) => arr.filter((r) => r.id !== id));
  }

  function toggleDone(id: string) {
    setReminders((arr) => arr.map((r) => (r.id === id ? { ...r, done: !r.done } : r)));
  }

  const sorted = useMemo(
    () => [...reminders].sort((a, b) => +new Date(a.datetime) - +new Date(b.datetime)),
    [reminders],
  );

  return (
    <div>
      <PageHeader title="Reminders" sub="Never miss what matters" />

      <Card className="mb-3">
        <CardPadded>
          <Field label="Title">
            <Input
              placeholder="What do you need to remember?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Field label="Date & Time">
              <Input
                type="datetime-local"
                value={form.datetime}
                onChange={(e) => setForm({ ...form, datetime: e.target.value })}
              />
            </Field>
            <Field label="Priority">
              <Select value={form.pri} onChange={(e) => setForm({ ...form, pri: e.target.value as Reminder['pri'] })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </Field>
            <Field label="Category">
              <Select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
                {CATS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Notes">
            <Textarea
              placeholder="Extra details..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="mt-3.5 flex items-center gap-2">
            <Button onClick={save}>{editId ? 'Save' : 'Add Reminder'}</Button>
            {editId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditId(null);
                  setForm({ ...empty, datetime: defaultDT() });
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardPadded>
      </Card>

      <div className="space-y-2">
        {!loaded && <div className="text-sm text-text3">Loading…</div>}
        {loaded && sorted.length === 0 && <div className="text-sm text-text3">No reminders yet.</div>}
        {sorted.map((r) => {
          const status = getStatus(r);
          const StatusIcon = status.icon;
          return (
            <Card key={r.id}>
              <CardPadded className="flex items-start gap-3">
                <button
                  onClick={() => toggleDone(r.id)}
                  className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition ${
                    r.done ? 'border-accent bg-accent text-white' : 'border-border'
                  }`}
                >
                  {r.done && <Check size={12} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`font-medium text-text ${r.done ? 'text-text3 line-through' : ''}`}>
                      {r.title}
                    </span>
                    <Badge color={status.color}>
                      <StatusIcon size={10} className="mr-1" />
                      {status.label}
                    </Badge>
                    <Badge color={PRI_COLOR[r.pri]}>{r.pri}</Badge>
                    <Badge color="muted">{r.cat}</Badge>
                  </div>
                  <div className="mt-1 text-[12px] text-text3">{fmtDT(r.datetime)}</div>
                  {r.notes && <div className="mt-1.5 text-[13px] text-text2">{r.notes}</div>}
                </div>
                <div className="flex shrink-0 gap-1">
                  <IconButton danger={false} onClick={() => edit(r)}>
                    <Pencil size={13} />
                  </IconButton>
                  <IconButton onClick={() => remove(r.id)}>
                    <X size={13} />
                  </IconButton>
                </div>
              </CardPadded>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

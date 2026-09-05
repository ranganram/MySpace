'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardPadded } from '@/components/ui/Card';
import { Field, Input, Textarea, Select } from '@/components/ui/Field';
import { Button, IconButton } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { uid, today, fmtD } from '@/lib/date';
import type { JournalEntry } from '@/lib/types';
import { Pencil, X } from 'lucide-react';

const CATS = ['Work', 'Meeting', 'Learning', 'Exercise', 'Personal', 'Admin', 'Other'];

const empty = { date: today(), start: '', dur: '', cat: 'Work', title: '', notes: '' };

export default function JournalPage() {
  const { value: entries, setValue: setEntries, loaded } = useStore<JournalEntry[]>('journal', []);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  function add() {
    if (!form.title.trim() || !form.dur) {
      alert('Fill activity and duration');
      return;
    }
    const entry: JournalEntry = {
      id: editId ?? uid(),
      date: form.date,
      title: form.title.trim(),
      start: form.start,
      dur: Number(form.dur),
      cat: form.cat,
      notes: form.notes.trim(),
    };
    if (editId) {
      setEntries((arr) => arr.map((e) => (e.id === editId ? entry : e)));
      setEditId(null);
    } else {
      setEntries((arr) => [entry, ...arr]);
    }
    setForm(empty);
  }

  function edit(e: JournalEntry) {
    setForm({ date: e.date, start: e.start, dur: String(e.dur), cat: e.cat, title: e.title, notes: e.notes });
    setEditId(e.id);
  }

  function remove(id: string) {
    if (!confirm('Delete entry?')) return;
    setEntries((arr) => arr.filter((e) => e.id !== id));
  }

  const filtered = useMemo(
    () => (filter ? entries.filter((e) => e.date === filter) : entries),
    [entries, filter],
  );

  const totalMin = useMemo(() => filtered.reduce((s, e) => s + e.dur, 0), [filtered]);

  return (
    <div>
      <PageHeader title="Journal" sub="Track your time — understand where it goes" />

      <Card className="mb-3">
        <div className="px-4.5 pt-3.5 text-[11px] font-semibold uppercase tracking-wide text-text3">New Entry</div>
        <CardPadded className="pt-4">
          <div className="mb-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Field label="Date">
              <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
            </Field>
            <Field label="Start Time">
              <Input type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} />
            </Field>
            <Field label="Duration (min)">
              <Input
                type="number"
                min={1}
                placeholder="60"
                value={form.dur}
                onChange={(e) => setForm({ ...form, dur: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <Select value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
                {CATS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label="Activity">
            <Input
              placeholder="What were you doing?"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="Notes">
            <Textarea
              placeholder="Context, thoughts..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
          <div className="mt-3.5 flex items-center gap-2">
            <Button onClick={add}>{editId ? 'Save Entry' : 'Add Entry'}</Button>
            {editId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditId(null);
                  setForm(empty);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardPadded>
      </Card>

      {filtered.length > 0 && (
        <div className="mb-4 text-[12.5px] text-text3">
          {filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} · {(totalMin / 60).toFixed(1)}h total
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        <Input type="date" value={filter} onChange={(e) => setFilter(e.target.value)} className="w-auto flex-none" />
        <Button variant="ghost" size="sm" onClick={() => setFilter('')}>
          Clear
        </Button>
      </div>

      <div className="space-y-2">
        {!loaded && <div className="text-sm text-text3">Loading…</div>}
        {loaded && filtered.length === 0 && <div className="text-sm text-text3">No entries yet.</div>}
        {filtered.map((e) => (
          <Card key={e.id}>
            <CardPadded className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-text">{e.title}</span>
                  <span className="rounded bg-accent-bg px-1.5 py-0.5 text-[11px] font-medium text-accent">
                    {e.cat}
                  </span>
                </div>
                <div className="mt-1 text-[12px] text-text3">
                  {fmtD(e.date)} {e.start && `· ${e.start}`} · {e.dur}min
                </div>
                {e.notes && <div className="mt-1.5 text-[13px] text-text2">{e.notes}</div>}
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton danger={false} onClick={() => edit(e)}>
                  <Pencil size={13} />
                </IconButton>
                <IconButton onClick={() => remove(e.id)}>
                  <X size={13} />
                </IconButton>
              </div>
            </CardPadded>
          </Card>
        ))}
      </div>
    </div>
  );
}

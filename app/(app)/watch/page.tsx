'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardPadded, CardTitle } from '@/components/ui/Card';
import { Field, Input, Textarea, Select } from '@/components/ui/Field';
import { Button, IconButton } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useStore } from '@/lib/store';
import { uid, today, fmtD } from '@/lib/date';
import type { WatchItem, WatchStatus } from '@/lib/types';
import { Pencil, X, ChevronDown, Eye } from 'lucide-react';

const STATUS_META: Record<WatchStatus, { label: string; color: string; dot: string }> = {
  'on-track': { label: 'On Track', color: 'text-green', dot: 'bg-green' },
  'at-risk': { label: 'At Risk', color: 'text-orange', dot: 'bg-orange' },
  blocked: { label: 'Blocked', color: 'text-red', dot: 'bg-red' },
  done: { label: 'Done', color: 'text-text4', dot: 'bg-text4' },
  pending: { label: 'Pending', color: 'text-text3', dot: 'bg-text3' },
};

const PRI_BADGE = { high: 'red', medium: 'orange', low: 'green' } as const;
const FILTERS: { id: 'all' | WatchStatus; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'on-track', label: 'On Track' },
  { id: 'at-risk', label: 'At Risk' },
  { id: 'blocked', label: 'Blocked' },
  { id: 'done', label: 'Done' },
];

const empty = { title: '', owner: '', due: '', pri: 'medium' as WatchItem['pri'], notes: '' };
const STATUS_ORDER: Record<WatchStatus, number> = { blocked: 0, 'at-risk': 1, pending: 2, 'on-track': 3, done: 4 };

export default function WatchPage() {
  const { value: items, setValue: setItems, loaded } = useStore<WatchItem[]>('watch_items', []);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | WatchStatus>('all');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [updateDrafts, setUpdateDrafts] = useState<Record<string, string>>({});

  function save() {
    if (!form.title.trim()) return alert('Enter what you are tracking');
    if (editId) {
      setItems((arr) => arr.map((it) => (it.id === editId ? { ...it, ...form, title: form.title.trim() } : it)));
      setEditId(null);
    } else {
      setItems((arr) => [
        ...arr,
        { id: uid(), ...form, title: form.title.trim(), status: 'pending', updates: [], created: today() },
      ]);
    }
    setForm(empty);
  }

  function edit(it: WatchItem) {
    setForm({ title: it.title, owner: it.owner, due: it.due, pri: it.pri, notes: it.notes });
    setEditId(it.id);
  }

  function remove(id: string) {
    if (!confirm('Remove from watch list?')) return;
    setItems((arr) => arr.filter((it) => it.id !== id));
  }

  function setStatus(id: string, status: WatchStatus) {
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, status } : it)));
  }

  function toggleExpand(id: string) {
    setExpanded((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function addUpdate(id: string) {
    const text = (updateDrafts[id] || '').trim();
    if (!text) return;
    setItems((arr) =>
      arr.map((it) =>
        it.id === id ? { ...it, updates: [{ id: uid(), text, date: today() }, ...it.updates] } : it,
      ),
    );
    setUpdateDrafts((d) => ({ ...d, [id]: '' }));
  }

  function removeUpdate(itemId: string, updateId: string) {
    setItems((arr) =>
      arr.map((it) => (it.id === itemId ? { ...it, updates: it.updates.filter((u) => u.id !== updateId) } : it)),
    );
  }

  const filtered = useMemo(() => {
    const arr = filter === 'all' ? items : items.filter((it) => it.status === filter);
    return [...arr].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]);
  }, [items, filter]);

  const tds = today();

  return (
    <div>
      <PageHeader title="Watch List" sub="Track what others are working on — follow up, monitor progress" />

      <Card className="mb-4">
        <CardTitle>Add to Watch List</CardTitle>
        <CardPadded className="pt-3.5">
          <Field label="What are you tracking?">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Client proposal review..."
            />
          </Field>
          <div className="mb-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Field label="Owner / Team">
              <Input value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} placeholder="e.g. Design team" />
            </Field>
            <Field label="Target Date">
              <Input type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
            </Field>
            <Field label="Priority">
              <Select value={form.pri} onChange={(e) => setForm({ ...form, pri: e.target.value as WatchItem['pri'] })}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </Select>
            </Field>
          </div>
          <Field label="Context">
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="What exactly needs to happen? Any blockers?"
            />
          </Field>
          <div className="mt-3.5 flex items-center gap-2">
            <Button onClick={save}>{editId ? 'Save' : 'Add to Watch List'}</Button>
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

      <div className="mb-3.5 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              filter === f.id ? 'border-accent bg-accent-bg text-accent' : 'border-border text-text3 hover:text-text'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {!loaded && <div className="text-sm text-text3">Loading…</div>}
        {loaded && filtered.length === 0 && (
          <Card>
            <CardPadded className="py-8 text-center">
              <Eye className="mx-auto mb-2 text-text4" size={20} />
              <div className="text-sm font-medium text-text">Nothing on watch list</div>
              <div className="mt-0.5 text-xs text-text3">Add items above to start monitoring</div>
            </CardPadded>
          </Card>
        )}
        {filtered.map((item) => {
          const sm = STATUS_META[item.status];
          const isOverdue = item.due && item.due < tds && item.status !== 'done';
          const isDueToday = item.due === tds && item.status !== 'done';
          const isOpen = expanded.has(item.id);
          return (
            <Card key={item.id}>
              <div
                className="flex cursor-pointer items-center gap-3 p-4"
                onClick={() => toggleExpand(item.id)}
              >
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${sm.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-text">{item.title}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-text4">
                    <span className={`font-semibold ${sm.color}`}>{sm.label}</span>
                    {item.owner && <span>→ {item.owner}</span>}
                    {item.due && (
                      <span className={isOverdue ? 'text-red' : isDueToday ? 'text-orange' : ''}>
                        {isOverdue ? 'Overdue · ' : isDueToday ? 'Due today · ' : ''}
                        {fmtD(item.due)}
                      </span>
                    )}
                    {item.updates.length > 0 && (
                      <span>
                        {item.updates.length} update{item.updates.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex shrink-0 gap-1" onClick={(e) => e.stopPropagation()}>
                  <IconButton danger={false} onClick={() => edit(item)}>
                    <Pencil size={13} />
                  </IconButton>
                  <IconButton onClick={() => remove(item.id)}>
                    <X size={13} />
                  </IconButton>
                </div>
                <ChevronDown size={16} className={`shrink-0 text-text4 transition ${isOpen ? 'rotate-180' : ''}`} />
              </div>

              {isOpen && (
                <CardPadded className="border-t border-border2 pt-3.5">
                  {item.notes && (
                    <div className="mb-3 rounded bg-bg3 px-2.5 py-2 text-[13px] leading-relaxed text-text3">
                      {item.notes}
                    </div>
                  )}
                  <div className="mb-3 flex flex-wrap items-center gap-1.5">
                    <span className="self-center text-[11px] text-text4">Status:</span>
                    {(Object.keys(STATUS_META) as WatchStatus[]).map((key) => (
                      <button
                        key={key}
                        onClick={() => setStatus(item.id, key)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                          item.status === key
                            ? `border-current ${STATUS_META[key].color} bg-current/10`
                            : 'border-border text-text3'
                        }`}
                      >
                        {STATUS_META[key].label}
                      </button>
                    ))}
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2">
                    <Badge color={PRI_BADGE[item.pri]}>{item.pri} priority</Badge>
                    {item.due && <Badge color="muted">Due {fmtD(item.due)}</Badge>}
                  </div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-text3">
                    Progress Updates
                  </div>
                  {item.updates.length === 0 && (
                    <div className="mb-2.5 text-xs italic text-text4">No updates yet</div>
                  )}
                  {item.updates.map((u) => (
                    <div key={u.id} className="mb-1.5 flex items-start gap-2 rounded-md bg-bg3 px-2.5 py-2">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] text-text2">{u.text}</div>
                        <div className="text-[11px] text-text4">{fmtD(u.date)}</div>
                      </div>
                      <IconButton onClick={() => removeUpdate(item.id, u.id)} className="opacity-40">
                        <X size={11} />
                      </IconButton>
                    </div>
                  ))}
                  <div className="mt-2.5 flex gap-2">
                    <Input
                      value={updateDrafts[item.id] || ''}
                      onChange={(e) => setUpdateDrafts((d) => ({ ...d, [item.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addUpdate(item.id)}
                      placeholder="Add a progress update..."
                    />
                    <Button variant="ghost" size="sm" onClick={() => addUpdate(item.id)}>
                      Log update
                    </Button>
                  </div>
                </CardPadded>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

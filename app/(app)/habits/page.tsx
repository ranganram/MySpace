'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardPadded } from '@/components/ui/Card';
import { Field, Input, Select } from '@/components/ui/Field';
import { Button, IconButton } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { uid, today } from '@/lib/date';
import type { Habit } from '@/lib/types';
import { Pencil, X, ChevronLeft, ChevronRight, Repeat, BarChart3, Check } from 'lucide-react';

const CATS = ['Health', 'Learning', 'Work', 'Mindfulness', 'Other'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function ds(yr: number, mo: number, d: number) {
  return `${yr}-${String(mo + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export default function HabitsPage() {
  const { value: habits, setValue: setHabits, loaded } = useStore<Habit[]>('habits', []);
  const [name, setName] = useState('');
  const [cat, setCat] = useState(CATS[0]);
  const [target, setTarget] = useState('');
  const [targetPct, setTargetPct] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  const now = new Date();
  const disp = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const yr = disp.getFullYear();
  const mo = disp.getMonth();
  const dim = new Date(yr, mo + 1, 0).getDate();
  const days = Array.from({ length: dim }, (_, i) => i + 1);
  const tds = today();

  function save() {
    if (!name.trim()) return alert('Enter habit name');
    const t = parseInt(target) || 0;
    const tp = parseInt(targetPct) || 80;
    if (editId) {
      setHabits((arr) => arr.map((h) => (h.id === editId ? { ...h, name: name.trim(), category: cat, target: t, targetPct: tp } : h)));
      setEditId(null);
    } else {
      setHabits((arr) => [...arr, { id: uid(), name: name.trim(), category: cat, checks: {}, target: t, targetPct: tp, created: today() }]);
    }
    setName('');
    setTarget('');
    setTargetPct('');
  }

  function edit(h: Habit) {
    setName(h.name);
    setCat(h.category);
    setTarget(h.target ? String(h.target) : '');
    setTargetPct(h.targetPct ? String(h.targetPct) : '');
    setEditId(h.id);
  }

  function remove(id: string) {
    if (!confirm('Delete habit?')) return;
    setHabits((arr) => arr.filter((h) => h.id !== id));
  }

  function toggle(id: string, dateStr: string) {
    setHabits((arr) => arr.map((h) => (h.id === id ? { ...h, checks: { ...h.checks, [dateStr]: !h.checks[dateStr] } } : h)));
  }

  const targetHabits = useMemo(() => {
    const n = new Date();
    const cyr = n.getFullYear();
    const cmo = n.getMonth();
    const cdim = new Date(cyr, cmo + 1, 0).getDate();
    const dayOfMonth = n.getDate();
    return habits
      .filter((h) => h.target > 0)
      .map((h) => {
        const cdays = Array.from({ length: cdim }, (_, i) => i + 1);
        const doneCount = cdays.filter((d) => d <= dayOfMonth && !!h.checks[ds(cyr, cmo, d)]).length;
        const goalPct = h.targetPct || 80;
        const achievedPct = Math.round((doneCount / h.target) * 100);
        const expectedByNow = h.target * (dayOfMonth / cdim);
        let statusLabel: string, statusColor: string;
        if (doneCount >= h.target) {
          statusLabel = 'Complete';
          statusColor = 'text-green';
        } else if (doneCount >= expectedByNow) {
          statusLabel = 'On Track';
          statusColor = 'text-green';
        } else if (doneCount >= expectedByNow * 0.7) {
          statusLabel = 'Slightly Behind';
          statusColor = 'text-orange';
        } else {
          statusLabel = 'Behind';
          statusColor = 'text-red';
        }
        const barPct = Math.min(100, achievedPct);
        return { h, doneCount, goalPct, achievedPct, statusLabel, statusColor, barPct, meetsGoal: achievedPct >= goalPct };
      });
  }, [habits]);

  return (
    <div>
      <PageHeader title="Habits" sub="Build consistency, one day at a time" />

      {targetHabits.length > 0 && (
        <div className="mb-5">
          <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-text3">
            <BarChart3 size={12} /> Monthly Targets — {MONTHS[now.getMonth()]}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {targetHabits.map(({ h, doneCount, goalPct, achievedPct, statusLabel, statusColor, barPct, meetsGoal }) => (
              <Card key={h.id}>
                <CardPadded>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="truncate text-[13px] font-medium text-text">{h.name}</span>
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${statusColor} bg-current/10`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="mb-1.5">
                    <span className={`text-xl font-bold ${statusColor}`}>{doneCount}</span>
                    <span className="text-xs text-text3"> / {h.target} this month</span>
                  </div>
                  <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className={`h-full rounded-full ${statusColor.replace('text-', 'bg-')}`} style={{ width: `${barPct}%` }} />
                  </div>
                  <div className="text-[11px] text-text3">
                    Goal {goalPct}%+ · Currently {achievedPct}% {meetsGoal && <Check size={11} className="inline text-green" />}
                  </div>
                </CardPadded>
              </Card>
            ))}
          </div>
        </div>
      )}

      <Card className="mb-4">
        <CardPadded>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
            <Field label="Habit Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Morning run, Read 20min..." />
            </Field>
            <Field label="Category">
              <Select value={cat} onChange={(e) => setCat(e.target.value)}>
                {CATS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </Field>
            <Field label="Monthly Target">
              <Input type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 12" />
            </Field>
            <Field label="Success Goal %">
              <Input type="number" min={1} max={100} value={targetPct} onChange={(e) => setTargetPct(e.target.value)} placeholder="80" />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={save}>{editId ? 'Save Habit' : 'Add Habit'}</Button>
            {editId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditId(null);
                  setName('');
                  setTarget('');
                  setTargetPct('');
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardPadded>
      </Card>

      <div className="mb-3 flex items-center justify-center gap-3">
        <button onClick={() => setMonthOffset((o) => o - 1)} className="rounded-md p-1 text-text3 hover:bg-bg3">
          <ChevronLeft size={16} />
        </button>
        <span className="text-[13px] font-medium text-text">
          {MONTHS[mo]} {yr}
        </span>
        <button onClick={() => setMonthOffset((o) => o + 1)} className="rounded-md p-1 text-text3 hover:bg-bg3">
          <ChevronRight size={16} />
        </button>
      </div>

      <Card>
        {!loaded && <div className="p-4 text-sm text-text3">Loading…</div>}
        {loaded && habits.length === 0 && (
          <CardPadded className="py-8 text-center">
            <Repeat className="mx-auto mb-2 text-text4" size={20} />
            <div className="text-sm font-medium text-text">No habits yet</div>
            <div className="mt-0.5 text-xs text-text3">Add your first habit above</div>
          </CardPadded>
        )}
        {habits.length > 0 && (
          <div className="overflow-x-auto">
            <div className="min-w-max">
              <div className="flex items-center gap-1 border-b border-border2 px-4 py-2 text-[11px] font-semibold text-text3">
                <div className="w-32 shrink-0">Habit</div>
                <div className="flex gap-[3px]">
                  {days.map((d) => (
                    <div
                      key={d}
                      className={`flex w-5 shrink-0 items-center justify-center ${ds(yr, mo, d) === tds ? 'font-bold text-accent' : ''}`}
                    >
                      {d}
                    </div>
                  ))}
                </div>
                <div className="w-14 shrink-0 text-right">Rate</div>
                <div className="w-16 shrink-0" />
              </div>
              {habits.map((h) => {
                const cnt = days.filter((d) => !!h.checks[ds(yr, mo, d)]).length;
                const rate = Math.round((cnt / dim) * 100);
                const color = rate >= 70 ? 'text-green' : rate >= 40 ? 'text-orange' : 'text-red';
                return (
                  <div key={h.id} className="flex items-center gap-1 border-b border-border2 px-4 py-2.5 last:border-b-0">
                    <div className="w-32 shrink-0">
                      <div className="truncate text-[13px] font-medium text-text">{h.name}</div>
                      <div className="text-[10.5px] text-text3">{h.category}</div>
                    </div>
                    <div className="flex gap-[3px]">
                      {days.map((d) => {
                        const dstr = ds(yr, mo, d);
                        const done = !!h.checks[dstr];
                        const isT = dstr === tds;
                        return (
                          <button
                            key={d}
                            onClick={() => toggle(h.id, dstr)}
                            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] transition ${
                              done ? 'bg-green text-white' : isT ? 'bg-accent-bg text-accent' : 'bg-bg3 text-transparent hover:text-text4'
                            }`}
                          >
                            {done ? '✓' : ''}
                          </button>
                        );
                      })}
                    </div>
                    <div className={`w-14 shrink-0 text-right text-[12.5px] font-semibold ${color}`}>{rate}%</div>
                    <div className="flex w-16 shrink-0 justify-end gap-1">
                      <IconButton danger={false} onClick={() => edit(h)}>
                        <Pencil size={12} />
                      </IconButton>
                      <IconButton onClick={() => remove(h.id)}>
                        <X size={12} />
                      </IconButton>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

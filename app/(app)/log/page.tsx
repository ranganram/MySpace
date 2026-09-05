'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardPadded, CardTitle } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Button, IconButton } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { uid, today, fmtD } from '@/lib/date';
import type { Tracker, LogEntry } from '@/lib/types';
import { Pencil, X, ChevronDown, BarChart3 } from 'lucide-react';

export default function LogPage() {
  const { value: trackers, setValue: setTrackers, loaded: trackersLoaded } = useStore<Tracker[]>('log_trackers', []);
  const { value: entries, setValue: setEntries, loaded: entriesLoaded } = useStore<LogEntry[]>('log_entries', []);

  const [ltName, setLtName] = useState('');
  const [ltUnit, setLtUnit] = useState('');
  const [ltIcon, setLtIcon] = useState('');
  const [ltEditId, setLtEditId] = useState<string | null>(null);

  const [leDate, setLeDate] = useState(today());
  const [leValues, setLeValues] = useState<Record<string, string>>({});
  const [leNote, setLeNote] = useState('');
  const [leEditId, setLeEditId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [openEntry, setOpenEntry] = useState<string | null>(null);

  const sortedEntries = useMemo(() => [...entries].sort((a, b) => b.date.localeCompare(a.date)), [entries]);
  const trackerMap = useMemo(() => Object.fromEntries(trackers.map((t) => [t.id, t])), [trackers]);

  function saveTracker() {
    if (!ltName.trim()) return alert('Enter a tracker name');
    if (ltEditId) {
      setTrackers((arr) =>
        arr.map((t) => (t.id === ltEditId ? { ...t, name: ltName.trim(), unit: ltUnit.trim(), icon: ltIcon.trim() || '📌' } : t)),
      );
      setLtEditId(null);
    } else {
      setTrackers((arr) => [...arr, { id: 't_' + uid(), name: ltName.trim(), unit: ltUnit.trim(), icon: ltIcon.trim() || '📌' }]);
    }
    setLtName('');
    setLtUnit('');
    setLtIcon('');
  }

  function editTracker(t: Tracker) {
    setLtName(t.name);
    setLtUnit(t.unit);
    setLtIcon(t.icon);
    setLtEditId(t.id);
  }

  function deleteTracker(id: string) {
    if (!confirm('Delete this tracker? Past entries will keep their data.')) return;
    setTrackers((arr) => arr.filter((t) => t.id !== id));
  }

  function saveEntry() {
    const values: Record<string, string> = {};
    trackers.forEach((t) => {
      if ((leValues[t.id] || '').trim() !== '') values[t.id] = leValues[t.id].trim();
    });
    if (!Object.keys(values).length && !leNote.trim()) return alert('Enter at least one value or a note');

    if (leEditId) {
      setEntries((arr) =>
        arr.map((e) => (e.id === leEditId ? { ...e, date: leDate, values, note: leNote.trim(), updated: new Date().toISOString() } : e)),
      );
      setLeEditId(null);
    } else {
      const existingIdx = entries.findIndex((e) => e.date === leDate);
      if (existingIdx >= 0) {
        if (!confirm(`An entry for ${fmtD(leDate)} already exists. Merge/overwrite it?`)) return;
        setEntries((arr) =>
          arr.map((e, i) =>
            i === existingIdx
              ? { ...e, values: { ...e.values, ...values }, note: leNote.trim() || e.note, updated: new Date().toISOString() }
              : e,
          ),
        );
      } else {
        setEntries((arr) => [...arr, { id: uid(), date: leDate, values, note: leNote.trim(), updated: new Date().toISOString() }]);
      }
    }
    setLeValues({});
    setLeNote('');
  }

  function editEntry(e: LogEntry) {
    setLeDate(e.date);
    setLeValues(e.values);
    setLeNote(e.note || '');
    setLeEditId(e.id);
  }

  function cancelEntryEdit() {
    setLeEditId(null);
    setLeValues({});
    setLeNote('');
  }

  function deleteEntry(id: string) {
    if (!confirm('Delete this log entry?')) return;
    setEntries((arr) => arr.filter((e) => e.id !== id));
  }

  const filteredEntries = useMemo(() => {
    const s = search.toLowerCase();
    if (!s) return sortedEntries;
    return sortedEntries.filter((e) => {
      if (fmtD(e.date).toLowerCase().includes(s)) return true;
      if (e.note?.toLowerCase().includes(s)) return true;
      if (Object.values(e.values || {}).some((v) => String(v).toLowerCase().includes(s))) return true;
      return false;
    });
  }, [sortedEntries, search]);

  function lastValueFor(trackerId: string) {
    const e = sortedEntries.find((e) => e.values?.[trackerId] !== undefined && e.values[trackerId] !== '');
    return e ? { val: e.values[trackerId], date: e.date } : null;
  }

  return (
    <div>
      <PageHeader title="Daily Log" sub="Track any metric that matters to you" />

      <Card className="mb-4">
        <CardTitle>Trackers</CardTitle>
        <CardPadded className="pt-3.5">
          {!trackersLoaded && <div className="text-sm text-text3">Loading…</div>}
          {trackersLoaded && trackers.length === 0 && (
            <div className="mb-3 text-[13px] italic text-text3">No trackers yet — add one below to get started</div>
          )}
          <div className="mb-3 space-y-1.5">
            {trackers.map((t) => {
              const last = lastValueFor(t.id);
              return (
                <div key={t.id} className="flex items-center gap-3 rounded-lg bg-bg3 px-3 py-2">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-bg text-base">
                    {t.icon || '📌'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-text">{t.name}</div>
                    {t.unit && <div className="text-[11px] text-text3">in {t.unit}</div>}
                  </div>
                  {last ? (
                    <div className="text-right text-[13px] font-semibold text-text">
                      {last.val} {t.unit}
                      <div className="text-[10px] font-normal text-text4">{fmtD(last.date)}</div>
                    </div>
                  ) : (
                    <div className="text-[11px] text-text4">No data</div>
                  )}
                  <div className="flex gap-1">
                    <IconButton danger={false} onClick={() => editTracker(t)}>
                      <Pencil size={13} />
                    </IconButton>
                    <IconButton onClick={() => deleteTracker(t.id)}>
                      <X size={13} />
                    </IconButton>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
            <Field label="Name">
              <Input value={ltName} onChange={(e) => setLtName(e.target.value)} placeholder="e.g. Sleep hours" />
            </Field>
            <Field label="Unit (optional)">
              <Input value={ltUnit} onChange={(e) => setLtUnit(e.target.value)} placeholder="e.g. hrs" />
            </Field>
            <Field label="Icon (emoji, optional)">
              <Input value={ltIcon} onChange={(e) => setLtIcon(e.target.value)} placeholder="📌" />
            </Field>
          </div>
          <div className="mt-3 flex gap-2">
            <Button onClick={saveTracker}>{ltEditId ? 'Save Tracker' : 'Add Tracker'}</Button>
            {ltEditId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setLtEditId(null);
                  setLtName('');
                  setLtUnit('');
                  setLtIcon('');
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardPadded>
      </Card>

      <Card className="mb-4">
        <CardTitle>Log an Entry</CardTitle>
        <CardPadded className="pt-3.5">
          <Field label="Date">
            <Input type="date" value={leDate} onChange={(e) => setLeDate(e.target.value)} />
          </Field>
          {trackers.length === 0 ? (
            <div className="mb-2 text-[13px] italic text-text3">Add trackers above first, then log values here</div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {trackers.map((t) => (
                <Field key={t.id} label={`${t.icon || '📌'} ${t.name}${t.unit ? ` (${t.unit})` : ''}`}>
                  <Input
                    value={leValues[t.id] || ''}
                    onChange={(e) => setLeValues((v) => ({ ...v, [t.id]: e.target.value }))}
                    placeholder="Enter value..."
                  />
                </Field>
              ))}
            </div>
          )}
          <Field label="Note">
            <Textarea value={leNote} onChange={(e) => setLeNote(e.target.value)} placeholder="Anything else worth noting..." />
          </Field>
          <div className="mt-3 flex gap-2">
            <Button onClick={saveEntry}>{leEditId ? 'Save Entry' : 'Save'}</Button>
            {leEditId && (
              <Button variant="ghost" onClick={cancelEntryEdit}>
                Cancel
              </Button>
            )}
          </div>
        </CardPadded>
      </Card>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search entries..."
        className="mb-3 w-auto"
      />

      <div className="space-y-2">
        {!entriesLoaded && <div className="text-sm text-text3">Loading…</div>}
        {entriesLoaded && filteredEntries.length === 0 && (
          <Card>
            <CardPadded className="py-8 text-center">
              <BarChart3 className="mx-auto mb-2 text-text4" size={20} />
              <div className="text-sm font-medium text-text">{search ? 'No entries match' : 'No entries yet'}</div>
              <div className="mt-0.5 text-xs text-text3">{search ? 'Try a different search' : 'Save your first entry above'}</div>
            </CardPadded>
          </Card>
        )}
        {filteredEntries.map((e) => {
          const filled = Object.entries(e.values || {}).filter(([, v]) => v !== undefined && v !== '');
          const preview = filled
            .slice(0, 3)
            .map(([k, v]) => {
              const t = trackerMap[k];
              return t ? `${t.icon || ''} ${v}${t.unit ? ' ' + t.unit : ''}` : v;
            })
            .join(' · ');
          const isOpen = openEntry === e.id;
          return (
            <Card key={e.id}>
              <div
                className="flex cursor-pointer items-center justify-between gap-3 p-4"
                onClick={() => setOpenEntry(isOpen ? null : e.id)}
              >
                <div>
                  <div className="text-[13px] font-semibold text-text">{fmtD(e.date)}</div>
                  <div className="mt-0.5 text-[12px] text-text3">{preview || 'Note only'}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text4">
                    {filled.length} metric{filled.length !== 1 ? 's' : ''}
                  </span>
                  <ChevronDown size={15} className={`text-text4 transition ${isOpen ? 'rotate-180' : ''}`} />
                </div>
              </div>
              {isOpen && (
                <CardPadded className="border-t border-border2 pt-3.5">
                  {filled.length > 0 && (
                    <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {filled.map(([k, v]) => {
                        const t = trackerMap[k] || { name: k, unit: '', icon: '📌' };
                        return (
                          <div key={k} className="rounded-lg bg-bg3 px-2.5 py-2">
                            <div className="text-[11px] text-text3">
                              {t.icon} {t.name}
                            </div>
                            <div className="text-[15px] font-semibold text-text">
                              {v} <span className="text-[11px] font-normal text-text3">{t.unit}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {e.note && <div className="mb-3 text-[13px] text-text2">{e.note}</div>}
                  <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => editEntry(e)}>
                      Edit
                    </Button>
                    <button
                      onClick={() => deleteEntry(e.id)}
                      className="rounded-full bg-red-bg px-4 py-1.5 text-[13px] font-semibold text-red"
                    >
                      Delete
                    </button>
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

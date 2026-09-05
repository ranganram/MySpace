'use client';

import { useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardPadded } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Button, IconButton } from '@/components/ui/Button';
import { Segment, SegmentButton } from '@/components/ui/Segment';
import { useStore } from '@/lib/store';
import { uid, today, fmtD } from '@/lib/date';
import type { Note } from '@/lib/types';
import { Pencil, X, Check, Link2, BookOpen, Lightbulb, BookMarked } from 'lucide-react';

type Tab = 'patent' | 'topics' | 'books';

const TABS: { id: Tab; label: string; icon: typeof Lightbulb }[] = [
  { id: 'patent', label: 'Patent Ideas', icon: Lightbulb },
  { id: 'topics', label: 'Topics & Links', icon: Link2 },
  { id: 'books', label: 'Books', icon: BookMarked },
];

interface ReadTargetDay {
  noteIds: string[];
  done: Record<string, boolean>;
}

export default function NotesPage() {
  const { value: notes, setValue: setNotes, loaded } = useStore<Note[]>('notes', []);
  const { value: readTargets, setValue: setReadTargets } = useStore<Record<string, ReadTargetDay>>(
    'read_targets',
    {},
  );
  const [tab, setTab] = useState<Tab>('patent');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [link, setLink] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  const tds = today();
  const todayTarget: ReadTargetDay = readTargets[tds] ?? { noteIds: [], done: {} };
  const targetNotes = todayTarget.noteIds.map((id) => notes.find((n) => n.id === id)).filter(Boolean) as Note[];
  const doneCount = targetNotes.filter((n) => todayTarget.done[n.id]).length;

  function toggleTarget(id: string) {
    setReadTargets((obj) => {
      const day = obj[tds] ?? { noteIds: [], done: {} };
      const has = day.noteIds.includes(id);
      const noteIds = has ? day.noteIds.filter((x) => x !== id) : [...day.noteIds, id];
      const done = { ...day.done };
      if (has) delete done[id];
      return { ...obj, [tds]: { noteIds, done } };
    });
  }

  function toggleDone(id: string) {
    setReadTargets((obj) => {
      const day = obj[tds] ?? { noteIds: [], done: {} };
      return { ...obj, [tds]: { ...day, done: { ...day.done, [id]: !day.done[id] } } };
    });
  }

  function save() {
    if (!title.trim()) return alert('Enter a title');
    if (editId) {
      setNotes((arr) => arr.map((n) => (n.id === editId ? { ...n, title: title.trim(), body: body.trim(), link: link.trim() } : n)));
      setEditId(null);
    } else {
      setNotes((arr) => [...arr, { id: uid(), tab, title: title.trim(), body: body.trim(), link: link.trim(), created: today() }]);
    }
    setTitle('');
    setBody('');
    setLink('');
  }

  function edit(n: Note) {
    setTitle(n.title);
    setBody(n.body);
    setLink(n.link);
    setEditId(n.id);
  }

  function remove(id: string) {
    if (!confirm('Delete note?')) return;
    setNotes((arr) => arr.filter((n) => n.id !== id));
  }

  const filtered = useMemo(() => notes.filter((n) => n.tab === tab), [notes, tab]);

  return (
    <div>
      <PageHeader title="Notes" sub="Ideas, links, and books worth remembering" />

      {targetNotes.length > 0 && (
        <Card className="mb-4 border-purple-bg bg-purple-bg/40">
          <CardPadded>
            <div className="mb-2 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
                <BookOpen size={14} /> Reading Target — Today
              </span>
              <span className={`text-[13px] font-bold ${doneCount === targetNotes.length ? 'text-green' : 'text-purple'}`}>
                {doneCount}/{targetNotes.length} done
              </span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-border">
              <div
                className="h-full rounded-full bg-purple transition-all"
                style={{ width: `${(doneCount / targetNotes.length) * 100}%` }}
              />
            </div>
            <div className="space-y-1.5">
              {targetNotes.map((n) => (
                <div key={n.id} className="flex items-center gap-2.5 rounded-md bg-surface px-2.5 py-1.5">
                  <button
                    onClick={() => toggleDone(n.id)}
                    className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition ${
                      todayTarget.done[n.id] ? 'border-green bg-green text-white' : 'border-border'
                    }`}
                  >
                    {todayTarget.done[n.id] && <Check size={12} />}
                  </button>
                  <span className="flex-1 truncate text-[13px] text-text">{n.title}</span>
                  <span className="text-[11px] text-text3">{n.tab}</span>
                  <IconButton onClick={() => toggleTarget(n.id)}>
                    <X size={12} />
                  </IconButton>
                </div>
              ))}
            </div>
          </CardPadded>
        </Card>
      )}

      <Segment className="mb-4">
        {TABS.map((t) => (
          <SegmentButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
            <span className="inline-flex items-center gap-1.5">
              <t.icon size={13} /> {t.label}
            </span>
          </SegmentButton>
        ))}
      </Segment>

      <Card className="mb-4">
        <CardPadded>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          </Field>
          <Field label="Notes">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Details..." />
          </Field>
          {tab === 'topics' && (
            <Field label="Link">
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://..." />
            </Field>
          )}
          <div className="mt-3.5 flex items-center gap-2">
            <Button onClick={save}>{editId ? 'Save' : 'Add'}</Button>
            {editId && (
              <Button
                variant="ghost"
                onClick={() => {
                  setEditId(null);
                  setTitle('');
                  setBody('');
                  setLink('');
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </CardPadded>
      </Card>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {!loaded && <div className="text-sm text-text3">Loading…</div>}
        {loaded && filtered.length === 0 && <div className="text-sm text-text3">Nothing here yet.</div>}
        {filtered.map((n) => {
          const isTargeted = todayTarget.noteIds.includes(n.id);
          const isDone = !!todayTarget.done[n.id];
          return (
            <Card key={n.id}>
              <CardPadded>
                <div className="mb-1.5 font-medium text-text">{n.title}</div>
                {n.body && <div className="mb-2 whitespace-pre-wrap text-[13px] text-text2">{n.body}</div>}
                {n.link && (
                  <a
                    href={n.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mb-2 inline-flex items-center gap-1 text-[12.5px] text-accent hover:underline"
                  >
                    <Link2 size={12} /> {n.link}
                  </a>
                )}
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-[11px] text-text4">{fmtD(n.created)}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleTarget(n.id)}
                      className={`rounded-md px-2 py-1 text-[11px] font-medium ${
                        isTargeted ? (isDone ? 'bg-green-bg text-green' : 'bg-purple-bg text-purple') : 'bg-bg3 text-text3'
                      }`}
                    >
                      {isTargeted ? (isDone ? 'Read' : 'Reading today') : 'Read today'}
                    </button>
                    <IconButton danger={false} onClick={() => edit(n)}>
                      <Pencil size={13} />
                    </IconButton>
                    <IconButton onClick={() => remove(n.id)}>
                      <X size={13} />
                    </IconButton>
                  </div>
                </div>
              </CardPadded>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card, CardPadded } from '@/components/ui/Card';
import { Field, Input, Textarea } from '@/components/ui/Field';
import { Button, IconButton } from '@/components/ui/Button';
import { useStore } from '@/lib/store';
import { uid, today, fmtD } from '@/lib/date';
import type { MiscEntry } from '@/lib/types';
import { Pencil, X } from 'lucide-react';

export default function OthersPage() {
  const { value: items, setValue: setItems, loaded } = useStore<MiscEntry[]>('misc', []);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [editId, setEditId] = useState<string | null>(null);

  function save() {
    if (!title.trim() && !body.trim()) {
      alert('Write something');
      return;
    }
    if (editId) {
      setItems((arr) => arr.map((n) => (n.id === editId ? { ...n, title: title.trim(), body: body.trim() } : n)));
      setEditId(null);
    } else {
      setItems((arr) => [{ id: uid(), title: title.trim(), body: body.trim(), created: today() }, ...arr]);
    }
    setTitle('');
    setBody('');
  }

  function edit(n: MiscEntry) {
    setTitle(n.title);
    setBody(n.body);
    setEditId(n.id);
  }

  function cancelEdit() {
    setEditId(null);
    setTitle('');
    setBody('');
  }

  function remove(id: string) {
    if (!confirm('Delete?')) return;
    setItems((arr) => arr.filter((n) => n.id !== id));
  }

  return (
    <div>
      <PageHeader title="Others" sub="Freeform — write anything" />
      <Card className="mb-3">
        <CardPadded>
          <Field label="Title">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What's on your mind?" />
          </Field>
          <Field label="Content">
            <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write anything..." />
          </Field>
          <div className="mt-3.5 flex items-center gap-2">
            <Button onClick={save}>Save</Button>
            {editId && (
              <Button variant="ghost" onClick={cancelEdit}>
                Cancel
              </Button>
            )}
          </div>
        </CardPadded>
      </Card>

      <Card>
        <div>
          {!loaded && <div className="p-4 text-sm text-text3">Loading…</div>}
          {loaded && items.length === 0 && <div className="p-4 text-sm text-text3">Nothing here yet.</div>}
          {items.map((n, i) => (
            <div
              key={n.id}
              className={`flex gap-3 p-4 ${i !== items.length - 1 ? 'border-b border-border2' : ''}`}
            >
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <div className="min-w-0 flex-1">
                {n.title && <div className="mb-1 font-medium text-text">{n.title}</div>}
                {n.body && <div className="whitespace-pre-wrap text-[13px] text-text2">{n.body}</div>}
                <div className="mt-1.5 text-[11px] text-text4">{fmtD(n.created)}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <IconButton danger={false} onClick={() => edit(n)}>
                  <Pencil size={13} />
                </IconButton>
                <IconButton onClick={() => remove(n.id)}>
                  <X size={13} />
                </IconButton>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

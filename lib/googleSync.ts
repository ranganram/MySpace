import { listTasks } from '@/lib/google';
import { uid, today } from '@/lib/date';
import type { Todo } from '@/lib/types';

const DEFAULT_LIST = '@default';

/**
 * Google owns the @default list (it's what Assistant/Gemini/the Google Tasks
 * app write to when you say "add a task"). This pulls it one-way into My
 * Space: brand new remote tasks become new local todos.
 *
 * Deliberately create-only, never update-existing: Google's Tasks API has
 * been observed to serve a stale read for a bit right after a write (e.g.
 * right after we push a completion via /api/google/complete), which made an
 * earlier "always overwrite local from remote" version flip completions back
 * and forth across consecutive pulls. Once a task exists in My Space, My
 * Space is the only source of truth for it — completing something via voice
 * after it's already been imported won't retroactively show here.
 */
export async function pullDefaultList(
  accessToken: string,
  todos: Todo[],
): Promise<{ todos: Todo[]; pulled: number; updated: number }> {
  const remoteTasks = await listTasks(accessToken, DEFAULT_LIST);
  const knownGoogleIds = new Set(todos.filter((t) => t.googleTaskId).map((t) => t.googleTaskId));

  let pulled = 0;
  let updated = 0;
  // One-time backfill: earlier versions of this import put everything in the
  // Personal tab. Move any already-imported item into the dedicated tab.
  const nextTodos = todos.map((t) => {
    if (t.googleListId === DEFAULT_LIST && t.tab !== 'google') {
      updated++;
      return { ...t, tab: 'google' as const };
    }
    return t;
  });

  for (const rt of remoteTasks) {
    if (knownGoogleIds.has(rt.id)) continue;
    if (rt.status === 'completed') continue; // already closed in Google — nothing to do here
    const due = rt.due ? rt.due.slice(0, 10) : '';
    nextTodos.push({
      id: uid(),
      tab: 'google',
      text: rt.title,
      notes: rt.notes || '',
      pri: 'medium',
      due,
      time: '',
      durMin: 0,
      endTime: '',
      subtasks: [],
      done: false,
      today: false,
      completedAt: '',
      created: today(),
      googleTaskId: rt.id,
      googleListId: DEFAULT_LIST,
    });
    pulled++;
  }

  return { todos: nextTodos, pulled, updated };
}

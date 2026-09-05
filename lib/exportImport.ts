import { createClient } from '@/lib/supabase/client';

export const DATA_KEYS = [
  'journal',
  'habits',
  'todos',
  'reminders',
  'notes',
  'misc',
  'planner_year',
  'planner_week',
  'log_trackers',
  'log_entries',
  'read_targets',
  'recurring_tasks',
  'watch_items',
];

export async function exportData() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: rows } = await supabase
    .from('myspace_data_v2')
    .select('key,value')
    .eq('user_id', user.id);

  const payload: Record<string, unknown> = {};
  (rows ?? []).forEach((r) => {
    if (DATA_KEYS.includes(r.key)) payload[r.key] = r.value;
  });

  const data = { version: 1, exported: new Date().toISOString(), data: payload };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `myspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function importData(event: React.ChangeEvent<HTMLInputElement>) {
  const file = event.target.files?.[0];
  if (!file) return;

  const text = await file.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    alert('Failed to read file. Make sure it is a valid MySpace JSON backup.');
    return;
  }

  const src = (parsed as { version?: number; data?: Record<string, unknown> }).version
    ? (parsed as { data: Record<string, unknown> }).data
    : (parsed as Record<string, unknown>);
  const keys = Object.keys(src).filter((k) => DATA_KEYS.includes(k));
  if (!keys.length) {
    alert('Invalid backup file — no recognisable data found.');
    return;
  }
  if (
    !confirm(
      `Import ${keys.length} data sections?\n\nThis will REPLACE your current data with the backup.\n\nSections: ${keys.join(', ')}`,
    )
  ) {
    event.target.value = '';
    return;
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await Promise.all(
    keys.map((k) =>
      supabase
        .from('myspace_data_v2')
        .upsert({ user_id: user.id, key: k, value: src[k] }, { onConflict: 'user_id,key' }),
    ),
  );

  event.target.value = '';
  alert(`Import successful — ${keys.length} sections restored. Reloading…`);
  window.location.reload();
}

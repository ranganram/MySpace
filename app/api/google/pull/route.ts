import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getValidAccessToken } from '@/lib/googleAuth';
import { pullDefaultList } from '@/lib/googleSync';
import type { Todo } from '@/lib/types';

/**
 * Lightweight, safe to call often (e.g. on every Tasks page load): only
 * imports/updates from Google's @default list into My Space. Never pushes
 * local changes out — that's what /api/google/sync (the manual "Sync now"
 * button) does.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const admin = createAdminClient();
  const { data: tokenRow } = await admin.from('google_tokens').select('*').eq('user_id', user.id).maybeSingle();
  if (!tokenRow) return NextResponse.json({ connected: false });

  try {
    const accessToken = await getValidAccessToken(admin, user.id, tokenRow);

    const { data: todosRow } = await admin
      .from('myspace_data_v2')
      .select('value')
      .eq('user_id', user.id)
      .eq('key', 'todos')
      .maybeSingle();
    const todos: Todo[] = (todosRow?.value as Todo[]) || [];

    const { todos: nextTodos, pulled, updated } = await pullDefaultList(accessToken, todos);

    if (pulled > 0 || updated > 0) {
      await admin.from('myspace_data_v2').upsert({ user_id: user.id, key: 'todos', value: nextTodos }, { onConflict: 'user_id,key' });
    }

    return NextResponse.json({ connected: true, pulled, updated });
  } catch (e) {
    console.error('Google Tasks pull failed', e);
    return NextResponse.json({ error: 'pull failed' }, { status: 500 });
  }
}

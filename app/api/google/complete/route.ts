import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getValidAccessToken } from '@/lib/googleAuth';
import { setTaskStatus } from '@/lib/google';

/**
 * Pushes ONLY a completion status change for one already-imported task.
 * Nothing else (title, due date, new tasks) ever goes from My Space to
 * Google — see /api/google/pull for the one-way-in import.
 */
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const { taskId, listId, completed } = await req.json();
  if (!taskId || !listId) return NextResponse.json({ error: 'missing taskId/listId' }, { status: 400 });

  const admin = createAdminClient();
  const { data: tokenRow } = await admin.from('google_tokens').select('*').eq('user_id', user.id).maybeSingle();
  if (!tokenRow) return NextResponse.json({ error: 'not connected' }, { status: 400 });

  try {
    const accessToken = await getValidAccessToken(admin, user.id, tokenRow);
    await setTaskStatus(accessToken, listId, taskId, !!completed);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Google Tasks status push failed', e);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

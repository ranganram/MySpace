import { NextResponse } from 'next/server';
import { exchangeCodeForTokens } from '@/lib/google';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const origin = url.origin;

  if (!code) return NextResponse.redirect(`${origin}/dashboard?google=error`);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  try {
    const redirectUri = `${origin}/api/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);

    const admin = createAdminClient();
    const { data: existing } = await admin
      .from('google_tokens')
      .select('refresh_token')
      .eq('user_id', user.id)
      .maybeSingle();

    const refreshToken = tokens.refresh_token || existing?.refresh_token;
    if (!refreshToken) throw new Error('No refresh token returned and none stored previously');

    await admin.from('google_tokens').upsert({
      user_id: user.id,
      refresh_token: refreshToken,
      access_token: tokens.access_token,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    });

    return NextResponse.redirect(`${origin}/dashboard?google=connected`);
  } catch (e) {
    console.error('Google OAuth callback failed', e);
    return NextResponse.redirect(`${origin}/dashboard?google=error`);
  }
}

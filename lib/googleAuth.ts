import type { SupabaseClient } from '@supabase/supabase-js';
import { refreshAccessToken } from '@/lib/google';

interface TokenRow {
  access_token: string;
  refresh_token: string;
  expires_at: string | null;
}

export async function getValidAccessToken(admin: SupabaseClient, userId: string, tokenRow: TokenRow): Promise<string> {
  if (tokenRow.expires_at && new Date(tokenRow.expires_at) > new Date()) {
    return tokenRow.access_token;
  }
  const refreshed = await refreshAccessToken(tokenRow.refresh_token);
  await admin
    .from('google_tokens')
    .update({ access_token: refreshed.access_token, expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
    .eq('user_id', userId);
  return refreshed.access_token;
}

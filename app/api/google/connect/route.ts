import { NextResponse } from 'next/server';
import { buildAuthUrl } from '@/lib/google';

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const redirectUri = `${origin}/api/google/callback`;
  return NextResponse.redirect(buildAuthUrl(redirectUri));
}

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const TASKS_API = 'https://tasks.googleapis.com/tasks/v1';

export function buildAuthUrl(redirectUri: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/tasks',
    access_type: 'offline',
    prompt: 'consent',
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error('Google token exchange failed: ' + (await res.text()));
  return res.json();
}

export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) throw new Error('Google token refresh failed: ' + (await res.text()));
  return res.json();
}

interface GTask {
  id: string;
  title: string;
  notes?: string;
  due?: string;
  status?: string;
}

async function tasksFetch(accessToken: string, path: string, init?: RequestInit) {
  const res = await fetch(`${TASKS_API}${path}`, {
    ...init,
    headers: { ...(init?.headers || {}), Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Google Tasks API ${path} failed: ${res.status} ${await res.text()}`);
  if (res.status === 204) return null;
  return res.json();
}

export async function listTasks(accessToken: string, tasklistId: string): Promise<GTask[]> {
  const data = await tasksFetch(accessToken, `/lists/${tasklistId}/tasks?showCompleted=true&showHidden=true&maxResults=100`);
  return data?.items || [];
}

/** Pushes only the completed/not-completed status for one task — nothing else. */
export async function setTaskStatus(accessToken: string, tasklistId: string, taskId: string, completed: boolean) {
  return tasksFetch(accessToken, `/lists/${tasklistId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: completed ? 'completed' : 'needsAction' }),
  });
}

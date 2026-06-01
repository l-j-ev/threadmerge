import { getServerSession } from 'next-auth';
import { authOptions } from './auth';

const API_BASE = process.env.API_BASE || 'http://localhost:4000';

/**
 * Server-side fetch to the Nootro backend, forwarding the user's access token.
 * Keeps the token server-side (never reaches the browser) and avoids CORS.
 */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const session = await getServerSession(authOptions);
  const token = session?.accessToken;
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

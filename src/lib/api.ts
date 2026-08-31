import type { ApiResponse, Role, SessionUser } from './contracts';

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3003/api/v1';

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  if (!response.ok) throw new Error(`API request failed: ${response.status}`);
  return response.json() as Promise<ApiResponse<T>>;
}

export const api = {
  getSession: () => request<{ user: SessionUser }>('/auth/session'),
  createDevSession: (role: Role) => request<{ user: SessionUser; expiresAt: string }>('/auth/dev-session', {
    method: 'POST',
    body: JSON.stringify({ role }),
  }),
  listProjects: () => request<{ items: unknown[] }>('/projects'),
};


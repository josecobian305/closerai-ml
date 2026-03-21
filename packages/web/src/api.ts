import type {
  ContactsResponse,
  MessagesResponse,
  DashboardStats,
  AgentStatus,
} from './types';

const BASE = '/app/api/v1';

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

export function fetchContacts(params: {
  limit?: number;
  startAfterId?: string;
  query?: string;
}): Promise<ContactsResponse> {
  const sp = new URLSearchParams();
  if (params.limit) sp.set('limit', String(params.limit));
  if (params.startAfterId) sp.set('startAfterId', params.startAfterId);
  if (params.query) sp.set('query', params.query);
  const qs = sp.toString();
  return apiFetch<ContactsResponse>(`/contacts${qs ? `?${qs}` : ''}`);
}

export function fetchMessages(phone: string): Promise<MessagesResponse> {
  return apiFetch<MessagesResponse>(`/contacts/${encodeURIComponent(phone)}/messages`);
}

export function fetchStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/stats');
}

export function fetchAgents(): Promise<{ agents: AgentStatus[] }> {
  return apiFetch<{ agents: AgentStatus[] }>('/agents');
}

export function sendMessage(phone: string, text: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/contacts/${encodeURIComponent(phone)}/send`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
}

export function saveNote(contactId: string, body: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/contacts/${contactId}/notes`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  });
}

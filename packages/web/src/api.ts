import type {
  ContactsResponse,
  MessagesResponse,
  DashboardStats,
  AgentStatus,
} from './types';

const BASE = '/api/v1';

/**
 * Generic fetch wrapper with error handling.
 */
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

/**
 * Fetch paginated contacts, optionally filtered by query and cursor.
 */
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

/**
 * Fetch all messages for a given phone number.
 */
export function fetchMessages(phone: string): Promise<MessagesResponse> {
  return apiFetch<MessagesResponse>(`/contacts/${encodeURIComponent(phone)}/messages`);
}

/**
 * Fetch live dashboard stats.
 */
export function fetchStats(): Promise<DashboardStats> {
  return apiFetch<DashboardStats>('/stats');
}

/**
 * Fetch agent workspace statuses.
 */
export function fetchAgents(): Promise<{ agents: AgentStatus[] }> {
  return apiFetch<{ agents: AgentStatus[] }>('/agents');
}

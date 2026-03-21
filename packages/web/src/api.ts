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

export interface CampaignAngle {
  id: string; name: string; agent: string; template: string;
  best_day_range: string; tone: string; channel: string;
  industry_variants?: Record<string, string>;
}

export interface CampaignDef {
  id: string; name: string; agent: string; tier: string;
  description: string; sequence_days: number;
  angles_rotation: string[]; channels: string[];
  persona: string; goal: string; status: string;
}

export interface LiveStats {
  active: number | null; cooling: number | null;
  funded: number | null; total_scanned: number | null;
  hyper?: number | null;
  agents: { jacob?: { active: number; funded: number }; angie?: { active: number; funded: number } };
  error?: string;
}

export interface CampaignEscalationStep {
  days: string; angles: string[]; tone: string;
}

export interface CampaignsResponse {
  campaigns: CampaignDef[];
  live_stats: LiveStats;
  escalation_ladder: CampaignEscalationStep[];
  total_campaigns: number;
}

export interface SequenceStats {
  by_day: Array<{ day: number; count: number; agents: { jacob: number; angie: number } }>;
  recent_active: Array<{ phone: string; day: number; agent: string }>;
  total_active: number;
  error?: string;
}

export interface CadencePhase {
  label: string; touches: number; desc: string; color: string;
}

export function fetchCampaigns(): Promise<CampaignsResponse> {
  return apiFetch<CampaignsResponse>('/campaigns');
}

export function fetchCampaignAngles(agent?: string): Promise<{ angles: CampaignAngle[]; count: number }> {
  const qs = agent ? `?agent=${agent}` : '';
  return apiFetch<{ angles: CampaignAngle[]; count: number }>(`/campaigns/angles${qs}`);
}

export function fetchSequenceStats(): Promise<SequenceStats> {
  return apiFetch<SequenceStats>('/campaigns/sequence-stats');
}

export interface HyperMerchant {
  phone: string; name: string; business: string;
  status: string; triggers: number; last_trigger: string;
  red_flags?: string[]; analysis_status?: string;
  email_subject?: string; state?: string; notes?: string;
  analysis?: any;
}

export function fetchHyper(): Promise<{ hyper: HyperMerchant[]; count: number }> {
  return apiFetch<{ hyper: HyperMerchant[]; count: number }>('/campaigns/hyper');
}

export function fetchCadence(): Promise<{ phases: CadencePhase[]; escalation_ladder: CampaignEscalationStep[] }> {
  return apiFetch<{ phases: CadencePhase[]; escalation_ladder: CampaignEscalationStep[] }>('/campaigns/cadence');
}

// ── New view endpoints ──────────────────────────────────────

export function fetchDashboard(): Promise<any> {
  return apiFetch<any>('/dashboard');
}

export function fetchInbox(): Promise<any> {
  return apiFetch<any>('/messages/inbox');
}

export function fetchEmailInbox(): Promise<any> {
  return apiFetch<any>('/email/inbox');
}

export function fetchPipeline(): Promise<any> {
  return apiFetch<any>('/pipeline');
}

export function fetchPipelineBoard(): Promise<any> {
  return apiFetch<any>('/pipeline/board');
}

export function fetchPipelineMerchant(phone: string): Promise<any> {
  return apiFetch<any>(`/pipeline/merchant/${encodeURIComponent(phone)}`);
}

export function advancePipelineStage(phone: string, from_stage: string, to_stage: string, notes?: string): Promise<any> {
  return apiFetch<any>('/pipeline/advance', {
    method: 'POST',
    body: JSON.stringify({ phone, from_stage, to_stage, notes }),
  });
}

export function fetchLenderMatch(phone: string): Promise<any> {
  return apiFetch<any>(`/pipeline/lender-match/${encodeURIComponent(phone)}`);
}

export function submitOffer(data: {
  phone: string;
  merchant_name: string;
  business_name: string;
  lenders: { lender_id: string; lender_name: string; contact_email: string; contact_name?: string; notes?: string }[];
  notes?: string;
  agent?: string;
  amount?: number;
  product?: string;
  position?: string;
}): Promise<any> {
  return apiFetch<any>('/pipeline/submit-offer', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function fetchDeals(): Promise<any> {
  return apiFetch<any>('/deals');
}

export function fetchDocuments(): Promise<any> {
  return apiFetch<any>('/documents');
}

export function fetchCourtSearch(query: string): Promise<any> {
  return apiFetch<any>(`/court-search?q=${encodeURIComponent(query)}`);
}

export function fetchReports(): Promise<any> {
  return apiFetch<any>('/reports');
}

export function retrainModel(): Promise<any> {
  return apiFetch<any>('/reports/retrain', { method: 'POST' });
}

export function fetchNotifications(): Promise<any> {
  return apiFetch<any>('/notifications');
}

export function fetchSettings(): Promise<any> {
  return apiFetch<any>('/settings');
}

export function saveSettings(data: any): Promise<any> {
  return apiFetch<any>('/settings', { method: 'POST', body: JSON.stringify(data) });
}

export function fetchPayments(): Promise<any> {
  return apiFetch<any>('/payments');
}

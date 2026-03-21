/** Shared TypeScript interfaces for CloserAI CRM */

/** Enriched contact from the API */
export interface Contact {
  id: string;
  name: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  companyName: string;
  tags: string[];
  dateAdded: string;
  lastActivity?: string;
  smsSentCount: number;
  lastSmsPreview?: string;
  lastSmsTs?: string;
  tier?: string;
  source?: string;
  agent?: string;
  stage?: string;
  trustScore?: number;
  industry?: string;
  revenue?: string;
  monthlyRevenue?: number;
  timeInBusiness?: string;
}

/** Message in a contact's chat log */
export interface Message {
  ts: string;
  direction: 'outbound' | 'inbound';
  phone: string;
  text: string;
  agent: string;
  type?: string;
  category?: string;
  channel?: 'sms' | 'email';
  subject?: string;
}

/** Paginated contacts response */
export interface ContactsResponse {
  contacts: Contact[];
  meta: {
    total: number;
    currentPage: number;
    nextPageUrl?: string;
    startAfterId?: string;
  };
}

/** Messages response */
export interface MessagesResponse {
  phone: string;
  messages: Message[];
  count: number;
}

/** Dashboard stats */
export interface DashboardStats {
  totalContacts: number;
  smsSentToday: number;
  smsSentTotal: number;
  repliesTotal: number;
  docsReceived?: number;
  replyRate?: number;
  repliesByCategory: Record<string, number>;
  agentStats: AgentStat[];
  asOf: string;
}

/** Per-agent stat entry */
export interface AgentStat {
  agent: string;
  sentToday: number;
  sentTotal: number;
  repliesTotal: number;
}

/** Agent workspace status */
export interface AgentStatus {
  name: string;
  displayName: string;
  workspacePath: string;
  logPaths: {
    sends: string;
    events: string;
  };
  stats: {
    sendsFileSize: number;
    eventsFileSize: number;
    lastModified?: string;
  };
  active: boolean;
}

/** Filter state for contacts grid */
export interface ContactFilter {
  query: string;
  tier?: string;
  hasReplied?: boolean;
  tag?: string;
}

/** Nav section identifiers */
export type NavSection =
  | 'dashboard'
  | 'contacts'
  | 'messages'
  | 'sms-campaigns'
  | 'email'
  | 'pipeline'
  | 'deals'
  | 'documents'
  | 'court-search'
  | 'ai-agents'
  | 'reports'
  | 'payments'
  | 'database'
  | 'notifications'
  | 'settings'
  | 'integrations';

/** Agent chat message */
export interface AgentChatMessage {
  id: string;
  channel: 'manager' | 'jacob' | 'angie' | 'brain';
  role: 'user' | 'agent';
  text: string;
  ts: Date;
}

/** Note */
export interface Note {
  id: string;
  body: string;
  createdAt: string;
  author?: string;
}

/** Deal */
export interface Deal {
  id: string;
  title: string;
  value: number;
  status: string;
  stage: string;
  createdAt: string;
}

/** Authenticated user config returned from /me */
export interface UserConfig {
  userId: string;
  businessName: string;
  industry: string;
  agent: { name: string; title: string; email: string };
  tone: string;
  layout: string; // 'overview_first' | 'contacts_first' | 'messages_first' | 'pipeline_first'
  capabilities: Record<string, boolean>;
  owner: { name: string; email: string; phone: string };
}

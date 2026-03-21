import { config } from './config';
import { logger } from './logger';

/** Raw GHL contact object from REST API */
export interface GhlContact {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  phone: string;
  companyName: string;
  tags: string[];
  customField: GhlCustomField[];
  dateAdded: string;
  lastActivity?: string;
  source?: string;
  country?: string;
  state?: string;
  city?: string;
  postalCode?: string;
  website?: string;
  locationId?: string;
  type?: string;
  assignedTo?: string;
  opportunities?: GhlOpportunity[];
}

/** Custom field entry on a GHL contact */
export interface GhlCustomField {
  id: string;
  value: string;
}

/** Opportunity object from GHL */
export interface GhlOpportunity {
  id: string;
  name: string;
  status: string;
  stageId: string;
  monetaryValue?: number;
}

/** Paginated GHL contacts response */
export interface GhlContactsResponse {
  contacts: GhlContact[];
  meta: {
    total: number;
    currentPage: number;
    nextPageUrl?: string;
    startAfterId?: string;
    startAfter?: number;
  };
}

/** Parameters for listing contacts */
export interface ListContactsParams {
  limit?: number;
  startAfterId?: string;
  startAfter?: number;
  query?: string;
}

/** Single contact lookup result */
export interface GetContactResult {
  contact: GhlContact;
}

/**
 * Fetches a page of contacts from GoHighLevel.
 * Uses cursor-based pagination (startAfterId / startAfter).
 *
 * @param params - Pagination and search parameters
 * @returns Paginated contacts response
 */
export async function listContacts(params: ListContactsParams = {}): Promise<GhlContactsResponse> {
  const { apiKey, locationId, baseUrl } = config.ghl;
  if (!apiKey) {
    throw new Error('GHL_API_KEY environment variable is not set');
  }

  const url = new URL(`${baseUrl}/contacts/`);
  url.searchParams.set('locationId', locationId);
  if (params.limit) url.searchParams.set('limit', String(params.limit));
  if (params.startAfterId) url.searchParams.set('startAfterId', params.startAfterId);
  if (params.startAfter) url.searchParams.set('startAfter', String(params.startAfter));
  if (params.query) url.searchParams.set('query', params.query);

  logger.debug('GHL contacts request', { url: url.toString() });

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error('GHL API error', { status: response.status, body });
    throw new Error(`GHL API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as GhlContactsResponse;
  logger.debug('GHL contacts fetched', { count: data.contacts?.length, total: data.meta?.total });
  return data;
}

/**
 * Searches contacts by query string (name, phone, email).
 *
 * @param query - Search string
 * @param limit - Max results (default 20)
 * @returns Matching contacts
 */
export async function searchContacts(query: string, limit = 20): Promise<GhlContact[]> {
  const result = await listContacts({ query, limit });
  return result.contacts ?? [];
}

/**
 * Fetches a single GHL contact by ID.
 *
 * @param contactId - GHL contact ID
 * @returns Contact record
 */
export async function getContact(contactId: string): Promise<GhlContact> {
  const { apiKey, baseUrl } = config.ghl;
  if (!apiKey) {
    throw new Error('GHL_API_KEY environment variable is not set');
  }

  const response = await fetch(`${baseUrl}/contacts/${contactId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GHL API error ${response.status}: ${body}`);
  }

  const data = (await response.json()) as GetContactResult;
  return data.contact;
}

/**
 * Creates a note on a GHL contact.
 *
 * @param contactId - GHL contact ID
 * @param body - Note text
 * @returns Created note ID
 */
export async function createNote(contactId: string, body: string): Promise<string> {
  const { apiKey, baseUrl } = config.ghl;
  if (!apiKey) throw new Error('GHL_API_KEY environment variable is not set');

  const response = await fetch(`${baseUrl}/contacts/${contactId}/notes`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    },
    body: JSON.stringify({ body }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GHL create note error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as { note: { id: string } };
  logger.info('GHL note created', { contactId, noteId: data.note?.id });
  return data.note?.id ?? '';
}

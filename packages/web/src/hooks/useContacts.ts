import { useState, useEffect, useCallback } from 'react';
import { fetchContacts } from '../api';
import type { Contact, ContactFilter } from '../types';

export interface UseContactsResult {
  contacts: Contact[];
  loading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  setFilter: (f: Partial<ContactFilter>) => void;
  filter: ContactFilter;
}

const PAGE_SIZE = 24;

export function useContacts(): UseContactsResult {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [cursor, setCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilterState] = useState<ContactFilter>({ query: '' });

  const load = useCallback(
    async (reset: boolean, currentFilter: ContactFilter, currentCursor?: string) => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchContacts({
          limit: PAGE_SIZE,
          startAfterId: reset ? undefined : currentCursor,
          query: currentFilter.query || undefined,
        });

        const incoming = result.contacts ?? [];

        // Client-side tier/tag filter
        let filtered = incoming;
        if (currentFilter.tier) {
          filtered = filtered.filter((c) => c.tier === currentFilter.tier);
        }
        if (currentFilter.tag) {
          filtered = filtered.filter((c) => c.tags?.includes(currentFilter.tag!));
        }

        setContacts((prev) => (reset ? filtered : [...prev, ...filtered]));
        setTotal(result.meta?.total ?? 0);
        setCursor(result.meta?.startAfterId);
        setHasMore(!!result.meta?.startAfterId && incoming.length === PAGE_SIZE);
      } catch (e) {
        setError(String(e));
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    load(true, filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) load(false, filter, cursor);
  }, [loading, hasMore, load, filter, cursor]);

  const refresh = useCallback(() => load(true, filter), [load, filter]);

  const setFilter = useCallback((partial: Partial<ContactFilter>) => {
    setFilterState((prev) => ({ ...prev, ...partial }));
  }, []);

  return { contacts, loading, error, total, hasMore, loadMore, refresh, setFilter, filter };
}

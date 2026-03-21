import { useState, useEffect } from 'react';
import { fetchMessages } from '../api';
import type { Message } from '../types';

/** Return type for useMessages hook */
export interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  error: string | null;
}

/**
 * Fetches all SMS messages (outbound + inbound replies) for a given phone number.
 * @param phone - E.164 phone number, or null to skip fetching
 */
export function useMessages(phone: string | null): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!phone) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchMessages(phone)
      .then((res) => {
        if (!cancelled) setMessages(res.messages ?? []);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [phone]);

  return { messages, loading, error };
}

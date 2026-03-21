import { useState, useEffect } from 'react';
import { fetchMessages } from '../api';
import type { Message } from '../types';

export interface UseMessagesResult {
  messages: Message[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useMessages(phone: string | null): UseMessagesResult {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rev, setRev] = useState(0);

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

    return () => { cancelled = true; };
  }, [phone, rev]);

  const reload = () => setRev((r) => r + 1);

  return { messages, loading, error, reload };
}

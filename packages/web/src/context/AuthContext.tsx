import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserConfig } from '../types';

interface AuthState {
  token: string | null;
  user: UserConfig | null;
  loading: boolean;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (token: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ADMIN_EMAILS = ['jcobian@chccapitalgroup.com', 'jose@chccapitalgroup.com'];
const CHC_USER_IDS = ['chc-admin', 'jose'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    token: null,
    user: null,
    loading: true,
    error: null,
  });

  /** Fetch /me and populate user config */
  async function fetchMe(token: string): Promise<UserConfig | null> {
    try {
      const res = await fetch('/app/api/v1/register/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem('auth_token');
        }
        return null;
      }
      const data = await res.json();
      // Map the API response to UserConfig
      const config = data.config;
      return {
        userId: data.userId,
        businessName: config.businessName,
        industry: config.industry,
        agent: {
          name: config.agent?.name || 'Agent',
          title: config.agent?.title || 'Sales Agent',
          email: config.agent?.email || '',
        },
        tone: config.tone || 'professional',
        layout: config.layout || 'overview_first',
        capabilities: config.capabilities || {},
        owner: {
          name: config.owner?.name || '',
          email: config.owner?.email || '',
          phone: config.owner?.phone || '',
        },
      };
    } catch {
      return null;
    }
  }

  /** Login with token (called after registration or login form) */
  async function login(token: string): Promise<void> {
    setState((s) => ({ ...s, loading: true, error: null }));
    localStorage.setItem('auth_token', token);
    const user = await fetchMe(token);
    if (user) {
      setState({ token, user, loading: false, error: null });
    } else {
      localStorage.removeItem('auth_token');
      setState({ token: null, user: null, loading: false, error: 'Failed to load user profile' });
    }
  }

  function logout(): void {
    localStorage.removeItem('auth_token');
    setState({ token: null, user: null, loading: false, error: null });
  }

  /** On mount: restore from localStorage */
  useEffect(() => {
    const stored = localStorage.getItem('auth_token');
    if (!stored) {
      setState({ token: null, user: null, loading: false, error: null });
      return;
    }
    fetchMe(stored).then((user) => {
      if (user) {
        setState({ token: stored, user, loading: false, error: null });
      } else {
        setState({ token: null, user: null, loading: false, error: null });
      }
    });
  }, []);

  /** Determine if current user is a CHC admin */
  const isAdmin =
    !!state.user &&
    (CHC_USER_IDS.includes(state.user.userId) ||
      ADMIN_EMAILS.includes(state.user.owner.email) ||
      state.user.businessName?.toLowerCase().includes('chc') ||
      state.user.businessName?.toLowerCase().includes('capital'));

  return (
    <AuthContext.Provider value={{ ...state, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

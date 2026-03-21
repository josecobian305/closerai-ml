import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

export interface UserPreferences {
  layout: 'overview_first' | 'contacts_first' | 'messages_first' | 'pipeline_first';
  theme: 'dark' | 'light' | 'midnight' | 'ocean' | 'sunset';
  widgetOrder: string[]; // ['stats', 'contacts', 'agents', 'pipeline']
  defaultFilter: string; // 'all' | 'hot' | 'warm' | etc.
  invertColors: boolean;
  compactMode: boolean;
  showAgentChat: boolean;
  sidebarCollapsed: boolean;
  accentColor: string; // hex color
  fontSize: 'small' | 'medium' | 'large';
}

const DEFAULT_PREFERENCES: UserPreferences = {
  layout: 'overview_first',
  theme: 'dark',
  widgetOrder: ['stats', 'contacts', 'agents', 'pipeline'],
  defaultFilter: 'all',
  invertColors: false,
  compactMode: false,
  showAgentChat: false,
  sidebarCollapsed: false,
  accentColor: '#6366f1',
  fontSize: 'medium',
};

// Theme CSS variable definitions
const THEMES: Record<UserPreferences['theme'], {
  bg: string;
  surface: string;
  text: string;
  accent: string;
  border: string;
  muted: string;
}> = {
  dark: {
    bg: '#0b0f1a',
    surface: '#111827',
    text: '#e2e8f0',
    accent: '#6366f1',
    border: '#1f2937',
    muted: '#6b7280',
  },
  light: {
    bg: '#f8fafc',
    surface: '#ffffff',
    text: '#1e293b',
    accent: '#6366f1',
    border: '#e2e8f0',
    muted: '#94a3b8',
  },
  midnight: {
    bg: '#020617',
    surface: '#0f172a',
    text: '#e2e8f0',
    accent: '#8b5cf6',
    border: '#1e293b',
    muted: '#475569',
  },
  ocean: {
    bg: '#042f2e',
    surface: '#0d3331',
    text: '#ccfbf1',
    accent: '#14b8a6',
    border: '#134e4a',
    muted: '#5eead4',
  },
  sunset: {
    bg: '#1c0a00',
    surface: '#2d1400',
    text: '#fef3c7',
    accent: '#f59e0b',
    border: '#451a03',
    muted: '#d97706',
  },
};

const FONT_SIZE_MAP: Record<UserPreferences['fontSize'], string> = {
  small: '13px',
  medium: '15px',
  large: '17px',
};

function loadPreferences(): UserPreferences {
  try {
    const raw = localStorage.getItem('user_preferences');
    if (!raw) return { ...DEFAULT_PREFERENCES };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PREFERENCES, ...parsed };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(prefs: UserPreferences): void {
  try {
    localStorage.setItem('user_preferences', JSON.stringify(prefs));
  } catch {}
}

function applyTheme(prefs: UserPreferences): void {
  const root = document.documentElement;
  const theme = THEMES[prefs.theme] || THEMES.dark;

  // Apply theme CSS variables
  root.style.setProperty('--color-bg', theme.bg);
  root.style.setProperty('--color-surface', theme.surface);
  root.style.setProperty('--color-text', theme.text);
  root.style.setProperty('--color-border', theme.border);
  root.style.setProperty('--color-muted', theme.muted);

  // Accent color — use user override or theme default
  const accent = prefs.accentColor || theme.accent;
  root.style.setProperty('--color-accent', accent);

  // Font size
  root.style.setProperty('--font-size-base', FONT_SIZE_MAP[prefs.fontSize] || '15px');
  document.body.style.fontSize = FONT_SIZE_MAP[prefs.fontSize] || '15px';

  // Invert colors
  if (prefs.invertColors) {
    document.body.style.filter = 'invert(1) hue-rotate(180deg)';
  } else {
    document.body.style.filter = '';
  }

  // Apply theme class to body for Tailwind overrides
  document.body.setAttribute('data-theme', prefs.theme);
  document.body.setAttribute('data-compact', prefs.compactMode ? 'true' : 'false');

  // For light theme — override Tailwind's dark bg classes with CSS variables
  if (prefs.theme === 'light') {
    root.style.setProperty('--tw-bg-opacity', '1');
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;
  } else {
    document.body.style.backgroundColor = theme.bg;
    document.body.style.color = theme.text;
  }
}

interface PreferencesContextValue {
  preferences: UserPreferences;
  updatePreferences: (partial: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

export function PreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreferences>(() => {
    const loaded = loadPreferences();
    return loaded;
  });

  // Apply theme on mount and whenever preferences change
  useEffect(() => {
    applyTheme(preferences);
  }, [preferences]);

  const updatePreferences = useCallback((partial: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const next = { ...prev, ...partial };
      savePreferences(next);
      return next;
    });
  }, []);

  const resetPreferences = useCallback(() => {
    const defaults = { ...DEFAULT_PREFERENCES };
    savePreferences(defaults);
    setPreferences(defaults);
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, updatePreferences, resetPreferences }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return ctx;
}

export { DEFAULT_PREFERENCES, THEMES };

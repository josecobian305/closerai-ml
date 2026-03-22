import { usePreferences } from '../context/PreferencesContext';
import type { DashboardStats } from '../types';

interface StatsRowProps {
  stats: DashboardStats | null;
  loading?: boolean;
  isAdmin?: boolean;
  compact?: boolean;
}

function fmtNum(n?: number): string {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString();
}

function fmtPct(n?: number): string {
  if (n === undefined || n === null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function StatsRow({ stats, loading, isAdmin, compact: compactProp }: StatsRowProps) {
  const { preferences } = usePreferences();
  const isCompact = compactProp || preferences.compactMode;

  if (loading || !stats) {
    if (isCompact) {
      return (
        <div className="flex gap-3 mb-4 overflow-x-auto pb-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 animate-pulse" style={{
              height: '32px',
              width: '112px',
              background: 'var(--bg-card)',
              borderRadius: '8px',
            }} />
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="stripe-card animate-pulse">
            <div style={{ height: '10px', width: '80px', background: 'var(--bg-elevated)', borderRadius: '4px', marginBottom: '12px' }} />
            <div style={{ height: '32px', width: '96px', background: 'var(--bg-elevated)', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
    );
  }

  const totalContacts = isAdmin
    ? fmtNum(stats.totalContacts ?? 46961)
    : fmtNum(stats.totalContacts ?? 0);

  const cards = [
    {
      label: 'TOTAL CONTACTS',
      value: totalContacts,
      color: '#635bff',
      bgTint: 'rgba(99,91,255,0.06)',
      hint: !isAdmin && stats.totalContacts === 0 ? 'Upload leads to get started' : undefined,
    },
    {
      label: 'SMS SENT',
      value: fmtNum(stats.smsSentTotal),
      color: '#22c55e',
      bgTint: 'rgba(34,197,94,0.06)',
    },
    {
      label: 'TOTAL REPLIES',
      value: fmtNum(stats.repliesTotal),
      color: '#f59e0b',
      bgTint: 'rgba(245,158,11,0.06)',
    },
    {
      label: 'DOCS RECEIVED',
      value: fmtNum(stats.docsReceived ?? 0),
      color: '#a855f7',
      bgTint: 'rgba(168,85,247,0.06)',
    },
    {
      label: 'REPLY RATE',
      value: stats.replyRate != null && stats.smsSentTotal > 0
        ? fmtPct(stats.replyRate)
        : isAdmin ? fmtPct(stats.replyRate) : '—',
      color: '#06b6d4',
      bgTint: 'rgba(6,182,212,0.06)',
    },
  ];

  if (isCompact) {
    return (
      <div className="flex flex-wrap gap-2 mb-4 stripe-card" style={{ padding: '12px 16px' }}>
        {cards.map((card, idx) => (
          <div key={card.label} className="flex items-center gap-1.5" style={{ fontSize: '12px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{card.label}:</span>
            <span style={{ color: card.color, fontWeight: 700 }}>{card.value}</span>
            {idx !== cards.length - 1 && (
              <span style={{ color: 'var(--text-subtle)', margin: '0 4px' }}>·</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="stripe-card" style={{ background: card.bgTint }}>
          <p className="metric-label" style={{ marginBottom: '8px' }}>{card.label}</p>
          <p className="metric-value" style={{ color: card.color }}>{card.value}</p>
          {card.hint && (
            <p style={{ fontSize: '11px', color: 'var(--text-subtle)', marginTop: '4px' }}>{card.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}

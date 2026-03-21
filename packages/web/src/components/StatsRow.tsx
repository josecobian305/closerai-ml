import { usePreferences } from '../context/PreferencesContext';
import type { DashboardStats } from '../types';

interface StatsRowProps {
  stats: DashboardStats | null;
  loading?: boolean;
  isAdmin?: boolean;
  compact?: boolean; // force compact regardless of preference
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
            <div key={i} className="flex-shrink-0 h-8 w-28 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      );
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl p-4 animate-pulse" style={{ backgroundColor: 'var(--color-surface, #111827)', border: '1px solid var(--color-border, #1f2937)' }}>
            <div className="h-3 w-20 rounded mb-3" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
            <div className="h-8 w-24 rounded" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
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
      label: 'Total Contacts',
      value: totalContacts,
      icon: '👥',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10',
      border: 'border-indigo-500/20',
      hint: !isAdmin && stats.totalContacts === 0 ? 'Upload leads to get started' : undefined,
    },
    {
      label: 'SMS Sent',
      value: fmtNum(stats.smsSentTotal),
      icon: '📤',
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    },
    {
      label: 'Total Replies',
      value: fmtNum(stats.repliesTotal),
      icon: '💬',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
    },
    {
      label: 'Docs Received',
      value: fmtNum(stats.docsReceived ?? 0),
      icon: '📄',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Reply Rate',
      value: stats.replyRate != null && stats.smsSentTotal > 0
        ? fmtPct(stats.replyRate)
        : isAdmin ? fmtPct(stats.replyRate) : '—',
      icon: '📊',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
  ];

  // Compact mode: single horizontal bar
  if (isCompact) {
    return (
      <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-xl border" style={{
        backgroundColor: 'var(--color-surface, #111827)',
        borderColor: 'var(--color-border, #1f2937)',
      }}>
        {cards.map((card) => (
          <div key={card.label} className="flex items-center gap-1.5 text-xs">
            <span>{card.icon}</span>
            <span style={{ color: 'var(--color-muted, #6b7280)' }}>{card.label}:</span>
            <span className={`font-bold ${card.color}`}>{card.value}</span>
            {card !== cards[cards.length - 1] && (
              <span style={{ color: 'var(--color-border, #1f2937)' }} className="ml-1">·</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Full card mode
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`rounded-2xl p-4 border ${card.bg} ${card.border}`}
        >
          <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--color-muted, #6b7280)' }}>
            <span>{card.icon}</span>
            <span className="font-medium">{card.label}</span>
          </div>
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          {card.hint && (
            <p className="text-xs mt-1" style={{ color: 'var(--color-muted, #6b7280)' }}>{card.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}

import type { DashboardStats } from '../types';

interface StatsRowProps {
  stats: DashboardStats | null;
  loading?: boolean;
  isAdmin?: boolean;
}

function fmtNum(n?: number): string {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString();
}

function fmtPct(n?: number): string {
  if (n === undefined || n === null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}

export function StatsRow({ stats, loading, isAdmin }: StatsRowProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 animate-pulse">
            <div className="h-3 w-20 bg-gray-700 rounded mb-3" />
            <div className="h-8 w-24 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  // For CHC admin: show real GHL stats (total contacts is hardcoded as fallback for known count)
  // For tenants: show workspace stats (all zeros initially)
  const totalContacts = isAdmin
    ? fmtNum(stats.totalContacts ?? 46961)
    : fmtNum(stats.totalContacts ?? 0);

  const cards = [
    {
      label: 'Total Contacts',
      value: totalContacts,
      icon: '👥',
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
      hint: !isAdmin && stats.totalContacts === 0 ? 'Upload leads to get started' : undefined,
    },
    {
      label: 'SMS Sent',
      value: fmtNum(stats.smsSentTotal),
      icon: '📤',
      color: 'text-green-400',
      bg: 'bg-green-500/10 border-green-500/20',
    },
    {
      label: 'Total Replies',
      value: fmtNum(stats.repliesTotal),
      icon: '💬',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20',
    },
    {
      label: 'Docs Received',
      value: fmtNum(stats.docsReceived ?? 0),
      icon: '📄',
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      label: 'Reply Rate',
      value: stats.replyRate != null && stats.smsSentTotal > 0
        ? fmtPct(stats.replyRate)
        : isAdmin ? fmtPct(stats.replyRate) : '—',
      icon: '📊',
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      {cards.map((card) => (
        <div key={card.label} className={`border rounded-2xl p-4 ${card.bg}`}>
          <div className="flex items-center gap-2 text-gray-400 text-xs mb-2">
            <span>{card.icon}</span>
            <span className="font-medium">{card.label}</span>
          </div>
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
          {card.hint && (
            <p className="text-xs text-gray-600 mt-1">{card.hint}</p>
          )}
        </div>
      ))}
    </div>
  );
}

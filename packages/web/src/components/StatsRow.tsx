import type { DashboardStats } from '../types';

interface StatsRowProps {
  stats: DashboardStats | null;
  loading?: boolean;
}

interface StatCard {
  label: string;
  value: string | number;
  icon: string;
  color: string;
}

/**
 * Dashboard stats row — total contacts, SMS today, replies, etc.
 */
export function StatsRow({ stats, loading }: StatsRowProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 animate-pulse">
            <div className="h-4 w-20 bg-gray-700 rounded mb-3" />
            <div className="h-8 w-24 bg-gray-700 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const cards: StatCard[] = [
    {
      label: 'Total Contacts',
      value: stats.totalContacts.toLocaleString(),
      icon: '👥',
      color: 'text-indigo-400',
    },
    {
      label: 'SMS Sent Today',
      value: stats.smsSentToday.toLocaleString(),
      icon: '📤',
      color: 'text-green-400',
    },
    {
      label: 'Total Replies',
      value: stats.repliesTotal.toLocaleString(),
      icon: '💬',
      color: 'text-yellow-400',
    },
    {
      label: 'SMS All Time',
      value: stats.smsSentTotal.toLocaleString(),
      icon: '📊',
      color: 'text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {cards.map((card) => (
        <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-2">
            <span>{card.icon}</span>
            <span>{card.label}</span>
          </div>
          <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  );
}

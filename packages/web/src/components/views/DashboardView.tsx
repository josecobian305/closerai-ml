import { useEffect, useState } from 'react';
import { fetchDashboard } from '../../api';
import { BarChart3, MessageSquare, Zap, TrendingUp, Activity } from 'lucide-react';

const KPI_CARDS = [
  { key: 'totalContacts', label: 'Total Sends', icon: BarChart3, color: 'text-blue-400' },
  { key: 'smsToday', label: 'SMS Today', icon: MessageSquare, color: 'text-green-400' },
  { key: 'replyRate', label: 'Reply Rate %', icon: TrendingUp, color: 'text-yellow-400' },
  { key: 'activeSequences', label: 'Active Sequences', icon: Activity, color: 'text-purple-400' },
  { key: 'hyperCount', label: 'HYPER Triggers', icon: Zap, color: 'text-red-400' },
];

const EVENT_ICONS: Record<string, string> = {
  reply_classified: '💬', sms_sent: '📤', email_sent: '📧',
  hyper_mode_triggered: '⚡', state_transition: '🔀',
  docs_received: '📄', auto_reply: '🤖', voice_note_sent: '🎤',
};

export function DashboardView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <DashboardSkeleton />;

  const kpis = data?.kpis || {};
  const feed = data?.activityFeed || [];
  const angles = data?.topAngles;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-white">Dashboard</h2>
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {KPI_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Icon size={16} className={color} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-2xl font-bold text-white">
              {key === 'replyRate' ? `${kpis[key] || 0}%` : (kpis[key] ?? 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {feed.length === 0 ? (
              <p className="text-gray-500 text-sm">No recent activity</p>
            ) : feed.map((ev: any, i: number) => (
              <div key={i} className="flex items-start gap-3 text-sm">
                <span className="text-lg">{EVENT_ICONS[ev.type] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-300 truncate">
                    <span className="text-gray-500">[{ev.agent}]</span>{' '}
                    {ev.type?.replace(/_/g, ' ')}{ev.phone ? ` — ${ev.phone}` : ''}
                  </p>
                  <p className="text-xs text-gray-600">{ev.ts ? new Date(ev.ts).toLocaleString() : ''}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Angles */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Top Performing Angles</h3>
          {angles?.ranking ? (
            <div className="space-y-2">
              {angles.ranking.slice(0, 8).map((name: string, i: number) => {
                const w = angles.weights?.[name];
                return (
                  <div key={name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        i < 3 ? 'bg-yellow-900/60 text-yellow-300' : 'bg-gray-800 text-gray-400'
                      }`}>{i + 1}</span>
                      <span className="text-gray-300">{name.replace(/_/g, ' ')}</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs font-mono ${(w?.weight || 0) > 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {w?.reply_rate ? `${(w.reply_rate * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No angle data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-8 bg-gray-800 rounded w-40 animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 animate-pulse">
            <div className="h-3 bg-gray-800 rounded w-20 mb-3" />
            <div className="h-7 bg-gray-800 rounded w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[0, 1].map(i => (
          <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-64" />
        ))}
      </div>
    </div>
  );
}

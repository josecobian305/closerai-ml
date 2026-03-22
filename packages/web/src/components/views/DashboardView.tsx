import { useEffect, useState } from 'react';
import { fetchDashboard } from '../../api';
import { BarChart3, MessageSquare, Zap, TrendingUp, Activity } from 'lucide-react';

const KPI_CARDS = [
  { key: 'totalContacts', label: 'TOTAL SENDS', icon: BarChart3, color: '#635bff' },
  { key: 'smsToday', label: 'SMS TODAY', icon: MessageSquare, color: '#22c55e' },
  { key: 'replyRate', label: 'REPLY RATE %', icon: TrendingUp, color: '#f59e0b' },
  { key: 'activeSequences', label: 'ACTIVE SEQUENCES', icon: Activity, color: '#a855f7' },
  { key: 'hyperCount', label: 'HYPER TRIGGERS', icon: Zap, color: '#ef4444' },
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
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        Dashboard
      </h2>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {KPI_CARDS.map(({ key, label, icon: Icon, color }) => (
          <div key={key} className="stripe-card">
            <div className="flex items-center gap-2" style={{ marginBottom: '10px' }}>
              <Icon size={14} style={{ color }} />
              <span className="metric-label">{label}</span>
            </div>
            <p className="metric-value" style={{ color }}>
              {key === 'replyRate' ? `${kpis[key] || 0}%` : (kpis[key] ?? 0).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Activity Feed */}
        <div className="stripe-card">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Recent Activity
          </h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {feed.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>No recent activity</p>
            ) : feed.map((ev: any, i: number) => (
              <div key={i} className="flex items-start gap-3 stripe-table-row" style={{ padding: '8px', borderRadius: '6px' }}>
                <span style={{ fontSize: '16px' }}>{EVENT_ICONS[ev.type] || '📌'}</span>
                <div className="flex-1 min-w-0">
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }} className="truncate">
                    <span style={{ color: 'var(--text-subtle)' }}>[{ev.agent}]</span>{' '}
                    {ev.type?.replace(/_/g, ' ')}{ev.phone ? ` — ${ev.phone}` : ''}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
                    {ev.ts ? new Date(ev.ts).toLocaleString() : ''}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Angles */}
        <div className="stripe-card">
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Top Performing Angles
          </h3>
          {angles?.ranking ? (
            <div className="space-y-1">
              {angles.ranking.slice(0, 8).map((name: string, i: number) => {
                const w = angles.weights?.[name];
                return (
                  <div key={name} className="flex items-center justify-between stripe-table-row" style={{ padding: '8px', borderRadius: '6px', fontSize: '13px' }}>
                    <div className="flex items-center gap-2">
                      <span style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '10px',
                        fontWeight: 700,
                        background: i < 3 ? 'rgba(245,158,11,0.12)' : 'rgba(255,255,255,0.04)',
                        color: i < 3 ? '#fbbf24' : 'var(--text-subtle)',
                      }}>{i + 1}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{name.replace(/_/g, ' ')}</span>
                    </div>
                    <div>
                      <span style={{
                        fontSize: '12px',
                        fontFamily: 'monospace',
                        color: (w?.weight || 0) > 0 ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {w?.reply_rate ? `${(w.reply_rate * 100).toFixed(1)}%` : '—'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: 'var(--text-subtle)' }}>No angle data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="animate-pulse" style={{ height: '24px', width: '160px', background: 'var(--bg-card)', borderRadius: '6px' }} />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="stripe-card animate-pulse">
            <div style={{ height: '10px', width: '80px', background: 'var(--bg-elevated)', borderRadius: '4px', marginBottom: '12px' }} />
            <div style={{ height: '28px', width: '64px', background: 'var(--bg-elevated)', borderRadius: '4px' }} />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[0, 1].map(i => (
          <div key={i} className="stripe-card animate-pulse" style={{ height: '256px' }} />
        ))}
      </div>
    </div>
  );
}

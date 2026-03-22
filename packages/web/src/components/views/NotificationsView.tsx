import { useEffect, useState } from 'react';
import { fetchNotifications } from '../../api';
import { Bell, Zap, ArrowRight, MessageSquare, FileText, Flame } from 'lucide-react';

const ICONS: Record<string, any> = {
  hyper_mode_triggered: { icon: Zap, color: 'text-red-400 bg-red-900/40' },
  state_transition: { icon: ArrowRight, color: 'text-purple-400 bg-purple-900/40' },
  reply_classified: { icon: MessageSquare, color: 'text-blue-400 bg-blue-900/40' },
  docs_received: { icon: FileText, color: 'text-yellow-400 bg-yellow-900/40' },
  auto_reply: { icon: Flame, color: 'text-orange-400 bg-orange-900/40' },
  email_sent: { icon: MessageSquare, color: 'text-green-400 bg-green-900/40' },
  voice_note_sent: { icon: Bell, color: 'text-[#a5b4fc] bg-indigo-900/40' },
};

export function NotificationsView() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications().then(d => setData(d.notifications || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 max-w-3xl">
      <h2 className="text-2xl font-bold text-white">Notifications</h2>
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-4 animate-pulse h-16" />)}</div>
      ) : data.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-12 text-center">
          <Bell size={36} className="text-[var(--text-subtle)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">No notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((n, i) => {
            const cfg = ICONS[n.type] || { icon: Bell, color: 'text-[var(--text-muted)] bg-[var(--bg-elevated)]' };
            const Icon = cfg.icon;
            return (
              <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cfg.color}`}>
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-secondary)] text-sm">
                    <span className="text-white font-medium">{n.type?.replace(/_/g, ' ')}</span>
                    {n.phone && <span className="text-[var(--text-muted)]"> · {n.phone}</span>}
                    {n.to && <span className="text-[var(--text-muted)]"> → {n.to}</span>}
                    {n.business && <span className="text-[var(--text-muted)]"> · {n.business}</span>}
                  </p>
                  <p className="text-xs text-[var(--text-subtle)]">{n.agent} · {n.ts ? new Date(n.ts).toLocaleString() : ''}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

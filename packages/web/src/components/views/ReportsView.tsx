import { useEffect, useState } from 'react';
import { fetchReports, retrainModel } from '../../api';
import { BarChart3, RefreshCw, Loader2 } from 'lucide-react';

export function ReportsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [retraining, setRetraining] = useState(false);
  const [retrainResult, setRetrainResult] = useState<string | null>(null);

  useEffect(() => {
    fetchReports().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleRetrain = async () => {
    setRetraining(true);
    setRetrainResult(null);
    try {
      const r = await retrainModel();
      setRetrainResult(r.success ? 'Retrained successfully' : r.error || 'Failed');
    } catch (e: any) { setRetrainResult(e.message); }
    setRetraining(false);
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-[var(--bg-elevated)] rounded w-40 animate-pulse" />
      {[...Array(3)].map((_, i) => <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5 animate-pulse h-40" />)}
    </div>
  );

  const agents = data?.agents || [];
  const chart = data?.chartData || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Reports</h2>
        <button onClick={handleRetrain} disabled={retraining}
          className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 disabled:bg-[var(--bg-elevated)] text-white rounded-xl text-sm flex items-center gap-2">
          {retraining ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Retrain ML
        </button>
      </div>
      {retrainResult && <div className="p-3 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl text-sm text-[var(--text-secondary)]">{retrainResult}</div>}

      {/* Agent comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {agents.map((a: any) => (
          <div key={a.agent} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5">
            <h3 className="text-lg font-semibold text-white mb-3 capitalize">{a.agent}</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[var(--bg-elevated)]/60 rounded-xl p-3">
                <p className="text-xs text-[var(--text-muted)]">Sends</p>
                <p className="text-white font-bold">{a.totalSends.toLocaleString()}</p>
              </div>
              <div className="bg-[var(--bg-elevated)]/60 rounded-xl p-3">
                <p className="text-xs text-[var(--text-muted)]">Replies</p>
                <p className="text-white font-bold">{a.totalReplies}</p>
              </div>
              <div className="bg-[var(--bg-elevated)]/60 rounded-xl p-3">
                <p className="text-xs text-[var(--text-muted)]">Reply Rate</p>
                <p className="text-green-400 font-bold">{a.replyRate}%</p>
              </div>
            </div>
            {a.top3 && (
              <div className="mt-3">
                <p className="text-xs text-[var(--text-muted)] mb-1">Top 3 Angles</p>
                <div className="flex flex-wrap gap-1">
                  {a.top3.map((angle: string) => (
                    <span key={angle} className="text-xs bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded-full">{angle.replace(/_/g, ' ')}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 14-day chart (text-based) */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <BarChart3 size={18} /> 14-Day Volume
        </h3>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {chart.length === 0 ? (
            <p className="text-[var(--text-muted)] text-sm">No chart data</p>
          ) : chart.map((d: any) => {
            const maxSends = Math.max(...chart.map((c: any) => c.jacobSends + c.angieSends), 1);
            const total = d.jacobSends + d.angieSends;
            const pct = (total / maxSends) * 100;
            return (
              <div key={d.date} className="flex items-center gap-3 text-sm">
                <span className="text-[var(--text-muted)] w-20 text-xs">{d.date.slice(5)}</span>
                <div className="flex-1 flex h-6 rounded-lg overflow-hidden bg-[var(--bg-elevated)]">
                  {d.jacobSends > 0 && <div className="bg-green-600 h-full" style={{ width: `${(d.jacobSends / maxSends) * 100}%` }} />}
                  {d.angieSends > 0 && <div className="bg-purple-600 h-full" style={{ width: `${(d.angieSends / maxSends) * 100}%` }} />}
                </div>
                <span className="text-[var(--text-muted)] text-xs w-12 text-right">{total}</span>
                <span className="text-xs text-[var(--text-subtle)] w-8">
                  {d.jacobReplies + d.angieReplies > 0 ? `+${d.jacobReplies + d.angieReplies}` : ''}
                </span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-600 rounded" /> Jacob</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 bg-purple-600 rounded" /> Angie</span>
        </div>
      </div>

      {/* Angle weights */}
      {agents[0]?.weights && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5">
          <h3 className="text-lg font-semibold text-white mb-4">Angle Performance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {Object.entries(agents[0].weights).sort((a: any, b: any) => (b[1]?.reply_rate || 0) - (a[1]?.reply_rate || 0)).slice(0, 12).map(([name, w]: any) => (
              <div key={name} className="flex items-center justify-between bg-[var(--bg-elevated)]/40 rounded-lg px-3 py-2">
                <span className="text-[var(--text-secondary)] text-sm">{name.replace(/_/g, ' ')}</span>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-[var(--text-muted)]">{w.total_sends || 0} sends</span>
                  <span className={`font-mono ${(w.reply_rate || 0) > 0.1 ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
                    {((w.reply_rate || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

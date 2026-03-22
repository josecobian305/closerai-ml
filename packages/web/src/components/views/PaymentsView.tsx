import { useEffect, useState } from 'react';
import { fetchPayments } from '../../api';
import { CreditCard, Clock, Lock } from 'lucide-react';

export function PaymentsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPayments().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-[var(--bg-elevated)] rounded w-40 animate-pulse" />
      {[...Array(3)].map((_, i) => <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5 animate-pulse h-20" />)}
    </div>
  );

  const callLog = data?.callLog || [];

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-white">Payments</h2>

      {/* apiPay section */}
      <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-800/50 rounded-[10px] p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-[10px] bg-[var(--accent)]/30 flex items-center justify-center">
            <Lock size={24} className="text-indigo-300" />
          </div>
          <div>
            <h3 className="text-white font-semibold text-lg">apiPay ACH Ledger</h3>
            <p className="text-indigo-300/70 text-sm">Coming soon</p>
          </div>
        </div>
        <p className="text-[var(--text-muted)] text-sm">Automated ACH collections, merchant payment tracking, and reconciliation — all in one place.</p>
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'ACH Pulls', val: '—' },
            { label: 'Total Collected', val: '—' },
            { label: 'Active Merchants', val: '—' },
          ].map(({ label, val }) => (
            <div key={label} className="bg-black/20 rounded-xl p-3 text-center">
              <p className="text-xs text-[var(--text-muted)]">{label}</p>
              <p className="text-white font-bold">{val}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Call/Funding Activity */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Clock size={18} className="text-[var(--text-muted)]" /> Recent Activity
        </h3>
        {callLog.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard size={36} className="text-[var(--text-subtle)] mx-auto mb-3" />
            <p className="text-[var(--text-muted)] text-sm">No call/funding activity recorded yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {callLog.map((entry: any, i: number) => (
              <div key={i} className="flex items-center justify-between bg-[var(--bg-elevated)]/40 rounded-xl px-4 py-3">
                <div>
                  <p className="text-white text-sm">{entry.business || entry.phone || 'Unknown'}</p>
                  <p className="text-xs text-[var(--text-muted)]">{entry.type || 'call'} · {entry.ts ? new Date(entry.ts).toLocaleString() : ''}</p>
                </div>
                {entry.amount && <span className="text-green-400 font-bold text-sm">${entry.amount.toLocaleString()}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

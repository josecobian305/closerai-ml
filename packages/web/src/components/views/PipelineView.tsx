import { useEffect, useState, useCallback } from 'react';
import { fetchPipelineBoard, advancePipelineStage, fetchLenderMatch, submitOffer } from '../../api';

// ─── Stage Config ─────────────────────────────────────────────────
const STAGE_CONFIG = [
  { key: 'outreach', label: 'Outreach', icon: '📤', color: 'from-slate-600 to-slate-700', badge: 'bg-slate-600', border: 'border-slate-600/40', text: 'text-slate-300' },
  { key: 'replied', label: 'Replied', icon: '💬', color: 'from-blue-600 to-blue-700', badge: 'bg-blue-600', border: 'border-blue-600/40', text: 'text-blue-300' },
  { key: 'interested', label: 'Interested', icon: '🔥', color: 'from-orange-600 to-orange-700', badge: 'bg-orange-600', border: 'border-orange-600/40', text: 'text-orange-300' },
  { key: 'docs_requested', label: 'Docs Requested', icon: '📋', color: 'from-yellow-600 to-yellow-700', badge: 'bg-yellow-600', border: 'border-yellow-600/40', text: 'text-yellow-300' },
  { key: 'hyper_mode', label: 'Hyper Mode', icon: '⚡', color: 'from-purple-600 to-purple-700', badge: 'bg-purple-600', border: 'border-purple-600/40', text: 'text-purple-300' },
  { key: 'pre_underwriting', label: 'Pre-UW', icon: '📝', color: 'from-cyan-600 to-cyan-700', badge: 'bg-cyan-600', border: 'border-cyan-600/40', text: 'text-cyan-300' },
  { key: 'lender_match', label: 'Lender Match', icon: '🎯', color: 'from-indigo-600 to-indigo-700', badge: 'bg-indigo-600', border: 'border-indigo-600/40', text: 'text-indigo-300' },
  { key: 'offer_submitted', label: 'Offer Sent', icon: '📨', color: 'from-emerald-600 to-emerald-700', badge: 'bg-emerald-600', border: 'border-emerald-600/40', text: 'text-emerald-300' },
  { key: 'funded', label: 'Funded', icon: '💰', color: 'from-green-500 to-green-600', badge: 'bg-green-500', border: 'border-green-500/40', text: 'text-green-300' },
];

function getNextStage(current: string): string | null {
  const idx = STAGE_CONFIG.findIndex(s => s.key === current);
  if (idx < 0 || idx >= STAGE_CONFIG.length - 1) return null;
  return STAGE_CONFIG[idx + 1].key;
}

function getNextStageLabel(current: string): string {
  const next = getNextStage(current);
  return STAGE_CONFIG.find(s => s.key === next)?.label || '';
}

function scoreBadgeColor(score: number): string {
  if (score >= 200) return 'bg-green-500/20 text-green-400 border-green-500/30';
  if (score >= 80) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
  if (score >= 40) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
}

// ─── Lender Match Modal ───────────────────────────────────────────
function LenderMatchModal({ merchant, onClose, onSubmitted }: { merchant: any; onClose: () => void; onSubmitted: () => void }) {
  const [loading, setLoading] = useState(true);
  const [lenders, setLenders] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    fetchLenderMatch(merchant.phone)
      .then(data => {
        const matches = data.matches || data.lenders || [];
        setLenders(matches);
        // Pre-select top matches
        const preSelect = new Set<number>();
        matches.forEach((m: any, i: number) => {
          if ((m.score || m.match_score || 0) >= 70) preSelect.add(i);
        });
        setSelected(preSelect);
      })
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, [merchant.phone]);

  const toggle = (idx: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!confirming) { setConfirming(true); return; }
    setSubmitting(true);
    try {
      const selectedLenders = Array.from(selected).map(i => ({
        lender_id: lenders[i].lender_id || lenders[i].id || String(i),
        lender_name: lenders[i].lender_name || lenders[i].name || `Lender ${i + 1}`,
        contact_email: lenders[i].contact_email || lenders[i].email || '',
        contact_name: lenders[i].contact_name || '',
        notes: lenders[i].notes || '',
      }));
      const res = await submitOffer({
        phone: merchant.phone,
        merchant_name: merchant.name,
        business_name: merchant.business || 'Unknown Business',
        lenders: selectedLenders,
        agent: 'Jacob Claude',
      });
      setResult(res);
      onSubmitted();
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">🎯 Lender Match</h3>
              <p className="text-gray-400 text-sm mt-1">{merchant.business || merchant.phone}</p>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">×</button>
          </div>
          {/* Merchant profile */}
          <div className="flex gap-3 mt-4 flex-wrap">
            {merchant.name && <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300">👤 {merchant.name}</span>}
            <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300">📞 {merchant.phone}</span>
            {merchant.score > 0 && <span className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-300">⭐ Score: {merchant.score}</span>}
            {merchant.docs_received && <span className="text-xs px-2 py-1 rounded bg-green-900/50 text-green-400">📄 Docs Received</span>}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-400" />
            </div>
          ) : error && !lenders.length ? (
            <div className="text-red-400 text-center py-10">{error}</div>
          ) : result ? (
            <div className="text-center py-10">
              <div className="text-4xl mb-4">✅</div>
              <p className="text-green-400 font-bold text-lg">Submitted to {result.sent} lenders</p>
              {result.errors?.length > 0 && (
                <p className="text-red-400 text-sm mt-2">{result.errors.length} errors</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {lenders.length === 0 ? (
                <p className="text-gray-500 text-center py-10">No lender matches found. Run the match script with merchant profile data.</p>
              ) : (
                lenders.map((lender: any, idx: number) => {
                  const matchScore = lender.score || lender.match_score || 0;
                  const appType = lender.application_type || 'CHC';
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border cursor-pointer transition-all ${
                        selected.has(idx) ? 'border-indigo-500 bg-indigo-900/20' : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                      }`}
                      onClick={() => toggle(idx)}
                    >
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={selected.has(idx)} onChange={() => toggle(idx)}
                          className="w-4 h-4 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{lender.lender_name || lender.name}</span>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              appType === 'WOTR' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>
                              {appType} APP
                            </span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {lender.products && <span>📦 {Array.isArray(lender.products) ? lender.products.join(', ') : lender.products}</span>}
                            {lender.funding_speed && <span>⚡ {lender.funding_speed}</span>}
                            {lender.funding_range && <span>💰 {lender.funding_range}</span>}
                          </div>
                          {lender.deal_breakers && lender.deal_breakers.length > 0 && (
                            <div className="mt-1">
                              {lender.deal_breakers.map((db: string, di: number) => (
                                <span key={di} className="text-[10px] text-red-400 bg-red-900/30 px-1.5 py-0.5 rounded mr-1">⚠ {db}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex-shrink-0 w-24">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-500">Match</span>
                            <span className={matchScore >= 80 ? 'text-green-400' : matchScore >= 50 ? 'text-yellow-400' : 'text-red-400'}>
                              {matchScore}%
                            </span>
                          </div>
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${matchScore >= 80 ? 'bg-green-500' : matchScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${Math.min(matchScore, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {!result && lenders.length > 0 && (
          <div className="p-6 border-t border-gray-800">
            {confirming ? (
              <div className="space-y-3">
                <p className="text-yellow-400 text-sm text-center">
                  ⚠️ You are about to submit <strong>{merchant.business || 'this merchant'}</strong>'s file to <strong>{selected.size}</strong> lenders.
                  An email with all documents will be sent to each lender. Confirm?
                </p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => setConfirming(false)}
                    className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300 hover:bg-gray-600 text-sm">
                    Cancel
                  </button>
                  <button onClick={handleSubmit} disabled={submitting}
                    className="px-6 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-500 disabled:opacity-50 text-sm">
                    {submitting ? 'Sending...' : '✅ Confirm Submit'}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={selected.size === 0}
                className="w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                📨 Submit to {selected.size} Selected Lender{selected.size !== 1 ? 's' : ''}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Merchant Card ────────────────────────────────────────────────
function MerchantCard({ merchant, stageKey, onAdvance, onLenderMatch }: {
  merchant: any;
  stageKey: string;
  onAdvance: (phone: string, from: string, to: string) => void;
  onLenderMatch: (merchant: any) => void;
}) {
  const nextStage = getNextStage(stageKey);
  const nextLabel = getNextStageLabel(stageKey);

  return (
    <div className="bg-gray-800/80 border border-gray-700/50 rounded-xl p-4 hover:border-gray-600/70 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h4 className="font-bold text-white text-sm truncate">
            {merchant.business || 'Unknown Business'}
          </h4>
          {merchant.name && (
            <p className="text-xs text-gray-400 truncate">{merchant.name}</p>
          )}
          <p className="text-[11px] text-gray-500 font-mono">{merchant.phone}</p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${scoreBadgeColor(merchant.score)}`}>
            {merchant.score}
          </span>
          {merchant.hyper && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse">
              ⚡ HYPER
            </span>
          )}
        </div>
      </div>

      {/* Last reply */}
      {merchant.last_reply_text && (
        <p className="text-xs text-gray-400 italic line-clamp-2 mb-2 bg-gray-900/50 rounded-lg px-2 py-1.5">
          "{merchant.last_reply_text}"
        </p>
      )}

      {/* Stats row */}
      <div className="flex items-center gap-3 text-[11px] text-gray-500 mb-3">
        <span>📤 {merchant.sends}</span>
        <span>💬 {merchant.reply_count}</span>
        <span>🕐 {merchant.last_contact_ago}</span>
        {merchant.docs_received && <span className="text-green-400">📄✓</span>}
      </div>

      {/* Stage-specific content */}
      {stageKey === 'hyper_mode' && merchant.events_summary && (
        <div className="text-[11px] text-purple-300 bg-purple-900/20 rounded-lg px-2 py-1.5 mb-2">
          ⚡ Statement analysis in progress
        </div>
      )}

      {stageKey === 'pre_underwriting' && (
        <div className="flex flex-wrap gap-1 mb-2">
          {['ein', 'ssn', 'dob', 'home_address', 'business_start_date'].map(field => {
            const collected = merchant.fields_collected?.includes(field);
            return (
              <span key={field} className={`text-[10px] px-1.5 py-0.5 rounded ${
                collected ? 'bg-green-900/30 text-green-400' : 'bg-gray-700/50 text-gray-500'
              }`}>
                {collected ? '✓' : '○'} {field.toUpperCase().replace('_', ' ')}
              </span>
            );
          })}
        </div>
      )}

      {stageKey === 'lender_match' && (
        <button
          onClick={(e) => { e.stopPropagation(); onLenderMatch(merchant); }}
          className="w-full py-1.5 rounded-lg bg-indigo-600/30 text-indigo-300 text-xs font-semibold hover:bg-indigo-600/50 transition-all mb-2 border border-indigo-500/30"
        >
          🎯 Run Lender Match
        </button>
      )}

      {stageKey === 'offer_submitted' && merchant.events_summary && (
        <div className="text-[11px] text-emerald-300 bg-emerald-900/20 rounded-lg px-2 py-1.5 mb-2">
          {merchant.events_summary.filter((e: any) => e.type === 'offer_submitted').map((e: any, i: number) => (
            <div key={i}>📨 Submitted {new Date(e.ts).toLocaleDateString()}</div>
          ))}
        </div>
      )}

      {/* Advance button */}
      {nextStage && stageKey !== 'funded' && (
        <button
          onClick={() => onAdvance(merchant.phone, stageKey, nextStage)}
          className="w-full py-1.5 rounded-lg bg-gray-700/50 text-gray-300 text-xs hover:bg-gray-600/50 hover:text-white transition-all flex items-center justify-center gap-1 border border-gray-600/30"
        >
          → {nextLabel}
        </button>
      )}
    </div>
  );
}

// ─── Main PipelineView ────────────────────────────────────────────
export function PipelineView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lenderModalMerchant, setLenderModalMerchant] = useState<any>(null);

  const loadBoard = useCallback(() => {
    setLoading(true);
    fetchPipelineBoard()
      .then(setData)
      .catch(err => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadBoard(); }, [loadBoard]);

  const handleAdvance = async (phone: string, from: string, to: string) => {
    // Optimistic update
    setData((prev: any) => {
      if (!prev?.stages) return prev;
      const newStages = { ...prev.stages };
      const card = newStages[from]?.find((m: any) => m.phone === phone);
      if (card) {
        newStages[from] = newStages[from].filter((m: any) => m.phone !== phone);
        if (!newStages[to]) newStages[to] = [];
        newStages[to] = [{ ...card, stage: to }, ...newStages[to]];
      }
      const newCounts: Record<string, number> = {};
      for (const [k, v] of Object.entries(newStages)) {
        newCounts[k] = (v as any[]).length;
      }
      return { ...prev, stages: newStages, counts: newCounts };
    });

    try {
      await advancePipelineStage(phone, from, to);
    } catch (err) {
      // Revert on failure
      loadBoard();
    }
  };

  if (loading && !data) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 bg-gray-800 rounded w-48 animate-pulse" />
        <div className="flex gap-3 overflow-x-auto pb-4">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="min-w-[260px] h-[500px] bg-gray-900/50 border border-gray-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button onClick={loadBoard} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Retry</button>
        </div>
      </div>
    );
  }

  const stages = data?.stages || {};
  const counts = data?.counts || {};
  const total = data?.total || 0;

  // Active pipeline count (excluding outreach and funded)
  const activePipeline = Object.entries(counts)
    .filter(([k]) => k !== 'outreach' && k !== 'funded')
    .reduce((sum, [_, v]) => sum + (v as number), 0);

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0 px-1">
        <div>
          <h2 className="text-2xl font-bold text-white">Deal Pipeline</h2>
          <p className="text-sm text-gray-500">{activePipeline} active · {counts.funded || 0} funded · {total} total</p>
        </div>
        <button onClick={loadBoard} disabled={loading}
          className="px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-700 text-sm disabled:opacity-50">
          {loading ? '⟳' : '↻'} Refresh
        </button>
      </div>

      {/* Funnel summary bar */}
      <div className="flex rounded-xl overflow-hidden h-8 flex-shrink-0 mx-1">
        {STAGE_CONFIG.map(({ key, badge, label }) => {
          const count = counts[key] || 0;
          const pct = total > 0 ? count / total * 100 : 0;
          if (count === 0) return null;
          return (
            <div key={key} className={`${badge} flex items-center justify-center text-[10px] font-bold text-white relative group`}
              style={{ width: `${Math.max(pct, 3)}%` }}>
              {pct > 5 && count}
              <div className="absolute bottom-full mb-1 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-10">
                {label}: {count}
              </div>
            </div>
          );
        })}
      </div>

      {/* Kanban columns */}
      <div className="flex gap-3 overflow-x-auto pb-4 flex-1 min-h-0 px-1">
        {STAGE_CONFIG.map(({ key, label, icon, border, text }) => {
          const cards = stages[key] || [];
          const count = counts[key] || 0;

          // Collapse outreach column if too many
          const displayCards = key === 'outreach' ? cards.slice(0, 20) : cards;

          return (
            <div key={key} className={`min-w-[280px] max-w-[300px] flex flex-col bg-gray-900/40 border ${border} rounded-2xl flex-shrink-0`}>
              {/* Column header */}
              <div className="p-3 border-b border-gray-800/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-base">{icon}</span>
                  <h3 className={`font-semibold text-sm ${text}`}>{label}</h3>
                </div>
                <span className="text-xs font-bold text-white bg-gray-700 px-2 py-0.5 rounded-full">{count}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
                {displayCards.map((merchant: any) => (
                  <MerchantCard
                    key={merchant.phone}
                    merchant={merchant}
                    stageKey={key}
                    onAdvance={handleAdvance}
                    onLenderMatch={setLenderModalMerchant}
                  />
                ))}
                {key === 'outreach' && cards.length > 20 && (
                  <div className="text-xs text-gray-500 text-center py-2">
                    +{cards.length - 20} more in outreach
                  </div>
                )}
                {cards.length === 0 && (
                  <div className="text-xs text-gray-600 text-center py-8">No merchants</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lender Match Modal */}
      {lenderModalMerchant && (
        <LenderMatchModal
          merchant={lenderModalMerchant}
          onClose={() => setLenderModalMerchant(null)}
          onSubmitted={() => {
            setLenderModalMerchant(null);
            loadBoard();
          }}
        />
      )}
    </div>
  );
}

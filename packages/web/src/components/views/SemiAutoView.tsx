import { useState, useEffect, useCallback } from 'react';
import { Lock, Unlock, Shield, Zap, RefreshCw, ToggleLeft, ToggleRight, Pencil, Check, X } from 'lucide-react';

interface TierStatus {
  name: string;
  enabled: boolean;
  unlocked: boolean;
  unlock_condition: string;
  description?: string;
}

interface TierKpi {
  metric: string;
  threshold: number;
  label: string;
}

interface SemiAutoSettings {
  tier: number;
  unlocked_tiers: number[];
  tier_status: Record<string, TierStatus>;
  tier_kpis: Record<string, TierKpi>;
  metrics: {
    total_replies: number;
    total_sends: number;
    reply_rate: number;
    qualified_leads: number;
    docs_received: number;
    funded_deals: number;
  };
  doc_aliases?: string[];
}

const TIER_ICONS = ['👤', '💬', '📤', '📞', '⚡', '🚀'];
const TIER_COLORS = [
  'from-gray-500 to-gray-600',
  'from-blue-500 to-blue-600',
  'from-green-500 to-green-600',
  'from-yellow-500 to-orange-500',
  'from-purple-500 to-pink-500',
  'from-red-500 to-rose-600',
];

function getMetricValue(tier: number, metrics: SemiAutoSettings['metrics']): number {
  switch (tier) {
    case 1: return metrics.total_replies;
    case 2: return metrics.reply_rate;
    case 3: return metrics.qualified_leads;
    case 4: return metrics.docs_received;
    case 5: return metrics.funded_deals;
    default: return 0;
  }
}

function getProgress(tier: number, metrics: SemiAutoSettings['metrics'], kpis: Record<string, TierKpi>): { current: number; target: number; pct: number } {
  if (tier === 0) return { current: 1, target: 1, pct: 100 };
  const kpi = kpis[String(tier)];
  if (!kpi) return { current: 0, target: 1, pct: 0 };
  const current = getMetricValue(tier, metrics);
  const target = kpi.threshold;
  return { current, target, pct: Math.min(100, (current / target) * 100) };
}

const DASHBOARD_BASE = window.location.hostname === 'agents.chccapitalgroup.com'
  ? '/api'
  : 'http://localhost:18902/api';

export function SemiAutoView() {
  const [settings, setSettings] = useState<SemiAutoSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [editingKpi, setEditingKpi] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [savingKpi, setSavingKpi] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${DASHBOARD_BASE}/semi-auto/settings`);
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error('Failed to load semi-auto settings', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const checkUnlocks = async () => {
    setChecking(true);
    try {
      const res = await fetch(`${DASHBOARD_BASE}/semi-auto/check-unlocks`);
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error('Failed to check unlocks', e);
    } finally {
      setChecking(false);
    }
  };

  const toggleTier = async (tierId: string) => {
    if (!settings) return;
    const ts = { ...settings.tier_status };
    const tier = ts[tierId];
    if (!tier?.unlocked) return;
    ts[tierId] = { ...tier, enabled: !tier.enabled };
    setSettings({ ...settings, tier_status: ts });
    try {
      await fetch(`${DASHBOARD_BASE}/semi-auto/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier_status: { [tierId]: { enabled: !tier.enabled } } }),
      });
    } catch (e) {
      console.error('Failed to toggle tier', e);
      fetchSettings();
    }
  };

  const startEditKpi = (tierId: string) => {
    if (!settings) return;
    const kpi = settings.tier_kpis?.[tierId];
    setEditingKpi(tierId);
    setEditValue(String(kpi?.threshold ?? ''));
  };

  const cancelEditKpi = () => {
    setEditingKpi(null);
    setEditValue('');
  };

  const saveKpi = async () => {
    if (!editingKpi || !settings) return;
    const val = parseFloat(editValue);
    if (isNaN(val) || val <= 0) return;
    setSavingKpi(true);
    try {
      const res = await fetch(`${DASHBOARD_BASE}/semi-auto/kpis`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [editingKpi]: { threshold: val } }),
      });
      const data = await res.json();
      if (data.settings) setSettings(data.settings);
      else await fetchSettings();
      setEditingKpi(null);
      setEditValue('');
    } catch (e) {
      console.error('Failed to save KPI', e);
    } finally {
      setSavingKpi(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return <div className="text-center text-[var(--text-muted)] py-12">Failed to load settings</div>;
  }

  const kpis = settings.tier_kpis || {};
  const currentTierName = settings.tier_status[String(settings.tier)]?.name || 'Unknown';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Shield size={28} className="text-indigo-400" />
            Semi-Auto Control
          </h1>
          <p className="text-[var(--text-muted)] mt-1">
            Stage-by-stage automation unlock system
          </p>
        </div>
        <button
          onClick={checkUnlocks}
          disabled={checking}
          className="btn-primary flex items-center gap-2"
        >
          <RefreshCw size={16} className={checking ? 'animate-spin' : ''} />
          {checking ? 'Checking…' : 'Check Unlock Status'}
        </button>
      </div>

      {/* Current Tier Badge */}
      <div className={`bg-gradient-to-r ${TIER_COLORS[settings.tier] || TIER_COLORS[0]} rounded-xl p-5 text-white`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{TIER_ICONS[settings.tier]}</span>
          <div>
            <div className="text-sm font-medium opacity-80">Current Tier</div>
            <div className="text-xl font-bold">
              Tier {settings.tier} — {currentTierName}
            </div>
          </div>
          <Zap size={24} className="ml-auto opacity-60" />
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Replies', value: settings.metrics.total_replies },
          { label: 'Sends', value: settings.metrics.total_sends.toLocaleString() },
          { label: 'Reply Rate', value: `${settings.metrics.reply_rate}%` },
          { label: 'Qualified', value: settings.metrics.qualified_leads },
          { label: 'Docs Received', value: settings.metrics.docs_received },
          { label: 'Funded', value: settings.metrics.funded_deals },
        ].map((m) => (
          <div key={m.label} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-3 text-center">
            <div className="text-xs text-[var(--text-muted)] mb-1">{m.label}</div>
            <div className="text-lg font-bold text-white">{m.value}</div>
          </div>
        ))}
      </div>

      {/* Tier Cards */}
      <div className="space-y-3">
        {Object.entries(settings.tier_status).map(([id, tier]) => {
          const tierNum = parseInt(id);
          const progress = getProgress(tierNum, settings.metrics, kpis);
          const isActive = tier.unlocked && tier.enabled;
          const kpi = kpis[id];
          const isEditing = editingKpi === id;

          return (
            <div
              key={id}
              className={`bg-[var(--bg-card)] border rounded-xl p-5 transition-all ${
                tier.unlocked
                  ? 'border-[var(--border)] hover:border-indigo-500/40'
                  : 'border-[var(--border)] opacity-60'
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                  tier.unlocked
                    ? `bg-gradient-to-br ${TIER_COLORS[tierNum]} text-white`
                    : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                }`}>
                  {tier.unlocked ? TIER_ICONS[tierNum] : '🔒'}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-white font-semibold">
                      Tier {id} — {tier.name}
                    </h3>
                    {isActive && (
                      <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full font-medium">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[var(--text-muted)] text-sm mt-0.5">
                    {tier.description || tier.unlock_condition}
                  </p>

                  {/* KPI threshold display / edit */}
                  {tierNum > 0 && kpi && (
                    <div className="mt-2 flex items-center gap-2">
                      {tier.unlocked ? (
                        <span className="text-green-400 flex items-center gap-1 text-xs">
                          <Unlock size={12} /> Unlocked — {kpi.label}: {progress.current}/{kpi.threshold}
                        </span>
                      ) : isEditing ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[var(--text-muted)]">{kpi.label} threshold:</span>
                          <input
                            type="number"
                            step={kpi.metric === 'reply_rate_pct' ? '0.1' : '1'}
                            min="0"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveKpi(); if (e.key === 'Escape') cancelEditKpi(); }}
                            className="w-20 bg-[var(--bg-elevated)] border border-indigo-500/50 rounded px-2 py-1 text-xs text-white focus:outline-none"
                            autoFocus
                          />
                          <button onClick={saveKpi} disabled={savingKpi} className="p-1 text-green-400 hover:text-green-300">
                            <Check size={14} />
                          </button>
                          <button onClick={cancelEditKpi} className="p-1 text-[var(--text-muted)] hover:text-white">
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                            <Lock size={12} /> {kpi.label}: {progress.current} / {kpi.threshold}
                          </span>
                          <button
                            onClick={() => startEditKpi(id)}
                            className="p-0.5 text-[var(--text-muted)] hover:text-indigo-400 transition-colors"
                            title="Edit threshold"
                          >
                            <Pencil size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Progress bar for locked tiers */}
                  {!tier.unlocked && tierNum > 0 && (
                    <div className="mt-2 w-full max-w-xs">
                      <div className="h-2 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${TIER_COLORS[tierNum]}`}
                          style={{ width: `${progress.pct}%`, transition: 'width 0.5s ease' }}
                        />
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        {Math.round(progress.pct)}% complete
                      </div>
                    </div>
                  )}
                </div>

                {/* Toggle */}
                <button
                  onClick={() => toggleTier(id)}
                  disabled={!tier.unlocked || tierNum === 0}
                  className={`shrink-0 p-1 rounded-lg transition-colors ${
                    !tier.unlocked || tierNum === 0
                      ? 'opacity-30 cursor-not-allowed'
                      : 'cursor-pointer hover:bg-[var(--bg-elevated)]'
                  }`}
                  title={!tier.unlocked ? 'Locked' : tier.enabled ? 'Disable' : 'Enable'}
                >
                  {tier.enabled ? (
                    <ToggleRight size={32} className="text-green-400" />
                  ) : (
                    <ToggleLeft size={32} className="text-[var(--text-muted)]" />
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

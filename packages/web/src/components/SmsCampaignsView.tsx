import { useEffect, useState } from 'react';
import { TrendingUp, Calendar, MessageSquare, Zap, AlertTriangle } from 'lucide-react';
import { fetchCampaigns, fetchSequenceStats, fetchCadence, fetchCampaignAngles, fetchHyper } from '../api';
import type { CampaignDef, LiveStats, SequenceStats, CadencePhase, CampaignEscalationStep, CampaignAngle, HyperMerchant } from '../api';

type TabType = 'overview' | 'hyper' | 'sequences' | 'angles' | 'cadence';

export function SmsCampaignsView() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [campaigns, setCampaigns] = useState<CampaignDef[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [escalation, setEscalation] = useState<CampaignEscalationStep[]>([]);
  const [sequences, setSequences] = useState<SequenceStats | null>(null);
  const [cadencePhases, setCadencePhases] = useState<CadencePhase[]>([]);
  const [angles, setAngles] = useState<CampaignAngle[]>([]);
  const [hyperMerchants, setHyperMerchants] = useState<HyperMerchant[]>([]);
  const [expandedAngle, setExpandedAngle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [cmp, seq, cad, ang, hyp] = await Promise.all([
          fetchCampaigns(),
          fetchSequenceStats(),
          fetchCadence(),
          fetchCampaignAngles(),
          fetchHyper(),
        ]);
        setCampaigns(cmp.campaigns);
        setLiveStats(cmp.live_stats);
        setEscalation(cmp.escalation_ladder);
        setSequences(seq);
        setCadencePhases(cad.phases);
        setAngles(ang.angles);
        setHyperMerchants(hyp.hyper || []);
      } catch (e) {
        console.error('Failed to load campaigns:', e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const renderHyper = () => (
    <div className="max-w-5xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-yellow-300 flex items-center gap-2">
            <Zap size={22} className="animate-pulse" />
            HYPER MODE — Active Merchants
          </h3>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Merchants who sent bank statements. Agent is reviewing + requesting missing docs.
            Normal sequence is paused until file is complete.
          </p>
        </div>
        <span className="text-3xl font-bold text-yellow-300">{hyperMerchants.length}</span>
      </div>

      {hyperMerchants.length === 0 ? (
        <div className="bg-[var(--bg-card)]/60 border border-[var(--border)] rounded-[10px] p-12 text-center">
          <Zap size={40} className="text-[var(--text-subtle)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)] text-lg font-semibold">No active HYPER merchants</p>
          <p className="text-[var(--text-muted)] text-sm mt-2">
            When a merchant emails bank statements to jclaude@chccapitalgroup.com,<br />
            they'll appear here within 3 minutes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {hyperMerchants.map((m) => {
            const statusColor = m.analysis_status === 'clean'
              ? 'border-green-700/50 bg-green-900/10'
              : m.analysis_status === 'high_risk'
                ? 'border-red-700/50 bg-red-900/10'
                : 'border-yellow-700/50 bg-yellow-900/10';

            const stateLabel: Record<string, string> = {
              docs_received: '📥 Docs In — Reviewing',
              docs_reviewed: '🔍 Reviewed — App Pending',
              app_fields_needed: '📋 Collecting App Fields',
              hyper_active: '⚡ HYPER Active',
              hyper_pending: '⏳ HYPER Pending',
            };

            return (
              <div key={m.phone} className={`border rounded-xl p-4 ${statusColor}`}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-1 bg-yellow-900/60 text-yellow-300 rounded-full font-bold animate-pulse">
                        ⚡ HYPER
                      </span>
                      <h4 className="font-bold text-white text-lg">
                        {m.business || m.name || m.phone}
                      </h4>
                    </div>
                    {m.name && m.business && (
                      <p className="text-sm text-[var(--text-muted)] mt-1">{m.name} · {m.phone}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-[var(--text-muted)]">
                      {m.last_trigger ? new Date(m.last_trigger).toLocaleString('en-US', {
                        month: 'short', day: 'numeric',
                        hour: 'numeric', minute: '2-digit'
                      }) : ''}
                    </div>
                    {m.triggers > 1 && (
                      <div className="text-xs text-yellow-400 mt-1">{m.triggers} emails</div>
                    )}
                  </div>
                </div>

                {/* Current state */}
                <div className="mb-3">
                  <span className="text-sm font-semibold text-white">
                    {stateLabel[m.state || m.status] || '⚡ Active'}
                  </span>
                </div>

                {/* Email subject */}
                {m.email_subject && (
                  <div className="text-xs text-[var(--text-muted)] mb-2">
                    📧 <span className="text-[var(--text-secondary)]">"{m.email_subject}"</span>
                  </div>
                )}

                {/* Notes */}
                {m.notes && (
                  <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-elevated)]/50 rounded p-2 mb-2">
                    {m.notes}
                  </div>
                )}

                {/* Red flags */}
                {m.red_flags && m.red_flags.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-1 mb-1">
                      <AlertTriangle size={12} className="text-red-400" />
                      <span className="text-xs text-red-400 font-semibold">Red Flags</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {m.red_flags.map((f, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-red-900/30 text-red-300 rounded">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Analysis status badge */}
                {m.analysis_status && (
                  <div className="mt-2">
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      m.analysis_status === 'clean'
                        ? 'bg-green-900/40 text-green-300'
                        : m.analysis_status === 'high_risk'
                          ? 'bg-red-900/40 text-red-300'
                          : 'bg-yellow-900/40 text-yellow-300'
                    }`}>
                      {m.analysis_status === 'clean' ? '🟢 Clean' :
                       m.analysis_status === 'high_risk' ? '🔴 High Risk' :
                       '🟡 Needs Attention'}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* How it works */}
      <div className="bg-[var(--bg-card)]/40 border border-[var(--border)] rounded-xl p-4 mt-6">
        <h4 className="font-semibold text-[var(--text-secondary)] mb-2 text-sm">⚡ How HYPER MODE Works</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-[var(--text-muted)]">
          <div className="bg-[var(--bg-elevated)]/50 rounded p-3">
            <div className="font-semibold text-white mb-1">1. Email Arrives</div>
            Bank statements hit jclaude@chccapitalgroup.com from a known merchant.
            Watcher detects within 3 minutes.
          </div>
          <div className="bg-[var(--bg-elevated)]/50 rounded p-3">
            <div className="font-semibold text-white mb-1">2. Claude Reviews</div>
            Textract extracts text → Claude checks NSFs, existing advances, revenue trends,
            missing months, red flags.
          </div>
          <div className="bg-[var(--bg-elevated)]/50 rounded p-3">
            <div className="font-semibold text-white mb-1">3. Agent Acts</div>
            Targeted SMS + voice note + email sent. Normal sequence paused.
            Clones absorb the slack. File gets pushed to completion.
          </div>
        </div>
      </div>
    </div>
  );

  const renderOverview = () => (
    <div className="max-w-5xl space-y-6">
      {/* Live Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-gradient-to-br from-green-900/30 to-green-800/10 border border-green-700/30 rounded-xl p-4">
          <div className="text-xs text-green-400/70 mb-1 font-medium">Active</div>
          <div className="text-3xl font-bold text-green-300">{liveStats?.active ?? '—'}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-900/30 to-amber-800/10 border border-amber-700/30 rounded-xl p-4">
          <div className="text-xs text-amber-400/70 mb-1 font-medium">Cooling</div>
          <div className="text-3xl font-bold text-amber-300">{liveStats?.cooling ?? '—'}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-900/30 to-purple-800/10 border border-purple-700/30 rounded-xl p-4">
          <div className="text-xs text-purple-400/70 mb-1 font-medium">Funded</div>
          <div className="text-3xl font-bold text-purple-300">{liveStats?.funded ?? '—'}</div>
        </div>
        {(liveStats?.hyper ?? 0) > 0 && (
          <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/20 border border-yellow-500/50 rounded-xl p-4 animate-pulse">
            <div className="text-xs text-yellow-300/80 mb-1 font-bold">⚡ HYPER</div>
            <div className="text-3xl font-bold text-yellow-300">{liveStats?.hyper}</div>
          </div>
        )}
        <div className="bg-gradient-to-br from-blue-900/30 to-blue-800/10 border border-blue-700/30 rounded-xl p-4">
          <div className="text-xs text-blue-400/70 mb-1 font-medium">Total</div>
          <div className="text-3xl font-bold text-blue-300">{liveStats?.total_scanned ?? '—'}</div>
        </div>
      </div>

      {/* Agent Breakdown */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-[var(--bg-card)]/60 border border-[var(--border)] rounded-[10px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-green-900/40 flex items-center justify-center text-green-300 font-bold">J</div>
            <span className="font-semibold text-white">Jacob Squad</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Active</span>
              <span className="font-bold text-green-300">{liveStats?.agents?.jacob?.active ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Funded</span>
              <span className="font-bold text-purple-300">{liveStats?.agents?.jacob?.funded ?? 0}</span>
            </div>
          </div>
        </div>

        <div className="bg-[var(--bg-card)]/60 border border-[var(--border)] rounded-[10px] p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-pink-900/40 flex items-center justify-center text-pink-300 font-bold">A</div>
            <span className="font-semibold text-white">Angie Squad</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Active</span>
              <span className="font-bold text-green-300">{liveStats?.agents?.angie?.active ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-[var(--text-muted)]">Funded</span>
              <span className="font-bold text-purple-300">{liveStats?.agents?.angie?.funded ?? 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Campaigns */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white">Active Campaigns</h3>
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-[var(--bg-card)]/60 border border-[var(--border)] rounded-xl p-4 hover:border-[var(--border)] transition">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h4 className="font-semibold text-white">{c.name}</h4>
                  <p className="text-sm text-[var(--text-muted)] mt-1">{c.description}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  c.status === 'active' ? 'bg-green-900/40 text-green-300' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                }`}>
                  {c.status === 'active' ? '● LIVE' : '● PAUSED'}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                <div><span className="text-[var(--text-muted)]">Persona:</span> {c.persona}</div>
                <div><span className="text-[var(--text-muted)]">Goal:</span> {c.goal}</div>
                <div><span className="text-[var(--text-muted)]">Sequence:</span> {c.sequence_days} days</div>
                <div><span className="text-[var(--text-muted)]">Channels:</span> {c.channels.join(' + ')}</div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {c.angles_rotation.map((a) => (
                  <span key={a} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs font-semibold">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSequences = () => (
    <div className="max-w-5xl space-y-6">
      <div>
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={20} /> Active Merchants by Day
        </h3>
        <div className="space-y-2">
          {sequences?.by_day?.map((row) => {
            const maxCount = Math.max(1, ...(sequences.by_day?.map((x) => x.count) ?? [1]));
            const pct = Math.round((row.count / maxCount) * 100);
            const dayColor = row.day <= 3 ? '#ef4444' : row.day <= 7 ? '#f97316' : row.day <= 14 ? '#eab308' : '#22c55e';

            return (
              <div key={row.day} className="flex items-center gap-3">
                <div className="w-16 text-right text-sm font-semibold text-[var(--text-muted)]">Day {row.day}</div>
                <div className="flex-1">
                  <div className="h-8 bg-[var(--bg-elevated)] rounded overflow-hidden flex items-center">
                    <div
                      style={{ width: `${pct}%`, backgroundColor: dayColor }}
                      className="h-full flex items-center justify-center text-white font-bold text-sm transition-all duration-300"
                    >
                      {row.count > 0 ? row.count : ''}
                    </div>
                  </div>
                </div>
                <div className="w-24 text-right text-xs text-[var(--text-muted)]">
                  🔵 {row.agents.jacob} 🩷 {row.agents.angie}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-bold text-white mb-4">Escalation Ladder</h3>
        <div className="space-y-2">
          {escalation.map((step, i) => (
            <div key={i} className="bg-[var(--bg-card)]/60 border border-[var(--border)] rounded-xl p-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Days {step.days}</span>
                <div className="flex flex-wrap gap-1 justify-end">
                  {step.angles.map((a) => (
                    <span key={a} className="px-2 py-1 bg-blue-900/30 text-blue-300 rounded text-xs font-bold">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-sm text-[var(--text-muted)] mt-2">{step.tone}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAngles = () => (
    <div className="max-w-5xl space-y-3">
      <p className="text-sm text-[var(--text-muted)] mb-4">10 message angles, rotated across the 20-day sequence. Click to expand.</p>
      {angles.map((angle) => {
        const isExpanded = expandedAngle === angle.id;
        const toneColors: Record<string, string> = {
          urgent: 'text-red-400',
          warm: 'text-green-400',
          scarcity: 'text-orange-400',
          authority: 'text-blue-400',
          selective: 'text-purple-400',
          logical: 'text-yellow-400',
          direct: 'text-cyan-400',
          aggressive: 'text-red-400',
          final: 'text-red-500',
        };

        return (
          <div
            key={angle.id}
            onClick={() => setExpandedAngle(isExpanded ? null : angle.id)}
            className="bg-[var(--bg-card)]/60 border border-[var(--border)] rounded-xl p-4 cursor-pointer hover:border-[var(--border)] transition"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-900/40 flex items-center justify-center font-bold text-blue-300">
                  {angle.id}
                </div>
                <div>
                  <h4 className="font-semibold text-white">{angle.name}</h4>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs px-2 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded">
                      Days {angle.best_day_range}
                    </span>
                    <span className={`text-xs px-2 py-0.5 bg-[var(--bg-elevated)] ${toneColors[angle.tone] || 'text-[var(--text-muted)]'} rounded`}>
                      {angle.tone}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded">
                      {angle.agent === 'both' ? '🔵🩷' : angle.agent === 'jacob' ? '🔵' : '🩷'}
                    </span>
                  </div>
                </div>
              </div>
              <span className="text-[var(--text-muted)]">{isExpanded ? '▼' : '▶'}</span>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                <div className="bg-[var(--bg-elevated)]/50 rounded-lg p-3 font-mono text-sm text-[var(--text-secondary)]">
                  "{angle.template}"
                </div>
                {angle.industry_variants && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] mb-2 font-semibold">Industry Variants:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(angle.industry_variants).map(([ind, desc]) => (
                        <div key={ind} className="bg-[var(--bg-elevated)]/50 rounded p-2 text-xs">
                          <span className="text-blue-400 font-semibold">{ind}:</span>{' '}
                          <span className="text-[var(--text-secondary)]">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderCadence = () => (
    <div className="max-w-5xl space-y-6">
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          <Calendar size={20} /> Daily Cadence by Phase
        </h3>
        {cadencePhases.map((phase) => (
          <div key={phase.label} className="bg-[var(--bg-card)]/60 border border-[var(--border)] rounded-xl p-4">
            <div className="flex items-start gap-4">
              <div
                style={{ backgroundColor: phase.color }}
                className="w-12 h-12 rounded-lg flex items-center justify-center font-bold text-white text-xl flex-shrink-0"
              >
                {phase.touches}
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white">{phase.label}</h4>
                <p className="text-sm text-[var(--text-muted)] mt-1">
                  {phase.touches} touches/day · 9 AM – 6 PM ET · 30min min gap
                </p>
                <p className="text-sm text-[var(--text-muted)] mt-2">{phase.desc}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl p-4">
        <h4 className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
          <Zap size={18} /> Opt-Out Protocol
        </h4>
        <div className="text-sm text-amber-100/80 space-y-1">
          <p>✓ Any STOP / not interested / remove me → <strong>STOP immediately</strong></p>
          <p>✓ Log as OPT_OUT. No further contact.</p>
          <p>✓ Max <strong>3 unanswered messages</strong> before pause + flag.</p>
          <p>✓ No contact before <strong>8 AM</strong> or after <strong>8 PM</strong> local time.</p>
        </div>
      </div>

      <div className="bg-blue-900/20 border border-blue-700/30 rounded-xl p-4">
        <h4 className="font-semibold text-blue-300 mb-2 flex items-center gap-2">
          <MessageSquare size={18} /> Document Collection Protocol
        </h4>
        <div className="text-sm text-blue-100/80 space-y-2">
          <div>
            <strong>Bank Statements:</strong> Last 4 months — PDF, photos, screenshots
          </div>
          <div>
            <strong>Short Application:</strong> 2-minute form in GHL
          </div>
          <div>
            <strong>MTD Transactions:</strong> Screenshots of all transactions from 1st of month to today → PDF labeled
            "Current Month MTD - [Business Name].pdf"
          </div>
          <div>
            <strong>On receipt:</strong> Combine → single PDF → confirm → "Got it — putting your file together now"
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <h2 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
        <MessageSquare size={28} /> SMS Campaigns
      </h2>

      {loading ? (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5 animate-pulse">
              <div className="h-5 bg-[var(--bg-elevated)] rounded w-32 mb-3" />
              <div className="h-3 bg-[var(--bg-elevated)] rounded w-48" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Tab Bar */}
          <div className="flex gap-1 mb-6 border-b border-[var(--border)] overflow-x-auto">
            {/* HYPER tab — always first, highlighted */}
            <button
              onClick={() => setActiveTab('hyper')}
              className={`px-4 py-3 font-bold transition-colors border-b-2 whitespace-nowrap flex items-center gap-2 ${
                activeTab === 'hyper'
                  ? 'text-yellow-300 border-yellow-400'
                  : 'text-[var(--text-muted)] border-transparent hover:text-yellow-400'
              }`}
            >
              ⚡ HYPER
              {hyperMerchants.length > 0 && (
                <span className="bg-yellow-400 text-black text-xs font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                  {hyperMerchants.length}
                </span>
              )}
            </button>
            {(['overview', 'sequences', 'angles', 'cadence'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-semibold transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab
                    ? 'text-white border-blue-500'
                    : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]'
                }`}
              >
                {tab === 'overview'
                  ? '📊 Overview'
                  : tab === 'sequences'
                    ? '📈 Sequences'
                    : tab === 'angles'
                      ? '💬 Angles A-J'
                      : '⏰ Cadence'}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeTab === 'hyper' && renderHyper()}
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'sequences' && renderSequences()}
          {activeTab === 'angles' && renderAngles()}
          {activeTab === 'cadence' && renderCadence()}
        </>
      )}
    </div>
  );
}

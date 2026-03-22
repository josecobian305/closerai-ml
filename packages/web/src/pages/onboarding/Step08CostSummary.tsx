import { useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

const AI_LABELS: Record<number, string> = { 10: 'Human-First', 30: 'AI-Assisted', 50: 'Co-Pilot', 70: 'AI-Led', 90: 'Full Auto' };

export function Step08CostSummary({ data, onUpdate, onNext }: StepProps) {
  const [confirming, setConfirming] = useState(false);
  const total = data.aiCost + data.iqCost;

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await fetch('/api/v1/onboarding/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: data.businessName, industry: data.industry, state: data.state,
          phone: data.phone, email: data.email, password: data.password,
          monthlyRevenue: data.monthlyRevenue, dealSize: data.dealSize, agentCount: data.agentCount,
          aiLevel: data.aiLevel, botCount: data.botCount, iqLevel: data.iqLevel, iqModel: data.iqModel,
          pipelineStages: data.pipelineStages, assets: data.assets,
        }),
      });
      if (res.ok) { const r = await res.json(); onUpdate({ sessionId: r.sessionId || '' }); }
    } catch (e) { console.error('Provision error:', e); }
    onNext();
  };

  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-8 text-center">Your Plan Summary</h2>

      <div className="w-full max-w-md bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-8 mb-6">
        <div className="grid grid-cols-2 gap-6 mb-7">
          <div>
            <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-1">AI Involvement</p>
            <p className="text-xl font-bold text-white">{data.aiLevel}% — {AI_LABELS[data.aiLevel] || 'Custom'}</p>
            <p className="text-xs text-[var(--text-subtle)]">{data.botCount} bot{data.botCount > 1 ? 's' : ''}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-1">Intelligence</p>
            <p className="text-xl font-bold text-white">{data.iqLevel.charAt(0).toUpperCase() + data.iqLevel.slice(1)}</p>
            <p className="text-xs text-[var(--text-subtle)]">{data.iqModel}</p>
          </div>
        </div>

        <div className="border-t border-[var(--border)] pt-5">
          <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3">Monthly Estimate</p>
          <div className="flex justify-between mb-2">
            <span className="text-sm text-[var(--text-muted)]">Base plan ({data.aiLevel}%)</span>
            <span className="text-sm font-semibold text-white">${data.aiCost}/mo</span>
          </div>
          <div className="flex justify-between mb-4">
            <span className="text-sm text-[var(--text-muted)]">Intelligence upgrade</span>
            <span className="text-sm font-semibold text-white">{data.iqCost > 0 ? `+$${data.iqCost}/mo` : 'Included'}</span>
          </div>
          <div className="border-t border-[var(--border)] pt-3 flex justify-between">
            <span className="text-lg font-bold text-white">Total</span>
            <span className="text-2xl font-extrabold text-indigo-400">~${total}/mo</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-md bg-[var(--bg-elevated)]/40 border border-[var(--border)] rounded-xl p-5 mb-8">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle size={14} className="text-amber-400" />
          <span className="text-xs font-semibold text-amber-400">IMPORTANT</span>
        </div>
        <ul className="text-xs text-[var(--text-muted)] leading-relaxed space-y-1.5 pl-4 list-disc">
          <li>Costs vary based on usage (messages sent, calls made, deals processed)</li>
          <li>Your first <strong className="text-emerald-400">14 days are free</strong> — no charge until you go live</li>
          <li>You can change your AI level at any time from Settings</li>
          <li>Model costs are pass-through — we don't mark them up</li>
        </ul>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent">
        <button onClick={handleConfirm} disabled={confirming}
          className="w-full max-w-lg mx-auto bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20">
          <Shield size={18} />
          {confirming ? 'Creating your account…' : 'Confirm & Create Account →'}
        </button>
      </div>
    </div>
  );
}

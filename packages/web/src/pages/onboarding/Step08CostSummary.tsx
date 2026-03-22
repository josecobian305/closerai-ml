import { useState } from 'react';
import { AlertTriangle, Shield } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

export function Step08CostSummary({ data, onUpdate, onNext }: StepProps) {
  const [confirming, setConfirming] = useState(false);
  const total = data.aiCost + data.iqCost;

  const aiLabels: Record<number, string> = {
    10: 'Human-First', 30: 'AI-Assisted', 50: 'Co-Pilot', 70: 'AI-Led', 90: 'Full Auto',
  };

  const handleConfirm = async () => {
    setConfirming(true);
    // Call provision API
    try {
      const res = await fetch('/api/v1/onboarding/provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: data.businessName,
          industry: data.industry,
          state: data.state,
          phone: data.phone,
          email: data.email,
          password: data.password,
          monthlyRevenue: data.monthlyRevenue,
          dealSize: data.dealSize,
          agentCount: data.agentCount,
          aiLevel: data.aiLevel,
          botCount: data.botCount,
          iqLevel: data.iqLevel,
          iqModel: data.iqModel,
          pipelineStages: data.pipelineStages,
          assets: data.assets,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        onUpdate({ sessionId: result.sessionId || '' });
      }
    } catch (e) {
      console.error('Provision error:', e);
    }
    onNext();
  };

  return (
    <div style={{ maxWidth: 540, margin: '0 auto' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#635bff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>
        📋 YOUR PLAN SUMMARY
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16, padding: 32, marginBottom: 24,
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>AI Involvement</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{data.aiLevel}% — {aiLabels[data.aiLevel] || 'Custom'}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{data.botCount} bot{data.botCount > 1 ? 's' : ''}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>Intelligence</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>{data.iqLevel.charAt(0).toUpperCase() + data.iqLevel.slice(1)}</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{data.iqModel}</div>
          </div>
        </div>

        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 20 }}>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 }}>Monthly Estimate</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>Base plan ({data.aiLevel}%)</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>${data.aiCost}/mo</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <span style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)' }}>Intelligence upgrade</span>
            <span style={{ fontSize: 15, fontWeight: 600 }}>{data.iqCost > 0 ? `+$${data.iqCost}/mo` : 'Included'}</span>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 12, display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Total</span>
            <span style={{ fontSize: 24, fontWeight: 800, color: '#635bff' }}>~${total}/mo</span>
          </div>
        </div>
      </div>

      {/* Disclaimers */}
      <div style={{
        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
        borderRadius: 12, padding: 20, marginBottom: 32,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b' }}>IMPORTANT</span>
        </div>
        <ul style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
          <li>Costs vary based on usage (messages sent, calls made, deals processed)</li>
          <li>Your first <strong style={{ color: '#22c55e' }}>14 days are free</strong> — no charge until you go live</li>
          <li>You can change your AI level at any time from Settings</li>
          <li>Model costs are pass-through from Anthropic/AWS — we don't mark them up</li>
        </ul>
      </div>

      <button onClick={handleConfirm} disabled={confirming} style={{
        width: '100%',
        background: confirming ? 'rgba(99,91,255,0.5)' : 'linear-gradient(135deg, #635bff, #4f46e5)',
        color: '#fff', border: 'none', padding: 18, borderRadius: 12, fontSize: 17, fontWeight: 700,
        cursor: confirming ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        boxShadow: '0 4px 20px rgba(99,91,255,0.3)',
      }}>
        <Shield size={18} />
        {confirming ? 'Creating your account…' : 'Confirm & Create Account →'}
      </button>
    </div>
  );
}

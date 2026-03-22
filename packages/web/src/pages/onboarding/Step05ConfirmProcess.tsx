import { GitBranch, Lock } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

export function Step05ConfirmProcess({ data, onNext }: StepProps) {
  const stages = data.pipelineStages.length > 0
    ? data.pipelineStages
    : ['Lead In', 'First Contact', 'Follow Up', 'Docs Requested', 'Underwriting', 'Offer Sent', 'Close'];

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#635bff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
        ✅ CONFIRM YOUR PROCESS
      </div>
      <div style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 12, letterSpacing: -0.5 }}>
        This is your sales process
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 40, lineHeight: 1.6 }}>
        {stages.length} stages · {data.demoRuns.filter(r => r.status === 'passed').length} successful demo runs · AI will follow this exact flow
      </div>

      {/* Pipeline visualization */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: 0, alignItems: 'center',
        marginBottom: 48, maxWidth: 400, margin: '0 auto 48px',
      }}>
        {stages.map((stage, i) => (
          <div key={stage} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 14, width: '100%',
              padding: '14px 20px', background: 'rgba(99,91,255,0.08)',
              border: '1px solid rgba(99,91,255,0.2)', borderRadius: 10,
            }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', background: '#635bff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, flexShrink: 0,
              }}>
                {i + 1}
              </div>
              <span style={{ fontSize: 15, fontWeight: 600 }}>{stage}</span>
            </div>
            {i < stages.length - 1 && (
              <div style={{ width: 2, height: 20, background: 'rgba(99,91,255,0.2)' }} />
            )}
          </div>
        ))}
      </div>

      <button onClick={onNext} style={{
        background: 'linear-gradient(135deg, #635bff, #4f46e5)', color: '#fff', border: 'none',
        padding: '18px 48px', borderRadius: 12, fontSize: 17, fontWeight: 700,
        cursor: 'pointer', fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 10,
        boxShadow: '0 4px 20px rgba(99,91,255,0.3)',
      }}>
        <Lock size={18} /> This is how I sell → Lock It In
      </button>
    </div>
  );
}

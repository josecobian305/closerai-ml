import { useState } from 'react';
import { Check, Zap, Brain, Sparkles } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

interface IqOption {
  key: 'low' | 'medium' | 'genius';
  label: string;
  model: string;
  icon: React.ReactNode;
  speed: string;
  desc: string;
  cost: number;
  costLabel: string;
}

const OPTIONS: IqOption[] = [
  { key: 'low', label: 'LOW', model: 'Haiku', icon: <Zap size={28} />, speed: 'Fast', desc: 'Basic objections, quick replies. Great for simple follow-ups.', cost: 0, costLabel: '+$0/mo' },
  { key: 'medium', label: 'MEDIUM', model: 'Sonnet', icon: <Brain size={28} />, speed: 'Balanced', desc: 'Handles most cases — nuanced replies, multi-step reasoning.', cost: 100, costLabel: '+$100/mo' },
  { key: 'genius', label: 'GENIUS', model: 'Opus', icon: <Sparkles size={28} />, speed: 'Smartest', desc: 'Complex reasoning, strategy, and creative problem-solving.', cost: 400, costLabel: '+$400/mo' },
];

export function Step07IqLevel({ data, onUpdate, onNext }: StepProps) {
  const [selected, setSelected] = useState<'low' | 'medium' | 'genius'>(data.iqLevel);

  const handleSelect = (opt: IqOption) => {
    setSelected(opt.key);
    onUpdate({ iqLevel: opt.key, iqModel: opt.model, iqCost: opt.cost });
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#635bff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
        🧠 SELECT YOUR INTELLIGENCE
      </div>
      <div style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 12, letterSpacing: -0.5 }}>
        How smart should your AI be?
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 36, lineHeight: 1.6 }}>
        Higher intelligence = better at complex conversations. You can upgrade anytime.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 36 }}>
        {OPTIONS.map(opt => {
          const isSelected = selected === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => handleSelect(opt)}
              style={{
                position: 'relative',
                background: isSelected ? 'rgba(99,91,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${isSelected ? '#635bff' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 14, padding: 24, cursor: 'pointer',
                transition: 'all 0.15s', fontFamily: 'inherit', color: '#fff',
                textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
              }}
            >
              {isSelected && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  width: 22, height: 22, borderRadius: '50%', background: '#635bff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Check size={14} />
                </div>
              )}
              <div style={{ color: isSelected ? '#635bff' : 'rgba(255,255,255,0.4)' }}>
                {opt.icon}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 1 }}>{opt.label}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#635bff' }}>{opt.model}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>{opt.desc}</div>
              <div style={{
                fontSize: 15, fontWeight: 700, marginTop: 4,
                color: opt.cost === 0 ? '#22c55e' : '#fff',
              }}>
                {opt.costLabel}
              </div>
            </button>
          );
        })}
      </div>

      <button onClick={onNext} style={{
        background: '#635bff', color: '#fff', border: 'none',
        padding: '14px 28px', borderRadius: 8, fontSize: 15, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
        Continue →
      </button>
    </div>
  );
}

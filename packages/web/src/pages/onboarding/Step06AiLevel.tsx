import { useState } from 'react';
import { Check } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

interface AiOption {
  pct: number;
  label: string;
  desc: string;
  bots: number;
  cost: number;
}

const OPTIONS: AiOption[] = [
  { pct: 10, label: 'Human-First', desc: 'AI only routes leads + schedules', bots: 1, cost: 49 },
  { pct: 30, label: 'AI-Assisted', desc: 'AI drafts, human approves before send', bots: 2, cost: 149 },
  { pct: 50, label: 'Co-Pilot', desc: 'AI handles follow-ups, human closes', bots: 3, cost: 299 },
  { pct: 70, label: 'AI-Led', desc: 'AI runs full cycle, human reviews only', bots: 4, cost: 499 },
  { pct: 90, label: 'Full Auto', desc: 'AI handles everything, you just fund', bots: 5, cost: 799 },
];

export function Step06AiLevel({ data, onUpdate, onNext }: StepProps) {
  const [selected, setSelected] = useState<number>(data.aiLevel);

  const handleSelect = (opt: AiOption) => {
    setSelected(opt.pct);
    onUpdate({ aiLevel: opt.pct, botCount: opt.bots, aiCost: opt.cost });
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#635bff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
        🤖 AI INTERVENTION LEVEL
      </div>
      <div style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 12, letterSpacing: -0.5 }}>
        How much should AI handle?
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 32, lineHeight: 1.6 }}>
        Choose how involved AI is in your sales process. You can always change this later.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
        {OPTIONS.map(opt => {
          const isSelected = selected === opt.pct;
          return (
            <button
              key={opt.pct}
              onClick={() => handleSelect(opt)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', textAlign: 'left',
                background: isSelected ? 'rgba(99,91,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: `2px solid ${isSelected ? '#635bff' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 12, padding: '18px 22px', cursor: 'pointer',
                transition: 'all 0.15s', fontFamily: 'inherit', color: '#fff',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 10,
                  background: isSelected ? '#635bff' : 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18, fontWeight: 800, flexShrink: 0,
                  transition: 'background 0.15s',
                }}>
                  {opt.pct}%
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 2 }}>{opt.label}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{opt.desc}</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>
                    {opt.bots} bot{opt.bots > 1 ? 's' : ''} · ~${opt.cost}/mo
                  </div>
                </div>
              </div>
              {isSelected && (
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', background: '#635bff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <Check size={16} />
                </div>
              )}
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

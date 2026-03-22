import { useState } from 'react';
import { Check } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

const OPTIONS = [
  { pct: 10, label: 'Human-First', desc: 'AI only routes leads + schedules', bots: 1, cost: 49 },
  { pct: 30, label: 'AI-Assisted', desc: 'AI drafts, human approves before send', bots: 2, cost: 149 },
  { pct: 50, label: 'Co-Pilot', desc: 'AI handles follow-ups, human closes', bots: 3, cost: 299 },
  { pct: 70, label: 'AI-Led', desc: 'AI runs full cycle, human reviews only', bots: 4, cost: 499 },
  { pct: 90, label: 'Full Auto', desc: 'AI handles everything, you just fund', bots: 5, cost: 799 },
];

export function Step06AiLevel({ data, onUpdate, onNext }: StepProps) {
  const [selected, setSelected] = useState<number>(data.aiLevel);

  const handleSelect = (opt: typeof OPTIONS[0]) => {
    setSelected(opt.pct);
    onUpdate({ aiLevel: opt.pct, botCount: opt.bots, aiCost: opt.cost });
  };

  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">How much should AI handle?</h2>
      <p className="text-[var(--text-muted)] mb-8 text-center">Choose your AI involvement level. You can always change this later.</p>

      <div className="w-full max-w-lg space-y-3 mb-8">
        {OPTIONS.map(opt => {
          const isSelected = selected === opt.pct;
          return (
            <button key={opt.pct} onClick={() => handleSelect(opt)}
              className={`w-full flex items-center justify-between text-left px-5 py-4 rounded-xl border-2 transition-all duration-150 ${
                isSelected
                  ? 'bg-[var(--accent)]/12 border-indigo-500'
                  : 'bg-[var(--bg-elevated)]/40 border-[var(--border)] hover:border-[var(--border-active)]'
              }`}>
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-extrabold shrink-0 transition-colors ${
                  isSelected ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                }`}>
                  {opt.pct}%
                </div>
                <div>
                  <div className="text-base font-semibold text-white">{opt.label}</div>
                  <div className="text-xs text-[var(--text-muted)]">{opt.desc}</div>
                  <div className="text-[10px] text-[var(--text-subtle)] mt-1">{opt.bots} bot{opt.bots > 1 ? 's' : ''} · ~${opt.cost}/mo</div>
                </div>
              </div>
              {isSelected && (
                <div className="w-7 h-7 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
                  <Check size={16} className="text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent">
        <button onClick={onNext}
          className="w-full max-w-lg mx-auto bg-[var(--accent)] hover:opacity-90 text-white font-semibold py-4 rounded-xl transition-all block">
          Continue →
        </button>
      </div>
    </div>
  );
}

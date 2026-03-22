import { useState } from 'react';
import { Check, Zap, Brain, Sparkles } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

const OPTIONS = [
  { key: 'low' as const, label: 'LOW', model: 'Haiku', Icon: Zap, desc: 'Basic objections, quick replies. Great for simple follow-ups.', cost: 0, costLabel: '+$0/mo' },
  { key: 'medium' as const, label: 'MEDIUM', model: 'Sonnet', Icon: Brain, desc: 'Handles most cases — nuanced replies, multi-step reasoning.', cost: 100, costLabel: '+$100/mo' },
  { key: 'genius' as const, label: 'GENIUS', model: 'Opus', Icon: Sparkles, desc: 'Complex reasoning, strategy, and creative problem-solving.', cost: 400, costLabel: '+$400/mo' },
];

export function Step07IqLevel({ data, onUpdate, onNext }: StepProps) {
  const [selected, setSelected] = useState(data.iqLevel);

  const handleSelect = (opt: typeof OPTIONS[0]) => {
    setSelected(opt.key);
    onUpdate({ iqLevel: opt.key, iqModel: opt.model, iqCost: opt.cost });
  };

  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">How smart should your AI be?</h2>
      <p className="text-[var(--text-muted)] mb-8 text-center">Higher intelligence = better at complex conversations. Upgrade anytime.</p>

      <div className="w-full max-w-2xl grid grid-cols-3 gap-4 mb-8">
        {OPTIONS.map(opt => {
          const isSelected = selected === opt.key;
          return (
            <button key={opt.key} onClick={() => handleSelect(opt)}
              className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-150 text-center ${
                isSelected
                  ? 'bg-[var(--accent)]/12 border-indigo-500'
                  : 'bg-[var(--bg-elevated)]/40 border-[var(--border)] hover:border-[var(--border-active)]'
              }`}>
              {isSelected && (
                <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center">
                  <Check size={12} className="text-white" />
                </div>
              )}
              <opt.Icon size={28} className={isSelected ? 'text-indigo-400' : 'text-[var(--text-subtle)]'} />
              <div className="text-lg font-extrabold tracking-wide text-white">{opt.label}</div>
              <div className="text-sm font-semibold text-indigo-400">{opt.model}</div>
              <div className="text-xs text-[var(--text-muted)] leading-relaxed">{opt.desc}</div>
              <div className={`text-base font-bold mt-1 ${opt.cost === 0 ? 'text-emerald-400' : 'text-white'}`}>{opt.costLabel}</div>
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

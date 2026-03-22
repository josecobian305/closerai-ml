import { Lock } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

export function Step05ConfirmProcess({ data, onNext }: StepProps) {
  const stages = data.pipelineStages.length > 0
    ? data.pipelineStages
    : ['Lead In', 'First Contact', 'Follow Up', 'Docs Requested', 'Underwriting', 'Offer Sent', 'Close'];

  return (
    <div className="flex flex-col items-center h-full px-6 pt-8 text-center">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2">This is your sales process</h2>
      <p className="text-[var(--text-muted)] mb-10">
        {stages.length} stages · {data.demoRuns.filter(r => r.status === 'passed').length} successful demo runs · AI will follow this exact flow
      </p>

      <div className="flex flex-col items-center gap-0 mb-12 max-w-sm w-full">
        {stages.map((stage, i) => (
          <div key={stage} className="flex flex-col items-center w-full">
            <div className="flex items-center gap-3 w-full px-5 py-3.5 bg-[var(--accent)]/10 border border-indigo-500/20 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-sm font-bold text-white shrink-0">
                {i + 1}
              </div>
              <span className="text-sm font-semibold text-white">{stage}</span>
            </div>
            {i < stages.length - 1 && <div className="w-0.5 h-4 bg-indigo-500/20" />}
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="group flex items-center gap-2 bg-[var(--accent)] hover:opacity-90 text-white text-lg font-bold px-10 py-4 rounded-xl transition-all duration-200 shadow-lg shadow-indigo-600/20"
      >
        <Lock size={18} /> This is how I sell → Lock It In
      </button>
    </div>
  );
}

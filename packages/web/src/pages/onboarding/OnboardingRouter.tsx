import { useState, useCallback } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Step01BusinessProfile } from './Step01BusinessProfile';
import { Step02TrainingAssets } from './Step02TrainingAssets';
import { Step03SalesProcess } from './Step03SalesProcess';
import { Step04DemoRuns } from './Step04DemoRuns';
import { Step05ConfirmProcess } from './Step05ConfirmProcess';
import { Step06AiLevel } from './Step06AiLevel';
import { Step07IqLevel } from './Step07IqLevel';
import { Step08CostSummary } from './Step08CostSummary';
import { Step09Complete } from './Step09Complete';

export interface OnboardingData {
  businessName: string;
  industry: string;
  state: string;
  phone: string;
  email: string;
  password: string;
  monthlyRevenue: string;
  dealSize: string;
  agentCount: number;
  assets: UploadedAsset[];
  pipelineStages: string[];
  processSummary: string;
  demoRuns: DemoRun[];
  aiLevel: number;
  botCount: number;
  aiCost: number;
  iqLevel: 'low' | 'medium' | 'genius';
  iqModel: string;
  iqCost: number;
  sessionId: string;
}

export interface UploadedAsset {
  id: string;
  name: string;
  type: string;
  tag: string;
  size: number;
}

export interface DemoRun {
  id: number;
  customerName: string;
  status: 'pending' | 'running' | 'passed' | 'failed';
  stages: { name: string; done: boolean }[];
}

const TOTAL_STEPS = 9;

const INITIAL_DATA: OnboardingData = {
  businessName: '', industry: '', state: '', phone: '', email: '', password: '',
  monthlyRevenue: '', dealSize: '', agentCount: 1,
  assets: [],
  pipelineStages: [], processSummary: '',
  demoRuns: [],
  aiLevel: 50, botCount: 3, aiCost: 299,
  iqLevel: 'medium', iqModel: 'Sonnet', iqCost: 100,
  sessionId: '',
};

export interface StepProps {
  data: OnboardingData;
  onUpdate: (patch: Partial<OnboardingData>) => void;
  onNext: () => void;
  onBack: () => void;
}

export function OnboardingRouter({ onComplete }: { onComplete?: () => void }) {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);

  const update = useCallback((patch: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...patch }));
  }, []);

  const goTo = useCallback((nextStep: number, dir: 'forward' | 'back') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    setTimeout(() => {
      setStep(nextStep);
      setIsAnimating(false);
    }, 300);
  }, [isAnimating]);

  const goNext = useCallback(() => {
    if (step >= TOTAL_STEPS) { onComplete?.(); return; }
    goTo(step + 1, 'forward');
  }, [step, onComplete, goTo]);

  const goBack = useCallback(() => {
    if (step <= 1) return;
    goTo(step - 1, 'back');
  }, [step, goTo]);

  const pct = Math.round((step / TOTAL_STEPS) * 100);

  const stepProps: StepProps = { data, onUpdate: update, onNext: goNext, onBack: goBack };

  const slideClass = isAnimating
    ? direction === 'forward' ? 'opacity-0 -translate-x-8' : 'opacity-0 translate-x-8'
    : 'opacity-100 translate-x-0';

  const renderStep = () => {
    switch (step) {
      case 1: return <Step01BusinessProfile {...stepProps} />;
      case 2: return <Step02TrainingAssets {...stepProps} />;
      case 3: return <Step03SalesProcess {...stepProps} />;
      case 4: return <Step04DemoRuns {...stepProps} />;
      case 5: return <Step05ConfirmProcess {...stepProps} />;
      case 6: return <Step06AiLevel {...stepProps} />;
      case 7: return <Step07IqLevel {...stepProps} />;
      case 8: return <Step08CostSummary {...stepProps} />;
      case 9: return <Step09Complete {...stepProps} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-base)] flex flex-col">
      {/* Progress bar */}
      {step > 0 && step < TOTAL_STEPS && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-[var(--bg-elevated)]">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      {/* Step counter */}
      {step > 0 && step < TOTAL_STEPS && (
        <div className="fixed top-4 right-4 z-50 text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-card)]/80 px-3 py-1.5 rounded-full backdrop-blur">
          {step} / {TOTAL_STEPS}
        </div>
      )}

      {/* Back button */}
      {step > 1 && step < TOTAL_STEPS && (
        <button
          onClick={goBack}
          className="fixed top-3 left-4 z-50 flex items-center gap-1 text-sm text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--bg-elevated)]"
        >
          <ChevronLeft size={18} />
          Back
        </button>
      )}

      {/* Main content */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${slideClass} ${step === TOTAL_STEPS ? '' : 'pb-24'}`}>
        {renderStep()}
      </div>
    </div>
  );
}

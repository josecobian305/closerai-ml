import { useState, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Step01BusinessProfile } from './Step01BusinessProfile';
import { Step02TrainingAssets } from './Step02TrainingAssets';
import { Step03SalesProcess } from './Step03SalesProcess';
import { Step04DemoRuns } from './Step04DemoRuns';
import { Step05ConfirmProcess } from './Step05ConfirmProcess';
import { Step06AiLevel } from './Step06AiLevel';
import { Step07IqLevel } from './Step07IqLevel';
import { Step08CostSummary } from './Step08CostSummary';
import { Step09Complete } from './Step09Complete';

// ─── Shared onboarding data shape ────────────────────────────────────────────

export interface OnboardingData {
  // Step 1 — Business Profile
  businessName: string;
  industry: string;
  state: string;
  phone: string;
  email: string;
  password: string;
  monthlyRevenue: string;
  dealSize: string;
  agentCount: number;
  // Step 2 — Training Assets
  assets: UploadedAsset[];
  // Step 3 — Sales Process
  pipelineStages: string[];
  processSummary: string;
  // Step 4 — Demo Runs
  demoRuns: DemoRun[];
  // Step 6 — AI Level
  aiLevel: number; // 10 | 30 | 50 | 70 | 90
  botCount: number;
  aiCost: number;
  // Step 7 — IQ Level
  iqLevel: 'low' | 'medium' | 'genius';
  iqModel: string;
  iqCost: number;
  // Session
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
  const [transitioning, setTransitioning] = useState(false);

  const update = useCallback((patch: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...patch }));
  }, []);

  const goNext = useCallback(() => {
    if (step >= TOTAL_STEPS) { onComplete?.(); return; }
    setTransitioning(true);
    setTimeout(() => { setStep(s => s + 1); setTransitioning(false); }, 350);
  }, [step, onComplete]);

  const goBack = useCallback(() => {
    if (step <= 1) return;
    setTransitioning(true);
    setTimeout(() => { setStep(s => s - 1); setTransitioning(false); }, 350);
  }, [step]);

  const pct = (step / TOTAL_STEPS) * 100;

  const stepProps: StepProps = { data, onUpdate: update, onNext: goNext, onBack: goBack };

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
    <div style={{ position: 'fixed', inset: 0, background: '#0d0d14', overflow: 'hidden', fontFamily: "'Inter', system-ui, sans-serif", color: '#fff' }}>
      {/* Progress bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, height: 3, zIndex: 100,
        width: `${pct}%`, background: 'linear-gradient(90deg, #635bff, #4f46e5)',
        transition: 'width 0.4s ease',
      }} />

      {/* Top bar */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, padding: '20px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 50,
      }}>
        <div style={{
          fontSize: 18, fontWeight: 800, letterSpacing: -0.5,
          background: 'linear-gradient(135deg, #635bff, #4f46e5)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          CloserAI
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
          Step {step} of {TOTAL_STEPS}
        </div>
      </div>

      {/* Back button */}
      {step > 1 && step < 9 && (
        <button
          onClick={goBack}
          style={{
            position: 'fixed', top: 20, left: 100, zIndex: 51,
            background: 'none', border: 'none', color: 'rgba(255,255,255,0.45)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 13,
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>
      )}

      {/* Step content */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '80px 32px 40px',
        opacity: transitioning ? 0 : 1,
        transform: transitioning ? 'translateY(40px)' : 'translateY(0)',
        transition: 'all 0.35s cubic-bezier(0.22,1,0.36,1)',
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 720 }}>
          {renderStep()}
        </div>
      </div>
    </div>
  );
}

import { useState, useRef } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Step01Welcome } from './register/Step01Welcome';
import { Step02Business } from './register/Step02Business';
import { Step03Selling } from './register/Step03Selling';
import { Step04Contact } from './register/Step04Contact';
import { Step05Agent } from './register/Step05Agent';
import { Step06Tone } from './register/Step06Tone';
import { Step07LeadSource } from './register/Step07LeadSource';
import { Step08LeadAge } from './register/Step08LeadAge';
import { Step09Documents } from './register/Step09Documents';
import { Step10Phone } from './register/Step10Phone';
import { Step11Layout } from './register/Step11Layout';
import { Step12Capabilities } from './register/Step12Capabilities';
import { Step13Complete } from './register/Step13Complete';

export interface RegistrationData {
  // Step 2
  businessName: string;
  industry: string;
  // Step 3
  pitch: string;
  // Step 4
  yourName: string;
  email: string;
  phone: string;
  password: string;
  // Step 5
  agentName: string;
  agentTitle: string;
  agentEmail: string;
  // Step 6
  tone: string;
  // Step 7
  leadSources: string[];
  // Step 8
  leadAge: string;
  // Step 9
  documents: string[];
  // Step 10
  areaCode: string;
  portExisting: boolean;
  existingNumber: string;
  // Step 11
  layout: string;
  // Step 12
  sms: boolean;
  email_cap: boolean;
  voiceNotes: boolean;
  callBridge: boolean;
  autoReply: boolean;
  docCollection: boolean;
  courtSearch: boolean;
  notifications: boolean;
}

const INITIAL_DATA: RegistrationData = {
  businessName: '',
  industry: '',
  pitch: '',
  yourName: '',
  email: '',
  phone: '',
  password: '',
  agentName: '',
  agentTitle: 'Head of Sales',
  agentEmail: '',
  tone: 'professional',
  leadSources: [],
  leadAge: '0-48h',
  documents: ['bank3', 'dl'],
  areaCode: '',
  portExisting: false,
  existingNumber: '',
  layout: 'overview_first',
  sms: true,
  email_cap: true,
  voiceNotes: false,
  callBridge: false,
  autoReply: true,
  docCollection: true,
  courtSearch: true,
  notifications: true,
};

const TOTAL_STEPS = 13;
// Step 1 is welcome (no progress bar shown), steps 2-13 show progress
const PROGRESS_STEPS = 12;

export function Register() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<RegistrationData>(INITIAL_DATA);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [isAnimating, setIsAnimating] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  const update = (partial: Partial<RegistrationData>) => {
    setData((prev) => ({ ...prev, ...partial }));
  };

  const goTo = (nextStep: number, dir: 'forward' | 'back') => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection(dir);
    setTimeout(() => {
      setStep(nextStep);
      setIsAnimating(false);
    }, 300);
  };

  const next = () => {
    if (step < TOTAL_STEPS) goTo(step + 1, 'forward');
  };

  const back = () => {
    if (step > 1) goTo(step - 1, 'back');
  };

  const handleLaunch = async () => {
    setSubmitLoading(true);
    try {
      const payload = {
        ...data,
        capabilities: {
          sms: data.sms,
          email: data.email_cap,
          voiceNotes: data.voiceNotes,
          callBridge: data.callBridge,
          autoReply: data.autoReply,
          docCollection: data.docCollection,
          courtSearch: data.courtSearch,
          notifications: data.notifications,
        },
      };
      const res = await fetch('/app/api/v1/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.token) {
        localStorage.setItem('auth_token', json.token);
        localStorage.setItem('user_preferences', JSON.stringify({
          layout: data.layout,
          dashboardWidgets: ['stats', 'pipeline', 'recentActivity'],
          widgetOrder: ['contacts', 'stats', 'agents'],
          filters: { default: 'all', custom: [] },
          agentCapabilities: {
            sms: data.sms,
            email: data.email_cap,
            voiceNotes: data.voiceNotes,
            callBridge: data.callBridge,
            autoReply: data.autoReply,
            docCollection: data.docCollection,
            courtSearch: data.courtSearch,
            notifications: data.notifications,
          },
          theme: 'dark',
          notificationPrefs: {
            smsReply: data.notifications,
            docReceived: data.notifications,
            dealUpdate: data.notifications,
          },
        }));
        window.location.href = json.redirectUrl || '/app/';
      }
    } catch (err) {
      console.error('Registration failed:', err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const canGoNext = () => {
    switch (step) {
      case 2: return data.businessName.trim().length > 0 && data.industry.length > 0;
      case 3: return data.pitch.trim().length > 0;
      case 4: return data.yourName.trim() && data.email.trim() && data.phone.trim() && data.password.length >= 8;
      case 5: return data.agentName.trim().length > 0;
      case 6: return data.tone.length > 0;
      case 7: return data.leadSources.length > 0;
      default: return true;
    }
  };

  const progressPercent = step <= 1 ? 0 : Math.round(((step - 1) / PROGRESS_STEPS) * 100);

  const slideClass = isAnimating
    ? direction === 'forward'
      ? 'opacity-0 -translate-x-8'
      : 'opacity-0 translate-x-8'
    : 'opacity-100 translate-x-0';

  const renderStep = () => {
    switch (step) {
      case 1:
        return <Step01Welcome onNext={next} />;
      case 2:
        return (
          <Step02Business
            data={{ businessName: data.businessName, industry: data.industry }}
            onChange={update}
          />
        );
      case 3:
        return <Step03Selling data={{ pitch: data.pitch }} onChange={update} />;
      case 4:
        return (
          <Step04Contact
            data={{ yourName: data.yourName, email: data.email, phone: data.phone, password: data.password }}
            onChange={update}
          />
        );
      case 5:
        return (
          <Step05Agent
            data={{ agentName: data.agentName, agentTitle: data.agentTitle, agentEmail: data.agentEmail }}
            onChange={update}
          />
        );
      case 6:
        return <Step06Tone data={{ tone: data.tone }} onChange={update} />;
      case 7:
        return <Step07LeadSource data={{ leadSources: data.leadSources }} onChange={update} />;
      case 8:
        return <Step08LeadAge data={{ leadAge: data.leadAge }} onChange={update} />;
      case 9:
        return <Step09Documents data={{ documents: data.documents }} onChange={update} />;
      case 10:
        return (
          <Step10Phone
            data={{ areaCode: data.areaCode, portExisting: data.portExisting, existingNumber: data.existingNumber }}
            onChange={update}
          />
        );
      case 11:
        return <Step11Layout data={{ layout: data.layout }} onChange={update} />;
      case 12:
        return (
          <Step12Capabilities
            data={{
              sms: data.sms,
              email: data.email_cap,
              voiceNotes: data.voiceNotes,
              callBridge: data.callBridge,
              autoReply: data.autoReply,
              docCollection: data.docCollection,
              courtSearch: data.courtSearch,
              notifications: data.notifications,
            }}
            onChange={(partial) => {
              // map email key from capabilities object to email_cap
              const mapped: Partial<RegistrationData> = { ...partial };
              if ('email' in partial) {
                (mapped as any).email_cap = partial.email;
                delete (mapped as any).email;
              }
              update(mapped);
            }}
          />
        );
      case 13:
        return <Step13Complete agentName={data.agentName} onLaunch={handleLaunch} loading={submitLoading} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* Progress bar */}
      {step > 1 && step < TOTAL_STEPS && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Step counter */}
      {step > 1 && step < TOTAL_STEPS && (
        <div className="fixed top-4 right-4 z-50 text-xs font-medium text-gray-500 bg-gray-900/80 px-3 py-1.5 rounded-full backdrop-blur">
          {step - 1} / {PROGRESS_STEPS}
        </div>
      )}

      {/* Back button */}
      {step > 1 && step < TOTAL_STEPS && (
        <button
          onClick={back}
          className="fixed top-3 left-4 z-50 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-gray-800"
        >
          <ChevronLeft size={18} />
          Back
        </button>
      )}

      {/* Main content */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ease-in-out ${slideClass} ${
          step === 13 ? '' : 'pb-24'
        }`}
      >
        {renderStep()}
      </div>

      {/* Next button (steps 2-12 only) */}
      {step > 1 && step < TOTAL_STEPS && (
        <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent">
          <button
            onClick={next}
            disabled={!canGoNext()}
            className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base py-4 rounded-xl transition-all duration-200 block"
          >
            {step === 12 ? 'Finish Setup' : 'Continue →'}
          </button>
        </div>
      )}
    </div>
  );
}

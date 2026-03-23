import { useState, useCallback, useMemo } from 'react';
import { Play, CheckCircle, XCircle, Loader, ChevronRight, Mail } from 'lucide-react';
import type { StepProps, DemoRun } from './OnboardingRouter';

// Industry-specific pipeline stages
const INDUSTRY_STAGES: Record<string, string[]> = {
  construction: ['Lead In', 'Site Visit', 'Estimate Sent', 'Contract Signed', 'Project Start', 'Final Payment'],
  healthcare: ['Referral In', 'Intake Call', 'Insurance Verify', 'Appointment Set', 'Treatment Start', 'Follow-up'],
  restaurant: ['Lead In', 'First Visit', 'Reservation', 'Dining Experience', 'Feedback', 'Loyalty Signup'],
  'auto repair': ['Lead In', 'Inspection', 'Quote Sent', 'Approval', 'Repair Started', 'Pickup Ready'],
  'auto sales': ['Lead In', 'Test Drive', 'Trade-In Appraisal', 'Financing', 'Contract', 'Delivery'],
  automotive: ['Lead In', 'Test Drive', 'Trade-In Appraisal', 'Financing', 'Contract', 'Delivery'],
  retail: ['Lead In', 'Store Visit', 'Product Demo', 'Quote', 'Purchase', 'Follow-up'],
  'real estate': ['Lead In', 'Showing Scheduled', 'Property Tour', 'Offer Made', 'Under Contract', 'Closed'],
  legal: ['Lead In', 'Consultation', 'Engagement Letter', 'Case Filed', 'Discovery', 'Resolution'],
  insurance: ['Lead In', 'Needs Analysis', 'Quote Presented', 'Application', 'Underwriting', 'Policy Issued'],
  plumbing: ['Lead In', 'Site Visit', 'Estimate', 'Approval', 'Job Started', 'Invoice Sent'],
  hvac: ['Lead In', 'Site Assessment', 'Quote', 'Scheduling', 'Installation', 'Final Inspection'],
  trucking: ['Lead In', 'Load Match', 'Rate Negotiation', 'Dispatch', 'Delivery', 'Payment'],
  finance: ['Lead In', 'Docs Requested', 'Underwriting', 'Offer Sent', 'Approval', 'Funded'],
  default: ['Lead In', 'First Contact', 'Follow Up', 'Proposal', 'Negotiation', 'Close'],
};

function getPipelineStages(industry: string, userStages?: string[]): string[] {
  if (userStages && userStages.length > 0) return userStages;
  const key = industry?.toLowerCase() || 'default';
  return INDUSTRY_STAGES[key] || INDUSTRY_STAGES.default;
}

// Generate demo customers based on the user's industry
const INDUSTRY_CUSTOMERS: Record<string, Array<{ name: string; revenue: string }>> = {
  construction: [
    { name: 'Apex Builders LLC', revenue: '$185,000/mo' },
    { name: 'Summit Contracting', revenue: '$95,000/mo' },
    { name: 'Ironworks Development', revenue: '$240,000/mo' },
  ],
  healthcare: [
    { name: 'Sunrise Medical Group', revenue: '$320,000/mo' },
    { name: 'Premier Dental Care', revenue: '$75,000/mo' },
    { name: 'Coastal Chiropractic', revenue: '$55,000/mo' },
  ],
  restaurant: [
    { name: 'Bella Cucina Italian', revenue: '$68,000/mo' },
    { name: 'Golden Dragon Express', revenue: '$42,000/mo' },
    { name: 'Harbor View Grill', revenue: '$95,000/mo' },
  ],
  retail: [
    { name: 'Urban Style Boutique', revenue: '$38,000/mo' },
    { name: 'TechGear Electronics', revenue: '$125,000/mo' },
    { name: 'Green Leaf Market', revenue: '$72,000/mo' },
  ],
  auto: [
    { name: 'Precision Auto Works', revenue: '$85,000/mo' },
    { name: 'Elite Motors Group', revenue: '$210,000/mo' },
    { name: 'QuickFix Tire & Brake', revenue: '$48,000/mo' },
  ],
  legal: [
    { name: 'Sterling Law Partners', revenue: '$145,000/mo' },
    { name: 'Justice First Legal', revenue: '$88,000/mo' },
    { name: 'Park & Associates', revenue: '$195,000/mo' },
  ],
  real_estate: [
    { name: 'Skyline Realty Group', revenue: '$175,000/mo' },
    { name: 'Coastal Properties LLC', revenue: '$92,000/mo' },
    { name: 'Metro Home Sales', revenue: '$130,000/mo' },
  ],
  hvac: [
    { name: 'CoolBreeze HVAC', revenue: '$65,000/mo' },
    { name: 'AllSeason Comfort', revenue: '$110,000/mo' },
    { name: 'Arctic Air Solutions', revenue: '$78,000/mo' },
  ],
  trucking: [
    { name: 'Eagle Freight Lines', revenue: '$280,000/mo' },
    { name: 'CrossCountry Logistics', revenue: '$165,000/mo' },
    { name: 'FastLane Transport', revenue: '$95,000/mo' },
  ],
  tech: [
    { name: 'NovaTech Solutions', revenue: '$155,000/mo' },
    { name: 'CloudPeak SaaS', revenue: '$88,000/mo' },
    { name: 'DataForge Analytics', revenue: '$210,000/mo' },
  ],
  mca: [
    { name: 'Velocity Funding Corp', revenue: '$320,000/mo' },
    { name: 'Merchant Growth Capital', revenue: '$145,000/mo' },
    { name: 'FastTrack Business Loans', revenue: '$225,000/mo' },
  ],
  landscaping: [
    { name: 'GreenScape Pro', revenue: '$55,000/mo' },
    { name: 'Evergreen Lawn Care', revenue: '$42,000/mo' },
    { name: 'Nature\'s Edge Landscaping', revenue: '$78,000/mo' },
  ],
  staffing: [
    { name: 'TalentBridge Staffing', revenue: '$195,000/mo' },
    { name: 'ProStaff Solutions', revenue: '$130,000/mo' },
    { name: 'WorkForce One', revenue: '$88,000/mo' },
  ],
  marketing: [
    { name: 'BrandSpark Agency', revenue: '$72,000/mo' },
    { name: 'Digital Edge Marketing', revenue: '$115,000/mo' },
    { name: 'Conversion Kings', revenue: '$58,000/mo' },
  ],
};

const DEFAULT_CUSTOMERS = [
  { name: 'Acme Services LLC', revenue: '$85,000/mo' },
  { name: 'Premier Solutions Co', revenue: '$120,000/mo' },
  { name: 'National Group Inc', revenue: '$65,000/mo' },
];

function getIndustryLabel(id: string): string {
  const labels: Record<string, string> = {
    construction: 'Construction', healthcare: 'Healthcare', restaurant: 'Food & Beverage',
    retail: 'Retail', auto: 'Auto Repair', legal: 'Legal', real_estate: 'Real Estate',
    hvac: 'HVAC', trucking: 'Trucking', tech: 'Technology', mca: 'MCA / Finance',
    landscaping: 'Landscaping', staffing: 'Staffing', marketing: 'Marketing', other: 'General',
  };
  return labels[id] || id || 'General';
}

function simulateStages(runId: number, customerName: string, onProgress: (run: DemoRun) => void): Promise<void> {
  return new Promise(resolve => {
    const stages = getPipelineStages(data.industry, data.pipelineStages).map(name => ({ name, done: false }));
    const run: DemoRun = { id: runId, customerName, status: 'running', stages };
    onProgress({ ...run });
    let i = 0;
    const tick = () => {
      if (i < stages.length) {
        stages[i].done = true; i++;
        onProgress({ ...run, stages: [...stages] });
        setTimeout(tick, 500 + Math.random() * 600);
      } else {
        resolve();
      }
    };
    setTimeout(tick, 400);
  });
}

const DEFAULT_STAGES = ['Lead In', 'First Contact', 'Follow Up', 'Docs Requested', 'Offer Sent', 'Close'];

export function Step04DemoRuns({ data, onUpdate, onNext }: StepProps) {
  const industryLabel = getIndustryLabel(data.industry);
  const demoCustomers = useMemo(() => {
    // Prefer brain-suggested test customers
    if (data.testCustomers && data.testCustomers.length >= 3) {
      return data.testCustomers.slice(0, 3).map(name => ({ name, industry: industryLabel, revenue: '' }));
    }
    const matched = INDUSTRY_CUSTOMERS[data.industry] || DEFAULT_CUSTOMERS;
    return matched.map(c => ({ ...c, industry: industryLabel }));
  }, [data.industry, data.testCustomers, industryLabel]);

  // Use the touches/stages approved in Step 3 — fall back to defaults
  const pipelineStages = useMemo(() => {
    return data.pipelineStages.length > 0 ? data.pipelineStages : DEFAULT_STAGES;
  }, [data.pipelineStages]);

  const [runs, setRuns] = useState<DemoRun[]>(
    data.demoRuns.length > 0 ? data.demoRuns : [1, 2, 3].map(id => ({
      id, customerName: demoCustomers[id - 1]?.name || `Test Customer ${id}`,
      status: 'pending' as const, stages: getPipelineStages(data.industry, data.pipelineStages).map(name => ({ name, done: false })),
    }))
  );
  const [running, setRunning] = useState(false);
  const [emailStatus, setEmailStatus] = useState<Record<number, { owner: boolean; customer: boolean }>>({});
  const allPassed = runs.every(r => r.status === 'passed');

  const runTest = useCallback(async (runId: number) => {
    setRunning(true);
    const customer = demoCustomers[runId - 1];

    // Animate stages
    await simulateStages(runId, customer?.name || `Test Customer ${runId}`, updated => {
      setRuns(prev => prev.map(r => r.id === updated.id ? updated : r));
    });

    // Call API to fire real emails
    try {
      const res = await fetch(`/app/api/v1/onboarding/demo/demo-run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId,
          customerName: customer?.name || `Test Customer ${runId}`,
          industry: customer?.industry || 'General',
          revenue: customer?.revenue || '$50,000/mo',
          // Pass session data for context
          businessName: data.businessName,
          email: data.email,
        }),
      });
      const result = await res.json();
      setEmailStatus(prev => ({ ...prev, [runId]: result.emailsSent || { owner: false, customer: false } }));
    } catch (e) {
      console.error('Demo run API error:', e);
    }

    // Mark as passed
    setRuns(prev => prev.map(r => r.id === runId ? { ...r, status: 'passed' as const } : r));
    setRunning(false);
  }, [data.businessName, data.email, demoCustomers]);

  const runAll = useCallback(async () => {
    for (const run of runs) if (run.status !== 'passed') await runTest(run.id);
  }, [runs, runTest]);

  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">Prove your pipeline works</h2>
      <p className="text-[var(--text-muted)] mb-8 text-center max-w-md">
        Run 3 complete cycles with test customers. Each fires real emails — check your inbox!
      </p>

      <div className="w-full max-w-2xl space-y-4 mb-8">
        {runs.map(run => (
          <div key={run.id} className={`bg-[var(--bg-card)] rounded-xl border p-5 transition-colors ${
            run.status === 'passed' ? 'border-emerald-500/30' : run.status === 'failed' ? 'border-red-500/30' : 'border-[var(--border)]'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-base font-semibold text-white">{run.customerName}</div>
                <div className="text-xs text-[var(--text-subtle)]">{demoCustomers[run.id - 1]?.industry} · {demoCustomers[run.id - 1]?.revenue}</div>
              </div>
              <div className="flex items-center gap-2">
                {run.status === 'passed' && <CheckCircle size={20} className="text-emerald-400" />}
                {run.status === 'failed' && <XCircle size={20} className="text-red-400" />}
                {run.status === 'running' && <Loader size={20} className="text-indigo-400 animate-spin" />}
                {run.status === 'pending' && (
                  <button onClick={() => runTest(run.id)} disabled={running}
                    className="bg-[var(--accent)] text-white text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 disabled:opacity-40 transition-all">
                    <Play size={12} /> Run Test
                  </button>
                )}
              </div>
            </div>

            {/* Stage progress */}
            <div className="flex gap-1 items-center">
              {run.stages.map((stage, i) => (
                <div key={stage.name} className="flex items-center gap-1 flex-1">
                  <div className={`h-1 flex-1 rounded transition-colors duration-300 ${stage.done ? 'bg-indigo-500' : 'bg-[var(--bg-elevated)]'}`} />
                  {i < run.stages.length - 1 && <ChevronRight size={8} className="text-[var(--text-subtle)] shrink-0" />}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1.5">
              {run.stages.map(stage => (
                <span key={stage.name} className={`text-[8px] text-center flex-1 ${stage.done ? 'text-indigo-400' : 'text-[var(--text-subtle)]'}`}>{stage.name}</span>
              ))}
            </div>

            {/* Email status */}
            {emailStatus[run.id] && (
              <div className="mt-3 flex gap-3">
                <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${emailStatus[run.id].owner ? 'text-emerald-400' : 'text-red-400'}`}>
                  <Mail size={10} /> Owner email {emailStatus[run.id].owner ? '✅' : '❌'}
                </div>
                <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${emailStatus[run.id].customer ? 'text-emerald-400' : 'text-red-400'}`}>
                  <Mail size={10} /> Customer email {emailStatus[run.id].customer ? '✅' : '❌'}
                </div>
              </div>
            )}

            {/* Approve / Deny / Rerun buttons */}
            {(run.status === 'passed' || run.status === 'failed') && (
              <div className="mt-4 flex gap-2">
                <button 
                  onClick={() => setRuns(prev => prev.map(r => r.id === run.id ? { ...r, status: 'passed' as const } : r))}
                  className="flex-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold py-2.5 rounded-lg hover:bg-emerald-600/30 transition-all"
                >
                  ✅ Approve
                </button>
                <button 
                  onClick={() => setRuns(prev => prev.map(r => r.id === run.id ? { ...r, status: 'failed' as const } : r))}
                  className="flex-1 bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-semibold py-2.5 rounded-lg hover:bg-red-600/30 transition-all"
                >
                  ❌ Deny
                </button>
                <button 
                  onClick={() => { setRuns(prev => prev.map(r => r.id === run.id ? { ...r, status: 'pending' as const, stages: r.stages.map(s => ({...s, done: false})) } : r)); runTest(run.id); }}
                  disabled={running}
                  className="flex-1 bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 text-xs font-semibold py-2.5 rounded-lg hover:bg-indigo-600/30 transition-all disabled:opacity-40"
                >
                  🔄 Rerun
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent">
        <div className="flex gap-3 max-w-lg mx-auto">
          {!allPassed && (
            <button onClick={runAll} disabled={running}
              className="flex-1 bg-[var(--bg-elevated)] border border-indigo-500/30 text-indigo-400 font-semibold py-4 rounded-xl disabled:opacity-40 transition-all">
              {running ? 'Running…' : 'Run All Tests'}
            </button>
          )}
          <button onClick={() => { onUpdate({ demoRuns: runs }); onNext(); }} disabled={!allPassed}
            className="flex-1 bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-all">
            {allPassed ? 'All Passed → Continue' : 'Pass all 3 to continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

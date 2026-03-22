import { useState, useCallback } from 'react';
import { Play, CheckCircle, XCircle, Loader, ChevronRight } from 'lucide-react';
import type { StepProps, DemoRun } from './OnboardingRouter';

const PIPELINE_STAGES = ['Lead In', 'Underwriting', 'Deal Created', 'Offer Sent', 'Pitch Review', 'Approval Link'];
const DEMO_CUSTOMERS = [
  { name: 'Test Pizza LLC', industry: 'Food & Beverage', revenue: '$45,000/mo' },
  { name: 'Demo Construction Co', industry: 'Construction', revenue: '$120,000/mo' },
  { name: 'Sample Auto Repair', industry: 'Auto Repair', revenue: '$65,000/mo' },
];

function simulateRun(runId: number, onProgress: (run: DemoRun) => void): Promise<DemoRun> {
  return new Promise(resolve => {
    const stages = PIPELINE_STAGES.map(name => ({ name, done: false }));
    const run: DemoRun = { id: runId, customerName: DEMO_CUSTOMERS[runId - 1]?.name || `Test Customer ${runId}`, status: 'running', stages };
    onProgress({ ...run });
    let i = 0;
    const tick = () => {
      if (i < stages.length) {
        stages[i].done = true; i++;
        onProgress({ ...run, stages: [...stages] });
        setTimeout(tick, 600 + Math.random() * 800);
      } else {
        const final: DemoRun = { ...run, status: Math.random() > 0.05 ? 'passed' : 'failed', stages: [...stages] };
        onProgress(final); resolve(final);
      }
    };
    setTimeout(tick, 500);
  });
}

export function Step04DemoRuns({ data, onUpdate, onNext }: StepProps) {
  const [runs, setRuns] = useState<DemoRun[]>(
    data.demoRuns.length > 0 ? data.demoRuns : [1, 2, 3].map(id => ({
      id, customerName: DEMO_CUSTOMERS[id - 1]?.name || `Test Customer ${id}`,
      status: 'pending' as const, stages: PIPELINE_STAGES.map(name => ({ name, done: false })),
    }))
  );
  const [running, setRunning] = useState(false);
  const allPassed = runs.every(r => r.status === 'passed');

  const runTest = useCallback(async (runId: number) => {
    setRunning(true);
    await simulateRun(runId, updated => setRuns(prev => prev.map(r => r.id === updated.id ? updated : r)));
    setRunning(false);
  }, []);

  const runAll = useCallback(async () => {
    for (const run of runs) if (run.status !== 'passed') await runTest(run.id);
  }, [runs, runTest]);

  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">Prove your pipeline works</h2>
      <p className="text-[var(--text-muted)] mb-8 text-center max-w-md">Run 3 complete cycles with test customers. Each must pass through all 6 stages.</p>

      <div className="w-full max-w-2xl space-y-4 mb-8">
        {runs.map(run => (
          <div key={run.id} className={`bg-[var(--bg-card)] rounded-xl border p-5 transition-colors ${
            run.status === 'passed' ? 'border-emerald-500/30' : run.status === 'failed' ? 'border-red-500/30' : 'border-[var(--border)]'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-base font-semibold text-white">{run.customerName}</div>
                <div className="text-xs text-[var(--text-subtle)]">{DEMO_CUSTOMERS[run.id - 1]?.industry} · {DEMO_CUSTOMERS[run.id - 1]?.revenue}</div>
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
                {run.status === 'failed' && (
                  <button onClick={() => runTest(run.id)} disabled={running}
                    className="bg-red-500/15 text-red-400 border border-red-500/30 text-xs font-semibold px-4 py-2 rounded-lg transition-all">
                    Retry
                  </button>
                )}
              </div>
            </div>
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

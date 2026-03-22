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
        stages[i].done = true;
        i++;
        onProgress({ ...run, stages: [...stages] });
        setTimeout(tick, 600 + Math.random() * 800);
      } else {
        const passed = Math.random() > 0.05; // 95% pass rate for demo
        const final: DemoRun = { ...run, status: passed ? 'passed' : 'failed', stages: [...stages] };
        onProgress(final);
        resolve(final);
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
    await simulateRun(runId, updated => {
      setRuns(prev => prev.map(r => r.id === updated.id ? updated : r));
    });
    setRunning(false);
  }, []);

  const runAll = useCallback(async () => {
    for (const run of runs) {
      if (run.status !== 'passed') {
        await runTest(run.id);
      }
    }
  }, [runs, runTest]);

  const handleContinue = () => {
    onUpdate({ demoRuns: runs });
    onNext();
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#635bff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
        🧪 RUN 3 DEMO TESTS
      </div>
      <div style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 12, letterSpacing: -0.5 }}>
        Prove your pipeline works
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 32, lineHeight: 1.6 }}>
        Run 3 complete cycles with test customers. Each must pass through all 6 stages before you can go live.
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
        {runs.map(run => (
          <div key={run.id} style={{
            background: 'rgba(255,255,255,0.04)',
            border: `1px solid ${run.status === 'passed' ? 'rgba(34,197,94,0.3)' : run.status === 'failed' ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: 12, padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{run.customerName}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>
                  {DEMO_CUSTOMERS[run.id - 1]?.industry} · {DEMO_CUSTOMERS[run.id - 1]?.revenue}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {run.status === 'passed' && <CheckCircle size={20} style={{ color: '#22c55e' }} />}
                {run.status === 'failed' && <XCircle size={20} style={{ color: '#ef4444' }} />}
                {run.status === 'running' && <Loader size={20} className="spin" style={{ color: '#635bff' }} />}
                {run.status === 'pending' && (
                  <button
                    onClick={() => runTest(run.id)}
                    disabled={running}
                    style={{
                      background: '#635bff', color: '#fff', border: 'none', borderRadius: 6,
                      padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: running ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                      opacity: running ? 0.5 : 1,
                    }}
                  >
                    <Play size={14} /> Run Test
                  </button>
                )}
                {run.status === 'failed' && (
                  <button
                    onClick={() => runTest(run.id)}
                    disabled={running}
                    style={{
                      background: 'rgba(239,68,68,0.15)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600,
                      cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    Retry
                  </button>
                )}
              </div>
            </div>

            {/* Stage progress */}
            <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
              {run.stages.map((stage, i) => (
                <div key={stage.name} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                  <div style={{
                    height: 4, flex: 1, borderRadius: 2,
                    background: stage.done ? '#635bff' : 'rgba(255,255,255,0.08)',
                    transition: 'background 0.3s',
                  }} />
                  {i < run.stages.length - 1 && <ChevronRight size={10} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
              {run.stages.map(stage => (
                <div key={stage.name} style={{ fontSize: 9, color: stage.done ? '#635bff' : 'rgba(255,255,255,0.25)', textAlign: 'center', flex: 1 }}>
                  {stage.name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        {!allPassed && (
          <button onClick={runAll} disabled={running} style={{
            background: 'rgba(99,91,255,0.15)', color: '#635bff', border: '1px solid rgba(99,91,255,0.3)',
            padding: '14px 28px', borderRadius: 8, fontSize: 15, fontWeight: 600,
            cursor: running ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>
            {running ? 'Running…' : 'Run All Tests'}
          </button>
        )}
        <button onClick={handleContinue} disabled={!allPassed} style={{
          background: allPassed ? '#635bff' : 'rgba(255,255,255,0.06)',
          color: allPassed ? '#fff' : 'rgba(255,255,255,0.3)',
          border: 'none', padding: '14px 28px', borderRadius: 8, fontSize: 15, fontWeight: 600,
          cursor: allPassed ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
        }}>
          {allPassed ? 'All Tests Passed → Continue' : 'Pass all 3 tests to continue'}
        </button>
      </div>

      <style>{`.spin { animation: spin 1s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

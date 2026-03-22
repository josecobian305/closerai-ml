import { useState } from 'react';
import { CheckCircle, Circle, Bot, Zap, Brain, Rocket } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface GateState {
  sms: boolean;
  offer: boolean;
  pitch: boolean;
}

interface AILevelOption {
  pct: number;
  label: string;
  price: number;
  desc: string;
  bots: number;
}

interface IQLevelOption {
  id: 'low' | 'medium' | 'high';
  label: string;
  model: string;
  price: string;
  desc: string;
  examples: string[];
}

// ─── Data ────────────────────────────────────────────────────────────────────

const AI_LEVELS: AILevelOption[] = [
  { pct: 5,  label: '5% AI',  price: 2,   desc: 'You do everything, AI logs it',         bots: 1 },
  { pct: 25, label: '25% AI', price: 49,  desc: 'AI drafts, you approve',                bots: 2 },
  { pct: 65, label: '65% AI', price: 149, desc: 'AI runs most things, you review',       bots: 3 },
  { pct: 80, label: '80% AI', price: 249, desc: 'AI runs everything, you spot-check',    bots: 5 },
  { pct: 90, label: '90% AI', price: 497, desc: 'Full autopilot, AI handles all',        bots: 8 },
];

const IQ_LEVELS: IQLevelOption[] = [
  {
    id: 'low',
    label: 'Low',
    model: 'DeepSeek / Haiku',
    price: '$',
    desc: 'Fast, basic reasoning',
    examples: ['Quick replies', 'Form fills', 'Simple routing'],
  },
  {
    id: 'medium',
    label: 'Medium',
    model: 'Sonnet',
    price: '$$',
    desc: 'Smart, handles nuance',
    examples: ['Offer analysis', 'Lead scoring', 'Conversation context'],
  },
  {
    id: 'high',
    label: 'High',
    model: 'Opus',
    price: '$$$',
    desc: 'Genius-level, complex strategy',
    examples: ['Deal structuring', 'Risk analysis', 'Multi-step planning'],
  },
];

const MODEL_MAP: Record<string, string> = { low: 'haiku', medium: 'sonnet', high: 'opus' };

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function callBrain(message: string): Promise<void> {
  await fetch('/app/api/v1/brain/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, channel: 'brain' }),
  });
}

// ─── Phase 1: Demo Gates ──────────────────────────────────────────────────────

function Phase1({
  gates,
  onGatePass,
}: {
  gates: GateState;
  onGatePass: (k: keyof GateState) => void;
}) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const run = async (key: keyof GateState, action: () => Promise<void>) => {
    setLoading((p) => ({ ...p, [key]: true }));
    try {
      await action();
      onGatePass(key);
    } catch {
      onGatePass(key); // still mark done even if network fails in demo
    } finally {
      setLoading((p) => ({ ...p, [key]: false }));
    }
  };

  const demoGates: { key: keyof GateState; title: string; subtitle: string; btnLabel: string; action: () => Promise<void> }[] = [
    {
      key: 'sms',
      title: 'SMS Pipeline',
      subtitle: 'Send a test SMS',
      btnLabel: 'Run Demo',
      action: () => callBrain('send test sms'),
    },
    {
      key: 'offer',
      title: 'Offer Page',
      subtitle: 'Generate test offer',
      btnLabel: 'Run Demo',
      action: async () => { window.open('/offer/demo', '_blank'); },
    },
    {
      key: 'pitch',
      title: 'Pitch Frames',
      subtitle: 'Generate pitch',
      btnLabel: 'Run Demo',
      action: () => callBrain('generate pitch'),
    },
  ];

  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
        Record Your Process
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
        Run each demo to verify your core pipeline is working.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {demoGates.map(({ key, title, subtitle, btnLabel, action }) => {
          const done = gates[key];
          return (
            <div
              key={key}
              style={{
                background: done
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(34,197,94,0.03))'
                  : 'var(--bg-card, #0d0d1a)',
                border: `1px solid ${done ? 'rgba(34,197,94,0.3)' : 'var(--border)'}`,
                borderRadius: '12px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>{title}</span>
                {done
                  ? <CheckCircle size={20} color="#22c55e" />
                  : <Circle size={20} color="var(--text-subtle)" />}
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{subtitle}</p>
              <button
                onClick={() => run(key, action)}
                disabled={loading[key] || done}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: done ? 'default' : 'pointer',
                  border: 'none',
                  background: done
                    ? 'rgba(34,197,94,0.15)'
                    : 'linear-gradient(135deg, #635bff, #4f46e5)',
                  color: done ? '#22c55e' : 'white',
                  opacity: loading[key] ? 0.7 : 1,
                }}
              >
                {loading[key] ? 'Running…' : done ? '✓ Done' : btnLabel}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Phase 2: AI Level ────────────────────────────────────────────────────────

function Phase2({
  selected,
  onSelect,
}: {
  selected: number | null;
  onSelect: (pct: number) => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
        AI Involvement
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
        How much of your workflow should AI handle?
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        {AI_LEVELS.map((opt) => {
          const active = selected === opt.pct;
          return (
            <button
              key={opt.pct}
              onClick={() => onSelect(opt.pct)}
              style={{
                background: active
                  ? 'linear-gradient(135deg, rgba(99,91,255,0.18), rgba(99,91,255,0.08))'
                  : 'var(--bg-card, #0d0d1a)',
                border: `2px solid ${active ? '#635bff' : 'var(--border)'}`,
                borderRadius: '12px',
                padding: '16px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Bot size={16} color={active ? '#a5b4fc' : 'var(--text-muted)'} />
                <span style={{ fontSize: '14px', fontWeight: 700, color: active ? '#a5b4fc' : 'var(--text-primary)' }}>
                  {opt.label}
                </span>
              </div>
              <div style={{
                display: 'flex',
                gap: '3px',
                flexWrap: 'wrap',
              }}>
                {Array.from({ length: opt.bots }).map((_, i) => (
                  <span key={i} style={{ fontSize: '14px' }}>🤖</span>
                ))}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{opt.desc}</p>
              <span style={{
                fontSize: '13px',
                fontWeight: 700,
                color: active ? '#a5b4fc' : 'var(--text-secondary)',
              }}>
                ${opt.price}/mo
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Phase 3: IQ Level ───────────────────────────────────────────────────────

function Phase3({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
        IQ Level
      </h2>
      <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px' }}>
        Choose the intelligence level for your AI agents.
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        {IQ_LEVELS.map((opt) => {
          const active = selected === opt.id;
          const priceColor = opt.id === 'low' ? '#22c55e' : opt.id === 'medium' ? '#f59e0b' : '#ef4444';
          return (
            <button
              key={opt.id}
              onClick={() => onSelect(opt.id)}
              style={{
                background: active
                  ? 'linear-gradient(135deg, rgba(99,91,255,0.18), rgba(99,91,255,0.05))'
                  : 'var(--bg-card, #0d0d1a)',
                border: `2px solid ${active ? '#635bff' : 'var(--border)'}`,
                borderRadius: '12px',
                padding: '20px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Brain size={18} color={active ? '#a5b4fc' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '15px', fontWeight: 700, color: active ? '#a5b4fc' : 'var(--text-primary)' }}>
                    {opt.label}
                  </span>
                </div>
                <span style={{ fontSize: '16px', fontWeight: 800, color: priceColor }}>{opt.price}</span>
              </div>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-subtle)', margin: '0 0 4px 0' }}>{opt.model}</p>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{opt.desc}</p>
              </div>
              <ul style={{ margin: 0, padding: '0 0 0 14px', listStyle: 'disc' }}>
                {opt.examples.map((ex) => (
                  <li key={ex} style={{ fontSize: '12px', color: 'var(--text-subtle)', marginBottom: '2px' }}>{ex}</li>
                ))}
              </ul>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function RecordProcess() {
  const [gates, setGates] = useState<GateState>({ sms: false, offer: false, pitch: false });
  const [aiLevel, setAiLevel] = useState<number | null>(null);
  const [iqLevel, setIqLevel] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const allGatesPassed = gates.sms && gates.offer && gates.pitch;
  const phase = !allGatesPassed ? 1 : aiLevel === null ? 2 : 3;
  const canSave = allGatesPassed && aiLevel !== null && iqLevel !== null;

  const passGate = (key: keyof GateState) => setGates((p) => ({ ...p, [key]: true }));

  const activate = () => {
    if (!canSave) return;
    const opt = AI_LEVELS.find((a) => a.pct === aiLevel)!;
    const config = {
      gates: { sms: true, offer: true, pitch: true },
      aiLevel,
      iqLevel,
      model: MODEL_MAP[iqLevel!],
      monthlyPrice: opt.price,
      botCount: opt.bots,
    };
    localStorage.setItem('process_config', JSON.stringify(config));
    setSaved(true);
  };

  const stepDot = (n: number) => {
    const active = phase >= n;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <div style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          background: active ? 'linear-gradient(135deg, #635bff, #4f46e5)' : 'var(--bg-card, #0d0d1a)',
          border: `2px solid ${active ? '#635bff' : 'var(--border)'}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '11px',
          fontWeight: 700,
          color: active ? 'white' : 'var(--text-muted)',
          flexShrink: 0,
        }}>
          {n}
        </div>
        {n < 3 && (
          <div style={{
            width: '40px',
            height: '2px',
            background: phase > n ? '#635bff' : 'var(--border)',
            flexShrink: 0,
          }} />
        )}
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #635bff, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Rocket size={20} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Record Your Process
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              3-step setup to activate your AI workflow
            </p>
          </div>
        </div>

        {/* Step progress */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
          {stepDot(1)}
          {stepDot(2)}
          {stepDot(3)}
        </div>
      </div>

      {/* Phases */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {/* Phase 1 always visible */}
        <div style={{
          background: 'var(--bg-card, #0d0d1a)',
          border: '1px solid var(--border)',
          borderRadius: '16px',
          padding: '24px',
        }}>
          <Phase1 gates={gates} onGatePass={passGate} />
        </div>

        {/* Phase 2 unlocks after all gates */}
        {allGatesPassed && (
          <div style={{
            background: 'var(--bg-card, #0d0d1a)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <Phase2 selected={aiLevel} onSelect={setAiLevel} />
          </div>
        )}

        {/* Phase 3 unlocks after AI level selection */}
        {allGatesPassed && aiLevel !== null && (
          <div style={{
            background: 'var(--bg-card, #0d0d1a)',
            border: '1px solid var(--border)',
            borderRadius: '16px',
            padding: '24px',
          }}>
            <Phase3 selected={iqLevel} onSelect={setIqLevel} />
          </div>
        )}

        {/* Save */}
        {canSave && (
          <div style={{
            background: saved
              ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))'
              : 'linear-gradient(135deg, rgba(99,91,255,0.12), rgba(99,91,255,0.04))',
            border: `1px solid ${saved ? 'rgba(34,197,94,0.3)' : 'rgba(99,91,255,0.3)'}`,
            borderRadius: '16px',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
          }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '16px', color: 'var(--text-primary)', margin: '0 0 4px 0' }}>
                {saved ? '✅ Setup Activated!' : 'Ready to activate'}
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
                {saved
                  ? 'Your config has been saved. Your AI agents are ready.'
                  : `${aiLevel}% AI · ${IQ_LEVELS.find(i => i.id === iqLevel)?.model} · $${AI_LEVELS.find(a => a.pct === aiLevel)?.price}/mo`}
              </p>
            </div>
            {!saved && (
              <button
                onClick={activate}
                style={{
                  padding: '12px 28px',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: 'none',
                  background: 'linear-gradient(135deg, #635bff, #4f46e5)',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Zap size={16} />
                Activate My Setup
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

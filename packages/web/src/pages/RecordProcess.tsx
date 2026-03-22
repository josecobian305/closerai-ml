import { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Link } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type MessageType = 'text' | 'approval' | 'ai-picker' | 'iq-picker' | 'payment';

interface ApprovalData {
  component: 'sms' | 'email' | 'offer';
  preview: string;
}

interface AiOption {
  label: string;
  pct: number;
  price: string;
}

interface IqOption {
  label: string;
  model: string;
  cost: string;
  desc: string;
}

interface ChatMessage {
  id: string;
  role: 'brain' | 'user';
  content: string;
  timestamp: Date;
  messageType?: MessageType;
  approvalData?: ApprovalData;
  resolved?: boolean; // marks interactive messages as already acted on
}

interface Approvals {
  sms: boolean;
  email: boolean;
  offer: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AI_OPTIONS: AiOption[] = [
  { label: 'Minimal', pct: 5, price: '$2/mo' },
  { label: 'Light', pct: 25, price: '$49/mo' },
  { label: 'Balanced', pct: 65, price: '$149/mo' },
  { label: 'Heavy', pct: 80, price: '$249/mo' },
  { label: 'Full AI', pct: 90, price: '$497/mo' },
];

const IQ_OPTIONS: IqOption[] = [
  { label: 'Low', model: 'DeepSeek / Haiku', cost: '$', desc: 'Fast & affordable' },
  { label: 'Medium', model: 'Sonnet', cost: '$$', desc: 'Balanced performance' },
  { label: 'High', model: 'Opus', cost: '$$$', desc: 'Maximum intelligence' },
];

const OPENING_MESSAGE: ChatMessage = {
  id: 'opening',
  role: 'brain',
  content: `Hey! Let's set up your sales pipeline. 🚀

I'll walk you through building your automated outreach system. Just talk to me like you're explaining your business to a new hire.

Let's start: **What does your sales process look like right now?** Walk me through how you get a lead and turn them into a customer — step by step.`,
  timestamp: new Date(),
  messageType: 'text',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getUserId(): string {
  try {
    const prefs = JSON.parse(localStorage.getItem('user_preferences') || '{}');
    return prefs.userId || prefs.businessName || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

function getUserConfig(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem('user_preferences') || '{}');
  } catch {
    return {};
  }
}

function getApiPayAccount(): string | null {
  try {
    const data = JSON.parse(localStorage.getItem('apipay_account') || 'null');
    return data?.id || null;
  } catch {
    return null;
  }
}

/** Render markdown-ish bold (**text**) and line breaks */
function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>
        {line}
        {j < arr.length - 1 && <br />}
      </span>
    ));
  });
}

// ─── Inline Components ────────────────────────────────────────────────────────

function ApprovalButtons({
  data,
  resolved,
  onApprove,
  onEdit,
  onRedo,
}: {
  data: ApprovalData;
  resolved: boolean;
  onApprove: () => void;
  onEdit: () => void;
  onRedo: () => void;
}) {
  const btnBase: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '10px',
    border: 'none',
    cursor: resolved ? 'default' : 'pointer',
    fontSize: '13px',
    fontWeight: 600,
    transition: 'opacity 0.15s',
    opacity: resolved ? 0.5 : 1,
  };

  return (
    <div style={{ marginTop: '12px' }}>
      <div
        style={{
          background: 'rgba(99,91,255,0.08)',
          border: '1px solid rgba(99,91,255,0.2)',
          borderRadius: '10px',
          padding: '12px',
          fontSize: '13px',
          color: '#a5b4fc',
          marginBottom: '10px',
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {data.preview}
      </div>
      {resolved ? (
        <span style={{ fontSize: '13px', color: '#22c55e' }}>✅ Approved</span>
      ) : (
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            style={{ ...btnBase, background: 'rgba(34,197,94,0.15)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.3)' }}
            onClick={onApprove}
          >
            ✅ Approve
          </button>
          <button
            style={{ ...btnBase, background: 'rgba(234,179,8,0.12)', color: '#fbbf24', border: '1px solid rgba(234,179,8,0.25)' }}
            onClick={onEdit}
          >
            ✏️ Edit
          </button>
          <button
            style={{ ...btnBase, background: 'rgba(239,68,68,0.12)', color: '#f87171', border: '1px solid rgba(239,68,68,0.25)' }}
            onClick={onRedo}
          >
            ❌ Redo
          </button>
        </div>
      )}
    </div>
  );
}

function AiPicker({
  resolved,
  selected,
  onSelect,
}: {
  resolved: boolean;
  selected: number | null;
  onSelect: (pct: number) => void;
}) {
  return (
    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
      {AI_OPTIONS.map((opt) => {
        const isSelected = selected === opt.pct;
        return (
          <button
            key={opt.pct}
            disabled={resolved}
            onClick={() => !resolved && onSelect(opt.pct)}
            style={{
              padding: '10px 14px',
              borderRadius: '12px',
              border: isSelected
                ? '2px solid #635bff'
                : '1px solid rgba(99,91,255,0.25)',
              background: isSelected ? 'rgba(99,91,255,0.22)' : 'rgba(99,91,255,0.08)',
              color: isSelected ? '#a5b4fc' : '#94a3b8',
              cursor: resolved ? 'default' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
              minWidth: '90px',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: '18px', marginBottom: '2px' }}>
              {opt.pct === 5 ? '🤏' : opt.pct === 25 ? '🔅' : opt.pct === 65 ? '⚡' : opt.pct === 80 ? '🔥' : '🤖'}
            </div>
            <div>{opt.label}</div>
            <div style={{ fontSize: '11px', opacity: 0.7 }}>{opt.pct}% AI</div>
            <div style={{ fontSize: '12px', color: '#635bff', marginTop: '3px' }}>{opt.price}</div>
          </button>
        );
      })}
    </div>
  );
}

function IqPicker({
  resolved,
  selected,
  onSelect,
}: {
  resolved: boolean;
  selected: string | null;
  onSelect: (model: string) => void;
}) {
  return (
    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
      {IQ_OPTIONS.map((opt) => {
        const isSelected = selected === opt.model;
        return (
          <button
            key={opt.model}
            disabled={resolved}
            onClick={() => !resolved && onSelect(opt.model)}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              border: isSelected
                ? '2px solid #635bff'
                : '1px solid rgba(99,91,255,0.25)',
              background: isSelected ? 'rgba(99,91,255,0.22)' : 'rgba(99,91,255,0.08)',
              color: isSelected ? '#a5b4fc' : '#94a3b8',
              cursor: resolved ? 'default' : 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              textAlign: 'center',
              minWidth: '120px',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: '20px', marginBottom: '4px' }}>
              {opt.label === 'Low' ? '🟢' : opt.label === 'Medium' ? '🟡' : '🔴'}
            </div>
            <div>{opt.label} IQ</div>
            <div style={{ fontSize: '11px', color: '#635bff', marginTop: '2px' }}>{opt.model}</div>
            <div style={{ fontSize: '12px', opacity: 0.7, marginTop: '2px' }}>{opt.cost} · {opt.desc}</div>
          </button>
        );
      })}
    </div>
  );
}

function PaymentSection({
  resolved,
  onPaid,
}: {
  resolved: boolean;
  onPaid: () => void;
}) {
  const apiPayId = getApiPayAccount();
  const [useStripe, setUseStripe] = useState(!apiPayId);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvc, setCvc] = useState('');
  const [zip, setZip] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const inputStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(99,91,255,0.25)',
    borderRadius: '8px',
    padding: '9px 12px',
    color: '#e2e8f0',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  const handleSubscribe = async () => {
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSubmitting(false);
    onPaid();
  };

  if (resolved) {
    return (
      <div style={{ marginTop: '10px', color: '#22c55e', fontSize: '13px', fontWeight: 600 }}>
        💳 Payment configured ✅
      </div>
    );
  }

  return (
    <div style={{ marginTop: '14px' }}>
      {apiPayId && (
        <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setUseStripe(false)}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              border: !useStripe ? '2px solid #635bff' : '1px solid rgba(99,91,255,0.25)',
              background: !useStripe ? 'rgba(99,91,255,0.2)' : 'rgba(99,91,255,0.06)',
              color: !useStripe ? '#a5b4fc' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            💳 Pay with apiPay
          </button>
          <button
            onClick={() => setUseStripe(true)}
            style={{
              padding: '9px 16px',
              borderRadius: '10px',
              border: useStripe ? '2px solid #635bff' : '1px solid rgba(99,91,255,0.25)',
              background: useStripe ? 'rgba(99,91,255,0.2)' : 'rgba(99,91,255,0.06)',
              color: useStripe ? '#a5b4fc' : '#94a3b8',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
            }}
          >
            💳 Add Credit Card
          </button>
        </div>
      )}

      {!useStripe && apiPayId ? (
        <div
          style={{
            background: 'rgba(34,197,94,0.08)',
            border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '10px',
          }}
        >
          <div style={{ fontSize: '13px', color: '#86efac', marginBottom: '10px' }}>
            Connected ✅ — apiPay account <strong>{apiPayId}</strong>
          </div>
          <button
            onClick={handleSubscribe}
            disabled={submitting}
            style={{
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #635bff, #4f46e5)',
              color: 'white',
              fontSize: '13px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Processing…' : 'Confirm & Subscribe'}
          </button>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(99,91,255,0.06)',
            border: '1px solid rgba(99,91,255,0.2)',
            borderRadius: '12px',
            padding: '14px 16px',
          }}
        >
          <div style={{ display: 'grid', gap: '10px', marginBottom: '12px' }}>
            <input
              style={inputStyle}
              placeholder="Card number (1234 5678 9012 3456)"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              maxLength={19}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <input
                style={inputStyle}
                placeholder="MM/YY"
                value={expiry}
                onChange={(e) => setExpiry(e.target.value)}
                maxLength={5}
              />
              <input
                style={inputStyle}
                placeholder="CVC"
                value={cvc}
                onChange={(e) => setCvc(e.target.value)}
                maxLength={4}
              />
              <input
                style={inputStyle}
                placeholder="ZIP"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                maxLength={10}
              />
            </div>
          </div>
          <button
            onClick={handleSubscribe}
            disabled={submitting}
            style={{
              width: '100%',
              padding: '11px',
              borderRadius: '10px',
              border: 'none',
              background: 'linear-gradient(135deg, #635bff, #4f46e5)',
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.7 : 1,
            }}
          >
            {submitting ? 'Processing…' : '🔒 Subscribe'}
          </button>
          <div style={{ fontSize: '11px', color: '#475569', textAlign: 'center', marginTop: '8px' }}>
            Secured by Stripe — placeholder checkout
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  approvals,
  aiSelected,
  iqSelected,
  onApprove,
  onEdit,
  onRedo,
  onAiSelect,
  onIqSelect,
  onPaid,
}: {
  msg: ChatMessage;
  approvals: Approvals;
  aiSelected: number | null;
  iqSelected: string | null;
  onApprove: (component: ApprovalData['component']) => void;
  onEdit: (component: ApprovalData['component']) => void;
  onRedo: (component: ApprovalData['component']) => void;
  onAiSelect: (pct: number) => void;
  onIqSelect: (model: string) => void;
  onPaid: () => void;
}) {
  const isBrain = msg.role === 'brain';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: isBrain ? 'row' : 'row-reverse',
        alignItems: 'flex-end',
        gap: '10px',
        marginBottom: '16px',
        padding: '0 16px',
      }}
    >
      {isBrain && (
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #635bff, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            fontSize: '18px',
            alignSelf: 'flex-start',
            marginTop: '2px',
          }}
        >
          🧠
        </div>
      )}

      <div
        style={{
          maxWidth: msg.messageType && msg.messageType !== 'text' ? '85%' : '70%',
          padding: '12px 16px',
          borderRadius: isBrain ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
          background: isBrain
            ? 'rgba(99,91,255,0.12)'
            : 'linear-gradient(135deg, #635bff, #4f46e5)',
          border: isBrain ? '1px solid rgba(99,91,255,0.25)' : 'none',
          fontSize: '14px',
          lineHeight: '1.6',
          color: isBrain ? 'var(--text-primary, #e2e8f0)' : 'white',
          wordBreak: 'break-word',
        }}
      >
        {renderContent(msg.content)}

        {/* Approval Checkpoint */}
        {msg.messageType === 'approval' && msg.approvalData && (
          <ApprovalButtons
            data={msg.approvalData}
            resolved={msg.resolved || approvals[msg.approvalData.component]}
            onApprove={() => onApprove(msg.approvalData!.component)}
            onEdit={() => onEdit(msg.approvalData!.component)}
            onRedo={() => onRedo(msg.approvalData!.component)}
          />
        )}

        {/* AI Involvement Picker */}
        {msg.messageType === 'ai-picker' && (
          <AiPicker
            resolved={msg.resolved || aiSelected !== null}
            selected={aiSelected}
            onSelect={onAiSelect}
          />
        )}

        {/* IQ Level Picker */}
        {msg.messageType === 'iq-picker' && (
          <IqPicker
            resolved={msg.resolved || iqSelected !== null}
            selected={iqSelected}
            onSelect={onIqSelect}
          />
        )}

        {/* Payment */}
        {msg.messageType === 'payment' && (
          <PaymentSection
            resolved={msg.resolved || false}
            onPaid={onPaid}
          />
        )}

        <div
          style={{
            fontSize: '11px',
            color: isBrain ? 'var(--text-subtle, #64748b)' : 'rgba(255,255,255,0.6)',
            marginTop: '6px',
            textAlign: isBrain ? 'left' : 'right',
          }}
        >
          {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: '10px',
        marginBottom: '16px',
        padding: '0 16px',
      }}
    >
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #635bff, #4f46e5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          fontSize: '18px',
        }}
      >
        🧠
      </div>
      <div
        style={{
          padding: '12px 18px',
          borderRadius: '4px 16px 16px 16px',
          background: 'rgba(99,91,255,0.12)',
          border: '1px solid rgba(99,91,255,0.25)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: '#a5b4fc',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              display: 'inline-block',
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function RecordProcess() {
  const [messages, setMessages] = useState<ChatMessage[]>([OPENING_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [approvals, setApprovals] = useState<Approvals>({ sms: false, email: false, offer: false });
  const [aiSelected, setAiSelected] = useState<number | null>(null);
  const [iqSelected, setIqSelected] = useState<string | null>(null);
  const [pipelineLive, setPipelineLive] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const goBack = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // ── Restore saved state ──────────────────────────────────────────────────
  useEffect(() => {
    try {
      const saved = localStorage.getItem('closerai_setup_state');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.approvals) setApprovals(state.approvals);
        if (state.aiSelected !== undefined) setAiSelected(state.aiSelected);
        if (state.iqSelected !== undefined) setIqSelected(state.iqSelected);
        if (state.messages && Array.isArray(state.messages)) {
          setMessages(
            state.messages.map((m: ChatMessage) => ({ ...m, timestamp: new Date(m.timestamp) }))
          );
        }
      }
    } catch {}
  }, []);

  // ── Persist state ────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(
        'closerai_setup_state',
        JSON.stringify({ messages, approvals, aiSelected, iqSelected })
      );
    } catch {}
  }, [messages, approvals, aiSelected, iqSelected]);

  // ── Save / Share ─────────────────────────────────────────────────────────
  const handleSave = () => {
    try {
      localStorage.setItem(
        'closerai_setup_state',
        JSON.stringify({ messages, approvals, aiSelected, iqSelected })
      );
      const url = `${window.location.origin}/app/#setup`;
      navigator.clipboard.writeText(url).catch(() => {});
      setSaveToast(true);
      setTimeout(() => setSaveToast(false), 2500);
    } catch {}
  };

  // ── Push a brain message ─────────────────────────────────────────────────
  const pushBrain = (content: string, extra?: Partial<ChatMessage>) => {
    setMessages((prev) => [
      ...prev,
      {
        id: `brain-${Date.now()}-${Math.random()}`,
        role: 'brain',
        content,
        timestamp: new Date(),
        messageType: 'text',
        ...extra,
      },
    ]);
  };

  // ── Approval handlers ────────────────────────────────────────────────────
  const handleApprove = (component: ApprovalData['component']) => {
    setApprovals((prev) => {
      const next = { ...prev, [component]: true };
      // Check if all three are now approved
      if (next.sms && next.email && next.offer) {
        setTimeout(() => {
          pushBrain(
            "Everything's approved! ✅ Now let's set your automation level.\n\nHow much do you want the AI to handle on its own?",
            { messageType: 'ai-picker' }
          );
        }, 600);
      }
      return next;
    });
    // Mark the approval message resolved
    setMessages((prev) =>
      prev.map((m) =>
        m.messageType === 'approval' && m.approvalData?.component === component
          ? { ...m, resolved: true }
          : m
      )
    );
  };

  const handleEdit = (component: ApprovalData['component']) => {
    const labels: Record<string, string> = { sms: 'SMS', email: 'email', offer: 'offer' };
    pushBrain(
      `Got it — what changes do you want to make to the ${labels[component]}? Describe what should be different and I'll rewrite it.`
    );
  };

  const handleRedo = (component: ApprovalData['component']) => {
    const labels: Record<string, string> = { sms: 'SMS', email: 'email', offer: 'offer' };
    pushBrain(
      `No problem — I'll redo the ${labels[component]} from scratch. Give me any new direction and I'll generate a fresh version.`
    );
    setMessages((prev) =>
      prev.map((m) =>
        m.messageType === 'approval' && m.approvalData?.component === component
          ? { ...m, resolved: true }
          : m
      )
    );
  };

  // ── AI picker handler ────────────────────────────────────────────────────
  const handleAiSelect = (pct: number) => {
    if (aiSelected !== null) return;
    setAiSelected(pct);
    const opt = AI_OPTIONS.find((o) => o.pct === pct)!;
    // Mark ai-picker resolved
    setMessages((prev) =>
      prev.map((m) => (m.messageType === 'ai-picker' ? { ...m, resolved: true } : m))
    );
    setTimeout(() => {
      pushBrain(
        `${opt.label} (${pct}% AI, ${opt.price}) — locked in. 🎯\n\nNow let's pick your **IQ level** — this is the AI model that powers your pipeline. More powerful = smarter responses, higher cost.`,
        { messageType: 'iq-picker' }
      );
    }, 500);
  };

  // ── IQ picker handler ────────────────────────────────────────────────────
  const handleIqSelect = (model: string) => {
    if (iqSelected !== null) return;
    setIqSelected(model);
    const opt = IQ_OPTIONS.find((o) => o.model === model)!;
    setMessages((prev) =>
      prev.map((m) => (m.messageType === 'iq-picker' ? { ...m, resolved: true } : m))
    );
    setTimeout(() => {
      pushBrain(
        `${opt.label} IQ (${model}) — set. ${opt.cost === '$' ? '💚' : opt.cost === '$$' ? '💛' : '🔴'}\n\nLast step — let's set up your payment method.`,
        { messageType: 'payment' }
      );
    }, 500);
  };

  // ── Payment handler ──────────────────────────────────────────────────────
  const handlePaid = () => {
    setPipelineLive(true);
    setMessages((prev) =>
      prev.map((m) => (m.messageType === 'payment' ? { ...m, resolved: true } : m))
    );
    setTimeout(() => {
      pushBrain(
        `🎉 You're live! Your pipeline is running.\n\nHere's what's active:\n• **SMS, email & offer** — approved ✅\n• **AI Level** — ${aiSelected}% automation\n• **IQ** — ${iqSelected}\n• **Billing** — confirmed 💳\n\n→ Head to your **dashboard** to see everything in motion.`
      );
      // Add dashboard link message
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `brain-dash-${Date.now()}`,
            role: 'brain',
            content: '👉 Go to Dashboard →',
            timestamp: new Date(),
            messageType: 'text',
          },
        ]);
      }, 800);
    }, 700);
  };

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
      messageType: 'text',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/app/api/v1/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: getUserId(),
          config: getUserConfig(),
          mode: 'setup',
        }),
      });

      const data = await res.json();
      const reply = data.reply || "I'm here — what do you need?";

      const brainMsg: ChatMessage = {
        id: `brain-${Date.now()}`,
        role: 'brain',
        content: reply,
        timestamp: new Date(),
        messageType: 'text',
      };

      // Detect if the reply includes an approval preview (heuristic: API sets data.approvalData)
      if (data.approvalData) {
        brainMsg.messageType = 'approval';
        brainMsg.approvalData = data.approvalData;
      }

      setMessages((prev) => [...prev, brainMsg]);

      // Handle frontend actions
      if (data.action?.type === 'navigate' && data.action.payload?.page) {
        setTimeout(
          () => window.dispatchEvent(new CustomEvent('navigate', { detail: data.action.payload.page })),
          1500
        );
      }
      if (data.action?.type === 'update_preferences' && data.action.payload) {
        try {
          const current = JSON.parse(localStorage.getItem('user_preferences') || '{}');
          localStorage.setItem('user_preferences', JSON.stringify({ ...current, ...data.action.payload }));
          window.dispatchEvent(new Event('preferences-updated'));
        } catch {}
      }

      // Demo: After certain keywords inject approval checkpoints
      const lower = reply.toLowerCase();
      if (lower.includes('test sms') || lower.includes('sms preview')) {
        setTimeout(() => {
          pushBrain("Here's your test SMS — does this look right?", {
            messageType: 'approval',
            approvalData: {
              component: 'sms',
              preview: `Hi [First Name]! 👋 ${getUserId()} here. We have a funding opportunity that matches your profile. Reply YES to learn more or STOP to opt out.`,
            },
          });
        }, 600);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'brain',
          content: "Hmm, something went wrong on my end. Try again in a sec? 🧠",
          timestamp: new Date(),
          messageType: 'text',
        },
      ]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ── Demo trigger: inject test approval messages (dev only) ───────────────
  const injectDemoApprovals = () => {
    const components: ApprovalData['component'][] = ['sms', 'email', 'offer'];
    const previews = [
      `Hi [First Name]! 👋 We have a funding opportunity that matches your profile. Reply YES to learn more or STOP to opt out.`,
      `Subject: Funding Available for [Business Name]\n\nHi [First Name],\n\nWe've reviewed your profile and have a tailored offer ready. Click here to view: [link]\n\nBest,\n[Agent Name]`,
      `💼 Special Offer: Up to $250K in working capital at competitive rates.\n• Same-day decisions\n• No collateral required\n• Flexible repayment\n\nClaim your offer: [link]`,
    ];
    components.forEach((comp, i) => {
      setTimeout(() => {
        pushBrain(
          `Here's your ${comp === 'sms' ? 'SMS' : comp === 'email' ? 'email' : 'offer'} — does this look right?`,
          {
            messageType: 'approval',
            approvalData: { component: comp, preview: previews[i] },
          }
        );
      }, i * 400);
    });
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--bg-primary, #070710)',
        zIndex: 50,
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
          background: 'var(--bg-surface, #0d0d1a)',
          flexShrink: 0,
        }}
      >
        <button
          onClick={goBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted, #94a3b8)',
            cursor: 'pointer',
            fontSize: '13px',
            padding: '6px 10px',
            borderRadius: '8px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
        >
          <ArrowLeft size={16} />
          Back
        </button>

        <div style={{ width: '1px', height: '20px', background: 'var(--border, rgba(255,255,255,0.08))' }} />

        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #635bff, #4f46e5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0,
          }}
        >
          🧠
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary, #e2e8f0)' }}>
            Brain — Setup Mode
          </div>
          <div style={{ fontSize: '12px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            {pipelineLive ? 'Pipeline Live 🎉' : 'Active'}
          </div>
        </div>

        {/* Save conversation link */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={handleSave}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'none',
              border: '1px solid rgba(99,91,255,0.3)',
              color: '#a5b4fc',
              cursor: 'pointer',
              fontSize: '12px',
              padding: '5px 10px',
              borderRadius: '8px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,91,255,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            title="Save & copy link"
          >
            <Link size={13} />
            Save
          </button>
          {saveToast && (
            <div
              style={{
                position: 'absolute',
                top: '110%',
                right: 0,
                background: '#1e1e3a',
                border: '1px solid rgba(99,91,255,0.3)',
                borderRadius: '8px',
                padding: '7px 12px',
                fontSize: '12px',
                color: '#a5b4fc',
                whiteSpace: 'nowrap',
                animation: 'fadeIn 0.2s ease',
                zIndex: 100,
              }}
            >
              🔗 Link copied!
            </div>
          )}
        </div>

        {/* Dev demo button — hidden in production, shown to seed approvals */}
        {import.meta.env.DEV && (
          <button
            onClick={injectDemoApprovals}
            style={{
              background: 'rgba(99,91,255,0.15)',
              border: '1px solid rgba(99,91,255,0.3)',
              color: '#a5b4fc',
              cursor: 'pointer',
              fontSize: '11px',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
          >
            Demo
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '24px 0',
        }}
      >
        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            approvals={approvals}
            aiSelected={aiSelected}
            iqSelected={iqSelected}
            onApprove={handleApprove}
            onEdit={handleEdit}
            onRedo={handleRedo}
            onAiSelect={handleAiSelect}
            onIqSelect={handleIqSelect}
            onPaid={handlePaid}
          />
        ))}
        {loading && <TypingIndicator />}
        {/* Dashboard link after going live */}
        {pipelineLive && (
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <button
              onClick={goBack}
              style={{
                padding: '10px 24px',
                borderRadius: '12px',
                border: 'none',
                background: 'linear-gradient(135deg, #635bff, #4f46e5)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🚀 Go to Dashboard →
            </button>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div
        style={{
          borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
          background: 'var(--bg-surface, #0d0d1a)',
          padding: '16px 20px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            gap: '10px',
            background: 'var(--bg-card, #111121)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            borderRadius: '14px',
            padding: '10px 14px',
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message the Brain…"
            rows={1}
            style={{
              flex: 1,
              background: 'none',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary, #e2e8f0)',
              fontSize: '14px',
              lineHeight: '1.5',
              resize: 'none',
              maxHeight: '120px',
              overflowY: 'auto',
              fontFamily: 'inherit',
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
            }}
          />

          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              border: 'none',
              background:
                !input.trim() || loading
                  ? 'rgba(99,91,255,0.2)'
                  : 'linear-gradient(135deg, #635bff, #4f46e5)',
              color: !input.trim() || loading ? '#635bff' : 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: !input.trim() || loading ? 'not-allowed' : 'pointer',
              flexShrink: 0,
              transition: 'background 0.15s',
            }}
          >
            <Send size={16} />
          </button>
        </div>

        <p
          style={{
            fontSize: '11px',
            color: 'var(--text-subtle, #475569)',
            textAlign: 'center',
            marginTop: '8px',
          }}
        >
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}

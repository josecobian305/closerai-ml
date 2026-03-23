import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, GitBranch, MessageCircle, Sparkles, ArrowLeft } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

interface ChatMsg {
  id: string;
  role: 'brain' | 'user';
  content: string;
  ts: Date;
}

const STAGE_KEYWORDS: Record<string, string[]> = {
  'Lead In': ['lead', 'new lead', 'comes in', 'inbound', 'inquiry', 'marketing'],
  'First Contact': ['first', 'call', 'text', 'sms', 'reach out', 'contact', 'message'],
  'Follow Up': ['follow up', 'follow-up', 'second', 'reminder', 'check in', 'drip'],
  'Docs Requested': ['document', 'bank statement', 'application', 'docs', 'paperwork'],
  'Underwriting': ['underwrite', 'review', 'analyze', 'assess', 'risk', 'credit'],
  'Offer Sent': ['offer', 'proposal', 'terms', 'quote', 'pitch'],
  'Negotiation': ['negotiate', 'counter', 'adjust', 'discuss terms', 'objection'],
  'Close': ['close', 'fund', 'funded', 'signed', 'done', 'completed', 'approval'],
};

// Parse explicit PIPELINE_TOUCHES from brain messages (preferred over keyword detection)
function parseBrainTouches(messages: ChatMsg[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (m.role !== 'brain') continue;
    const match = m.content.match(/PIPELINE_TOUCHES:\s*\[([^\]]+)\]/);
    if (match) {
      try {
        const parsed = JSON.parse(`[${match[1]}]`);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Try splitting by comma if JSON parse fails
        return match[1].split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      }
    }
  }
  return [];
}

function detectStages(messages: ChatMsg[]): string[] {
  // First try to get explicit touches from the brain
  const brainTouches = parseBrainTouches(messages);
  if (brainTouches.length > 0) return brainTouches;
  
  // Fall back to keyword detection
  const allTexts = messages.map(m => m.content.toLowerCase()).join(' ');
  return Object.entries(STAGE_KEYWORDS)
    .filter(([_, kws]) => kws.some(kw => allTexts.includes(kw)))
    .map(([stage]) => stage);
}

function renderContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return part.split('\n').map((line, j, arr) => (
      <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
    ));
  });
}

// ─── Typing Indicator ─────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, marginBottom: 16, padding: '0 16px' }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: 'linear-gradient(135deg, #635bff, #4f46e5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, fontSize: 18,
      }}>🧠</div>
      <div style={{
        padding: '12px 18px', borderRadius: '4px 16px 16px 16px',
        background: 'rgba(99,91,255,0.12)', border: '1px solid rgba(99,91,255,0.25)',
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            width: 7, height: 7, borderRadius: '50%', background: '#a5b4fc',
            animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`, display: 'inline-block',
          }} />
        ))}
      </div>
    </div>
  );
}

// ─── Intro Popup ──────────────────────────────────────────────────────────────

function IntroPopup({ assetCount, businessName, industry, onStart }: { assetCount: number; businessName: string; industry: string; onStart: () => void }) {
  // Generate topics based on user's actual business
  const biz = businessName || 'your business';
  const ind = industry || 'your industry';
  const topics = [
    `How ${biz} gets new leads and makes first contact`,
    `Your follow-up sequence when ${ind} prospects go quiet`,
    `Pages and links you share with customers (offers, forms, portals)`,
    `How ${biz} collects documents or information from clients`,
    `Your closing process and final follow-up touches`,
  ];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: 'var(--bg-card, #13131e)', border: '1px solid rgba(99,91,255,0.3)',
        borderRadius: 20, padding: 'clamp(24px, 5vw, 40px)', maxWidth: 440, width: '100%',
        textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 40px rgba(99,91,255,0.1)',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'linear-gradient(135deg, rgba(99,91,255,0.2), rgba(99,91,255,0.05))',
          border: '1px solid rgba(99,91,255,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 24px',
        }}>
          <MessageCircle size={32} style={{ color: '#635bff' }} />
        </div>

        <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 12, color: 'var(--text-primary, #e2e8f0)' }}>
          Let's Define Your Touch Sequence
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.7, marginBottom: 8 }}>
          I'll help you map out every outreach action — texts, emails, calls, links, and pages your customers see.
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.7, marginBottom: 24 }}>
          Your approved touches become the <strong style={{ color: '#a5b4fc' }}>exact playbook</strong> your AI agents follow.
        </p>

        {assetCount > 0 && (
          <div style={{
            background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)',
            borderRadius: 10, padding: '12px 16px', marginBottom: 24,
            display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center',
          }}>
            <Sparkles size={16} style={{ color: '#22c55e' }} />
            <span style={{ fontSize: 12, color: '#22c55e' }}>
              {assetCount} training asset{assetCount > 1 ? 's' : ''} uploaded — I'll reference {assetCount > 1 ? 'these' : 'this'} while we build
            </span>
          </div>
        )}

        <div style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 16,
          marginBottom: 28, textAlign: 'left',
        }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-subtle, #64748b)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
            What we'll cover
          </div>
          {topics.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-muted, #94a3b8)', marginBottom: 8 }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                background: 'rgba(99,91,255,0.15)', border: '1px solid rgba(99,91,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, color: '#a5b4fc',
              }}>{i + 1}</div>
              {item}
            </div>
          ))}
        </div>

        <button onClick={onStart} style={{
          width: '100%',
          background: 'linear-gradient(135deg, #635bff, #4f46e5)', color: '#fff', border: 'none',
          padding: '16px 32px', borderRadius: 12, fontSize: 16, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(99,91,255,0.3)',
        }}>
          <MessageCircle size={18} /> Start Conversation
        </button>
        <div style={{ fontSize: 11, color: 'var(--text-subtle, #64748b)', marginTop: 12 }}>
          Takes about 2-3 minutes · You can adjust everything later
        </div>
      </div>
    </div>
  );
}

// ─── Message Bubble (Discord-style) ───────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMsg }) {
  const isBrain = msg.role === 'brain';
  return (
    <div style={{
      display: 'flex', flexDirection: isBrain ? 'row' : 'row-reverse',
      alignItems: 'flex-end', gap: 10, marginBottom: 16, padding: '0 16px',
    }}>
      {isBrain && (
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #635bff, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: 18, alignSelf: 'flex-start', marginTop: 2,
        }}>🧠</div>
      )}
      <div style={{
        maxWidth: '75%', padding: '12px 16px',
        borderRadius: isBrain ? '4px 16px 16px 16px' : '16px 4px 16px 16px',
        background: isBrain ? 'rgba(99,91,255,0.12)' : 'linear-gradient(135deg, #635bff, #4f46e5)',
        border: isBrain ? '1px solid rgba(99,91,255,0.25)' : 'none',
        fontSize: 14, lineHeight: 1.6, color: isBrain ? 'var(--text-primary, #e2e8f0)' : 'white',
        wordBreak: 'break-word',
      }}>
        {renderContent(msg.content)}
        <div style={{
          fontSize: 11, color: isBrain ? 'var(--text-subtle, #64748b)' : 'rgba(255,255,255,0.6)',
          marginTop: 6, textAlign: isBrain ? 'left' : 'right',
        }}>
          {msg.ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const OPENING_MESSAGE = `Hey! Let's build your touch sequence. 🚀

I'll help you map out every outreach action your AI agents will run — texts, emails, calls, voicemails, links — the whole playbook.

**What's the first thing you do when a new lead comes in?** Do you text them, call them, email them? Walk me through that first move.`;

export function Step03SalesProcess({ data, onUpdate, onNext, onBack }: StepProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'opening', role: 'brain', content: OPENING_MESSAGE, ts: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [detectedStages, setDetectedStages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => { setDetectedStages(detectStages(messages)); }, [messages]);

  useEffect(() => {
    if (!showIntro) setTimeout(() => inputRef.current?.focus(), 300);
  }, [showIntro]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: 'user', content: text, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Call the brain API — same endpoint as RecordProcess
      const res = await fetch('/app/api/v1/brain/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          userId: data.email || 'onboarding-user',
          config: {
            businessName: data.businessName,
            industry: data.industry,
            state: data.state,
            assetCount: data.assets.length,
          },
          mode: 'setup',
        }),
      });

      const result = await res.json();
      const reply = result.reply || "I'm here — what do you need?";

      setMessages(prev => [...prev, {
        id: `b${Date.now()}`, role: 'brain', content: reply, ts: new Date(),
      }]);

      // Check if the brain says the pipeline is ready / confirmed
      const lower = reply.toLowerCase();
      if (lower.includes('pipeline is live') || lower.includes('pipeline is set') || lower.includes('locked in') || lower.includes('you\'re all set')) {
        const stages = detectStages([...messages, userMsg]);
        const finalStages = stages.length > 0 ? stages : [...getPipelineStagesForIndustry(data.industry)];
        onUpdate({ pipelineStages: finalStages, processSummary: messages.map(m => `${m.role}: ${m.content}`).join('\n') });
        setConfirmed(true);
        setTimeout(onNext, 2000);
      }
    } catch {
      setMessages(prev => [...prev, {
        id: `err${Date.now()}`, role: 'brain',
        content: "Hmm, something went wrong on my end. Try again in a sec? 🧠",
        ts: new Date(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, messages, data, onUpdate, onNext]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Manual "lock in" button after enough conversation
  const canLockIn = messages.filter(m => m.role === 'user').length >= 3;

  const handleLockIn = () => {
    const stages = detectStages(messages);
    const industry = data.industry?.toLowerCase() || 'default';
    const INDUSTRY_STAGES: Record<string, string[]> = {
      construction: ['Lead In', 'Site Visit', 'Estimate Sent', 'Contract Signed', 'Project Start', 'Final Payment'],
      healthcare: ['Referral In', 'Intake Call', 'Insurance Verify', 'Appointment Set', 'Treatment Start', 'Follow-up'],
      restaurant: ['Lead In', 'First Visit', 'Reservation', 'Dining Experience', 'Feedback', 'Loyalty Signup'],
      'auto repair': ['Lead In', 'Inspection', 'Quote Sent', 'Approval', 'Repair Started', 'Pickup Ready'],
      'auto sales': ['Lead In', 'Test Drive', 'Trade-In Appraisal', 'Financing', 'Contract', 'Delivery'],
      automotive: ['Lead In', 'Test Drive', 'Trade-In Appraisal', 'Financing', 'Contract', 'Delivery'],
      'real estate': ['Lead In', 'Showing Scheduled', 'Property Tour', 'Offer Made', 'Under Contract', 'Closed'],
      legal: ['Lead In', 'Consultation', 'Engagement Letter', 'Case Filed', 'Discovery', 'Resolution'],
      insurance: ['Lead In', 'Needs Analysis', 'Quote Presented', 'Application', 'Underwriting', 'Policy Issued'],
      finance: ['Lead In', 'Docs Requested', 'Underwriting', 'Offer Sent', 'Approval', 'Funded'],
      default: ['Lead In', 'First Contact', 'Follow Up', 'Proposal', 'Negotiation', 'Close'],
    };
    const finalStages = stages.length > 0 ? stages : (INDUSTRY_STAGES[industry] || INDUSTRY_STAGES.default);
    
    // Show confirmation message with the stages BEFORE moving forward
    const stageList = finalStages.map((s, i) => `${i + 1}. ${s}`).join('\n');
    setMessages(prev => [...prev, {
      id: 'confirm', role: 'brain', 
      content: `Here's your pipeline I built from our conversation:\n\n${stageList}\n\n**Does this look right?** If you want to change anything, just tell me. Otherwise say "looks good" and we'll move to testing!`,
      ts: new Date(),
    }]);
    
    // Save stages but don't move forward yet — wait for confirmation
    onUpdate({ pipelineStages: finalStages, processSummary: messages.map(m => `${m.role}: ${m.content}`).join('\n') });
    
    // Override sendMessage to listen for confirmation
    const origConfirmed = confirmed;
    if (!origConfirmed) {
      // Don't auto-advance — user needs to confirm
      return;
    }
    
    setConfirmed(true);
    setMessages(prev => [...prev, {
      id: 'locked', role: 'brain', content: '✅ Pipeline locked in! Moving to demo tests.', ts: new Date(),
    }]);
    setTimeout(onNext, 1500);
  };

  if (showIntro) {
    return <IntroPopup assetCount={data.assets.length} businessName={data.businessName} industry={data.industry} onStart={() => setShowIntro(false)} />;
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column',
      background: 'var(--bg-primary, #070710)', zIndex: 50,
    }}>
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      {/* Header — Discord style */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px',
        borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
        background: 'var(--bg-surface, #0d0d1a)', flexShrink: 0,
      }}>
        <button onClick={onBack} style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'none', border: 'none', color: 'var(--text-muted, #94a3b8)',
          cursor: 'pointer', fontSize: 13, padding: '6px 10px', borderRadius: 8,
        }}>
          <ArrowLeft size={16} /> Back
        </button>
        <div style={{ width: 1, height: 20, background: 'var(--border, rgba(255,255,255,0.08))' }} />
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, #635bff, #4f46e5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 18, flexShrink: 0,
        }}>🧠</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary, #e2e8f0)' }}>
            Brain — Touch Sequence Builder
          </div>
          <div style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Active
          </div>
        </div>

        {detectedStages.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(99,91,255,0.12)', border: '1px solid rgba(99,91,255,0.25)',
            borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#a5b4fc', fontWeight: 600,
          }}>
            <GitBranch size={13} /> {detectedStages.length} touches
          </div>
        )}

        {/* Lock in button — appears after 3+ user messages */}
        {canLockIn && !confirmed && (
          <button onClick={handleLockIn} style={{
            background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.3)',
            color: '#22c55e', fontSize: 12, fontWeight: 600, padding: '6px 12px',
            borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ✅ Lock In
          </button>
        )}
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar — Discord style */}
      {!confirmed && (
        <div style={{
          borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
          background: 'var(--bg-surface, #0d0d1a)', padding: '16px 20px', flexShrink: 0,
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', gap: 10,
            background: 'var(--bg-card, #111121)',
            border: '1px solid var(--border, rgba(255,255,255,0.08))',
            borderRadius: 14, padding: '10px 14px',
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message the Brain…"
              rows={1}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: 'var(--text-primary, #e2e8f0)', fontSize: 14, lineHeight: 1.5,
                resize: 'none', maxHeight: 120, overflowY: 'auto', fontFamily: 'inherit',
              }}
              onInput={e => {
                const el = e.currentTarget;
                el.style.height = 'auto';
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: !input.trim() || loading ? 'rgba(99,91,255,0.2)' : 'linear-gradient(135deg, #635bff, #4f46e5)',
                color: !input.trim() || loading ? '#635bff' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: !input.trim() || loading ? 'not-allowed' : 'pointer', flexShrink: 0,
              }}
            >
              <Send size={16} />
            </button>
          </div>
          <p style={{ fontSize: 11, color: 'var(--text-subtle, #475569)', textAlign: 'center', marginTop: 8 }}>
            Press Enter to send · Shift+Enter for new line
          </p>
        </div>
      )}
    </div>
  );
}

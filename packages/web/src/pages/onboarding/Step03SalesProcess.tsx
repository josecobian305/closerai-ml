import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, GitBranch, MessageCircle, Sparkles, ArrowLeft } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

interface ChatMsg {
  id: string;
  role: 'brain' | 'user';
  content: string;
  ts: Date;
}

const GUIDED_QUESTIONS = [
  "Walk me through what happens when a new lead comes in. What's the first thing you do?",
  "How do you follow up if they don't respond after the first contact?",
  "When do you typically send the offer — before or after you've built rapport?",
  "What documents do you collect before underwriting?",
  "How long does your average deal take from first contact to funded?",
  "What's your biggest bottleneck in the sales process right now?",
];

const STAGE_KEYWORDS: Record<string, string[]> = {
  'Lead In': ['lead', 'new lead', 'comes in', 'inbound', 'inquiry'],
  'First Contact': ['first', 'call', 'text', 'sms', 'reach out', 'contact'],
  'Follow Up': ['follow up', 'follow-up', 'second', 'reminder', 'check in'],
  'Docs Requested': ['document', 'bank statement', 'application', 'docs', 'paperwork'],
  'Underwriting': ['underwrite', 'review', 'analyze', 'assess', 'risk'],
  'Offer Sent': ['offer', 'proposal', 'terms', 'quote', 'pitch'],
  'Negotiation': ['negotiate', 'counter', 'adjust', 'discuss terms', 'objection'],
  'Close': ['close', 'fund', 'funded', 'signed', 'done', 'completed', 'approval'],
};

function detectStages(messages: ChatMsg[]): string[] {
  const userTexts = messages.filter(m => m.role === 'user').map(m => m.content.toLowerCase()).join(' ');
  return Object.entries(STAGE_KEYWORDS)
    .filter(([_, kws]) => kws.some(kw => userTexts.includes(kw)))
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

function IntroPopup({ assetCount, onStart }: { assetCount: number; onStart: () => void }) {
  const topics = ['How you handle new leads', 'Your follow-up cadence', 'When you pitch & close', 'Documents you collect', 'Deal timeline & bottlenecks'];

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
          Let's Design Your Sales Process
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.7, marginBottom: 8 }}>
          I'm going to ask you a few questions about how you sell — from first contact to close.
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-muted, #94a3b8)', lineHeight: 1.7, marginBottom: 24 }}>
          Your answers will become the <strong style={{ color: '#a5b4fc' }}>blueprint</strong> your AI agents follow.
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

export function Step03SalesProcess({ data, onUpdate, onNext, onBack }: StepProps) {
  const [showIntro, setShowIntro] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'intro', role: 'brain', content: "Hey! Let's map out your sales process. 🚀\n\nI'll walk you through a few questions about how you sell — answer in your own words. I'll build your pipeline as we go.\n\nLet's start:", ts: new Date() },
    { id: 'q0', role: 'brain', content: GUIDED_QUESTIONS[0], ts: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [detectedStages, setDetectedStages] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [typing, setTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  useEffect(() => { setDetectedStages(detectStages(messages)); }, [messages]);

  useEffect(() => {
    if (!showIntro) setTimeout(() => inputRef.current?.focus(), 300);
  }, [showIntro]);

  const pushBrain = useCallback((content: string) => {
    setTyping(true);
    setTimeout(() => {
      setMessages(prev => [...prev, { id: `b${Date.now()}`, role: 'brain', content, ts: new Date() }]);
      setTyping(false);
    }, 800 + Math.random() * 600);
  }, []);

  const sendMessage = useCallback(() => {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: 'user', content: text, ts: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    const nextIdx = questionIdx + 1;

    if (nextIdx < GUIDED_QUESTIONS.length) {
      setQuestionIdx(nextIdx);
      pushBrain(GUIDED_QUESTIONS[nextIdx]);
    } else if (!confirmed && questionIdx < GUIDED_QUESTIONS.length) {
      setQuestionIdx(nextIdx);
      const stages = detectStages([...messages, userMsg]);
      const stageList = stages.length > 0 ? stages.join(' → ') : 'Lead In → First Contact → Follow Up → Docs Requested → Underwriting → Offer Sent → Close';
      pushBrain(`Here's what I heard:\n\n**Your pipeline:** ${stageList}\n\nDoes this match how you sell? Type **"yes"** to lock it in, or tell me what to change.`);
    } else if (['yes', 'yeah', 'correct', 'looks good', 'lock it in', 'confirm', 'yep', 'that works'].some(w => text.toLowerCase().includes(w))) {
      const stages = detectStages([...messages, userMsg]);
      const finalStages = stages.length > 0 ? stages : ['Lead In', 'First Contact', 'Follow Up', 'Docs Requested', 'Underwriting', 'Offer Sent', 'Close'];
      onUpdate({ pipelineStages: finalStages, processSummary: messages.map(m => `${m.role}: ${m.content}`).join('\n') });
      setConfirmed(true);
      pushBrain('✅ Pipeline locked in! Moving to the next step.');
      setTimeout(onNext, 2000);
    } else {
      pushBrain("Got it — tell me more, or type **\"yes\"** if everything looks right.");
    }
  }, [input, messages, questionIdx, confirmed, onUpdate, onNext, pushBrain]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  if (showIntro) {
    return <IntroPopup assetCount={data.assets.length} onStart={() => setShowIntro(false)} />;
  }

  const stagesForPanel = detectedStages.length > 0 ? detectedStages : ['Waiting for responses…'];

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
            Brain — Process Recording
          </div>
          <div style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
            Active
          </div>
        </div>

        {/* Pipeline stage count badge */}
        {detectedStages.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(99,91,255,0.12)', border: '1px solid rgba(99,91,255,0.25)',
            borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#a5b4fc', fontWeight: 600,
          }}>
            <GitBranch size={13} /> {detectedStages.length} stages
          </div>
        )}
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px 0' }}>
        {messages.map(msg => <MessageBubble key={msg.id} msg={msg} />)}
        {typing && <TypingIndicator />}
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
              disabled={!input.trim()}
              style={{
                width: 36, height: 36, borderRadius: 10, border: 'none',
                background: !input.trim() ? 'rgba(99,91,255,0.2)' : 'linear-gradient(135deg, #635bff, #4f46e5)',
                color: !input.trim() ? '#635bff' : 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0,
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

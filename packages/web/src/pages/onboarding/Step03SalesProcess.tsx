import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, GitBranch } from 'lucide-react';
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

export function Step03SalesProcess({ data, onUpdate, onNext }: StepProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { id: 'intro', role: 'brain', content: "Let's map out your sales process. I'll ask you a few questions about how you sell — answer in your own words. I'll build your pipeline as we go.", ts: new Date() },
    { id: 'q0', role: 'brain', content: GUIDED_QUESTIONS[0], ts: new Date() },
  ]);
  const [input, setInput] = useState('');
  const [questionIdx, setQuestionIdx] = useState(0);
  const [detectedStages, setDetectedStages] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setDetectedStages(detectStages(messages));
  }, [messages]);

  const sendMessage = useCallback(() => {
    if (!input.trim()) return;
    const userMsg: ChatMsg = { id: `u${Date.now()}`, role: 'user', content: input.trim(), ts: new Date() };
    const nextIdx = questionIdx + 1;
    const newMsgs = [userMsg];

    if (nextIdx < GUIDED_QUESTIONS.length) {
      newMsgs.push({ id: `q${nextIdx}`, role: 'brain', content: GUIDED_QUESTIONS[nextIdx], ts: new Date() });
      setQuestionIdx(nextIdx);
    } else if (!confirmed) {
      const stages = detectStages([...messages, userMsg]);
      const stageList = stages.length > 0 ? stages.join(' → ') : 'Lead In → First Contact → Follow Up → Docs Requested → Underwriting → Offer Sent → Close';
      newMsgs.push({
        id: 'summary', role: 'brain',
        content: `Here's what I heard:\n\n**Your pipeline:** ${stageList}\n\nDoes this match how you sell? Type "yes" to lock it in, or tell me what to change.`,
        ts: new Date(),
      });
      setQuestionIdx(nextIdx);
    } else {
      // Already confirmed — shouldn't happen
    }

    setMessages(prev => [...prev, ...newMsgs]);
    setInput('');

    // Check if user confirmed
    if (questionIdx >= GUIDED_QUESTIONS.length && ['yes', 'yeah', 'correct', 'looks good', 'lock it in', 'confirm'].some(w => input.toLowerCase().includes(w))) {
      const stages = detectStages([...messages, userMsg]);
      const finalStages = stages.length > 0 ? stages : ['Lead In', 'First Contact', 'Follow Up', 'Docs Requested', 'Underwriting', 'Offer Sent', 'Close'];
      onUpdate({ pipelineStages: finalStages, processSummary: messages.map(m => `${m.role}: ${m.content}`).join('\n') });
      setConfirmed(true);
      setMessages(prev => [...prev, {
        id: 'locked', role: 'brain',
        content: '✅ Pipeline locked in! Moving to the next step.',
        ts: new Date(),
      }]);
      setTimeout(onNext, 1200);
    }
  }, [input, messages, questionIdx, confirmed, onUpdate, onNext]);

  return (
    <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 160px)', maxHeight: 700 }}>
      {/* Chat panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#635bff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 12 }}>
          💬 RECORD YOUR SALES PROCESS
        </div>

        <div ref={chatRef} style={{
          flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12,
          padding: '12px 0', minHeight: 0,
        }}>
          {messages.map(m => (
            <div key={m.id} style={{
              alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '80%', padding: '12px 16px', borderRadius: 12,
              background: m.role === 'user' ? '#635bff' : 'rgba(255,255,255,0.06)',
              fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap',
            }}>
              {m.content}
            </div>
          ))}
        </div>

        {/* Input */}
        {!confirmed && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Type your answer…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, padding: '12px 16px', color: '#fff', fontSize: 14,
                fontFamily: 'inherit', outline: 'none',
              }}
            />
            <button onClick={sendMessage} style={{
              background: '#635bff', border: 'none', borderRadius: 8,
              width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#fff', flexShrink: 0,
            }}>
              <Send size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Pipeline map panel */}
      <div style={{
        width: 240, flexShrink: 0, background: 'rgba(255,255,255,0.03)',
        borderRadius: 12, padding: 20, overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, color: '#635bff', fontSize: 13, fontWeight: 600 }}>
          <GitBranch size={16} /> Pipeline Map
        </div>
        {(detectedStages.length > 0 ? detectedStages : ['Waiting for responses…']).map((stage, i) => (
          <div key={stage} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
            background: detectedStages.includes(stage) ? 'rgba(99,91,255,0.1)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${detectedStages.includes(stage) ? 'rgba(99,91,255,0.3)' : 'rgba(255,255,255,0.06)'}`,
            borderRadius: 8, fontSize: 13, fontWeight: 500,
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: detectedStages.includes(stage) ? '#635bff' : 'rgba(255,255,255,0.08)',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {detectedStages.includes(stage) ? '✓' : i + 1}
            </span>
            {stage}
          </div>
        ))}
      </div>
    </div>
  );
}

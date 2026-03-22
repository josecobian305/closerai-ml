import { useState, useRef, useEffect, useCallback } from 'react';
import { Send, GitBranch, MessageCircle, Sparkles } from 'lucide-react';
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

// ─── Intro Popup ──────────────────────────────────────────────────────────────

function IntroPopup({ assetCount, onStart }: { assetCount: number; onStart: () => void }) {
  const topics = ['How you handle new leads', 'Your follow-up cadence', 'When you pitch & close', 'Documents you collect', 'Deal timeline & bottlenecks'];

  return (
    <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-[var(--bg-card)] border border-[var(--border-active)] rounded-2xl p-6 sm:p-10 max-w-md w-full text-center shadow-2xl shadow-indigo-500/10 max-h-[90vh] overflow-y-auto">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6">
          <MessageCircle size={32} className="text-indigo-400" />
        </div>

        <h2 className="text-2xl font-extrabold text-white mb-3">
          Let's Design Your Sales Process
        </h2>
        <p className="text-[var(--text-muted)] mb-2 leading-relaxed">
          I'm going to ask you a few questions about how you sell — from first contact to close.
        </p>
        <p className="text-[var(--text-muted)] mb-6 leading-relaxed">
          Your answers will become the <strong className="text-indigo-400">blueprint</strong> your AI agents follow.
        </p>

        {assetCount > 0 && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 mb-6 flex items-center gap-2 justify-center">
            <Sparkles size={16} className="text-emerald-400" />
            <span className="text-xs text-emerald-400">
              {assetCount} training asset{assetCount > 1 ? 's' : ''} uploaded — I'll reference {assetCount > 1 ? 'these' : 'this'} while we build
            </span>
          </div>
        )}

        {/* Topics */}
        <div className="bg-[var(--bg-elevated)]/60 rounded-xl p-4 mb-8 text-left">
          <p className="text-[10px] font-semibold text-[var(--text-subtle)] uppercase tracking-wider mb-3">What we'll cover</p>
          <div className="space-y-2.5">
            {topics.map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-[var(--text-muted)]">
                <div className="w-5 h-5 rounded-full bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400 shrink-0">
                  {i + 1}
                </div>
                {item}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={onStart}
          className="w-full bg-[var(--accent)] hover:opacity-90 text-white font-semibold py-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
        >
          <MessageCircle size={18} /> Start Conversation
        </button>
        <p className="text-[10px] text-[var(--text-subtle)] mt-3">Takes about 2-3 minutes · You can adjust everything later</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function Step03SalesProcess({ data, onUpdate, onNext }: StepProps) {
  const [showIntro, setShowIntro] = useState(true);
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

  useEffect(() => {
    if (!showIntro) setTimeout(() => inputRef.current?.focus(), 300);
  }, [showIntro]);

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
        content: `Here's what I heard:\n\nYour pipeline: ${stageList}\n\nDoes this match how you sell? Type "yes" to lock it in, or tell me what to change.`,
        ts: new Date(),
      });
      setQuestionIdx(nextIdx);
    }

    setMessages(prev => [...prev, ...newMsgs]);
    setInput('');

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

  if (showIntro) {
    return <IntroPopup assetCount={data.assets.length} onStart={() => setShowIntro(false)} />;
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 h-[calc(100vh-100px)] px-4 md:px-6 pt-4 max-w-5xl mx-auto w-full">
      {/* Chat panel */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0">
        <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3">💬 Record Your Sales Process</p>
        <div ref={chatRef} className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 min-h-0">
          {messages.map(m => (
            <div
              key={m.id}
              className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'self-end bg-[var(--accent)] text-white rounded-br-sm'
                  : 'self-start bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-bl-sm border border-[var(--border)]'
              }`}
            >
              {m.content}
            </div>
          ))}
        </div>
        {!confirmed && (
          <div className="flex gap-2 mt-3 mb-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') sendMessage(); }}
              placeholder="Type your answer…"
              className="flex-1 bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-4 py-3 text-sm text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
            />
            <button
              onClick={sendMessage}
              className="w-11 h-11 bg-[var(--accent)] hover:opacity-90 rounded-xl flex items-center justify-center text-white shrink-0 transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Pipeline map */}
      <div className="w-56 shrink-0 bg-[var(--bg-card)] rounded-2xl p-5 border border-[var(--border)] overflow-y-auto hidden md:flex flex-col gap-2">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold mb-2">
          <GitBranch size={14} /> Pipeline Map
        </div>
        {(detectedStages.length > 0 ? detectedStages : ['Waiting for responses…']).map((stage, i) => {
          const active = detectedStages.includes(stage);
          return (
            <div
              key={stage}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium border transition-all ${
                active
                  ? 'bg-[var(--accent)]/10 border-indigo-500/30 text-indigo-300'
                  : 'bg-[var(--bg-elevated)]/40 border-[var(--border)] text-[var(--text-muted)]'
              }`}
            >
              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-subtle)]'
              }`}>
                {active ? '✓' : i + 1}
              </div>
              {stage}
            </div>
          );
        })}
      </div>
    </div>
  );
}

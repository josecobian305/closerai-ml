import { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'brain' | 'user';
  content: string;
  timestamp: Date;
}

// ─── Opening message ─────────────────────────────────────────────────────────

const OPENING_MESSAGE: ChatMessage = {
  id: 'opening',
  role: 'brain',
  content: `Hey! Let's set up your sales pipeline. 🚀

I'll walk you through building your automated outreach system. Just talk to me like you're explaining your business to a new hire.

Let's start: **What does your sales process look like right now?** Walk me through how you get a lead and turn them into a customer — step by step.`,
  timestamp: new Date(),
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

// ─── Message Bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
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
      {/* Avatar */}
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
          }}
        >
          🧠
        </div>
      )}

      {/* Bubble */}
      <div
        style={{
          maxWidth: '70%',
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const goBack = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'dashboard' }));

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date(),
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
      };

      setMessages((prev) => [...prev, brainMsg]);

      // Handle frontend actions (navigate, preferences, etc.)
      if (data.action?.type === 'navigate' && data.action.payload?.page) {
        setTimeout(() => window.dispatchEvent(new CustomEvent('navigate', { detail: data.action.payload.page })), 1500);
      }
      if (data.action?.type === 'update_preferences' && data.action.payload) {
        try {
          const current = JSON.parse(localStorage.getItem('user_preferences') || '{}');
          localStorage.setItem('user_preferences', JSON.stringify({ ...current, ...data.action.payload }));
          window.dispatchEvent(new Event('preferences-updated'));
        } catch {}
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'brain',
          content: "Hmm, something went wrong on my end. Try again in a sec? 🧠",
          timestamp: new Date(),
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
      {/* Pulse animation for typing dots */}
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
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
          onClick={() => goBack()}
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

        <div
          style={{
            width: '1px',
            height: '20px',
            background: 'var(--border, rgba(255,255,255,0.08))',
          }}
        />

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

        <div>
          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: 'var(--text-primary, #e2e8f0)',
            }}
          >
            Brain — Setup Mode
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#22c55e',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#22c55e',
                display: 'inline-block',
              }}
            />
            Active
          </div>
        </div>
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
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {loading && <TypingIndicator />}
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

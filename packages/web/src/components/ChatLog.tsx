import { useRef, useEffect, useState } from 'react';
import { Send } from 'lucide-react';
import type { Message } from '../types';

interface ChatLogProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
  onSend?: (text: string) => Promise<void>;
}

function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

function categoryClass(category?: string): string {
  switch (category) {
    case 'hot': case 'interested': return 'bg-green-900/70 text-green-300 border border-green-700/50';
    case 'warm': return 'bg-yellow-900/70 text-yellow-300 border border-yellow-700/50';
    case 'cold': case 'not_interested': return 'bg-gray-700 text-gray-400';
    case 'already_funded': return 'bg-blue-900/70 text-blue-300';
    case 'wrong_number': return 'bg-red-900/70 text-red-300';
    default: return 'bg-gray-800 text-gray-500';
  }
}

function ChannelBadge({ channel }: { channel?: string }) {
  if (!channel) return null;
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
      channel === 'email' ? 'bg-blue-900/60 text-blue-300' : 'bg-gray-800 text-gray-400'
    }`}>
      {channel === 'email' ? '📧 Email' : '💬 SMS'}
    </span>
  );
}

export function ChatLog({ messages, loading, error, onSend }: ChatLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    const msg = text.trim();
    if (!msg || !onSend) return;
    setSending(true);
    setText('');
    try {
      await onSend(msg);
    } catch (e) {
      console.error('Send failed:', e);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-3 p-4 overflow-y-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
              <div className="w-48 h-12 bg-gray-800 rounded-2xl animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-4 flex items-center justify-center">
          <p className="text-red-400 text-sm text-center">Failed to load messages: {error}</p>
        </div>
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 p-8 flex flex-col items-center justify-center text-gray-500">
          <span className="text-4xl block mb-2">💬</span>
          <p>No messages yet</p>
        </div>
        {onSend && (
          <ComposeBar text={text} setText={setText} onSend={handleSend} sending={sending} onKeyDown={handleKeyDown} />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg, i) => {
          const isOutbound = msg.direction === 'outbound';
          return (
            <div key={i} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
              <div className={`
                max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
                ${isOutbound
                  ? 'bg-indigo-600 text-white rounded-br-sm'
                  : 'bg-gray-800 text-gray-100 rounded-bl-sm'}
              `}>
                {msg.text}
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-gray-600">
                <span>{formatTime(msg.ts)}</span>
                <ChannelBadge channel={msg.channel || msg.type} />
                {isOutbound && msg.agent && (
                  <span className="text-gray-600">· {msg.agent}</span>
                )}
                {!isOutbound && msg.category && (
                  <span className={`inline-flex px-1.5 py-0.5 rounded text-xs ${categoryClass(msg.category)}`}>
                    {msg.category}
                  </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      {onSend && (
        <ComposeBar text={text} setText={setText} onSend={handleSend} sending={sending} onKeyDown={handleKeyDown} />
      )}
    </div>
  );
}

function ComposeBar({
  text, setText, onSend, sending, onKeyDown,
}: {
  text: string;
  setText: (v: string) => void;
  onSend: () => void;
  sending: boolean;
  onKeyDown: (e: React.KeyboardEvent) => void;
}) {
  return (
    <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-800 bg-gray-900/50">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Type a message… (Enter to send)"
        rows={1}
        className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none max-h-32"
        style={{ minHeight: '40px' }}
      />
      <button
        onClick={onSend}
        disabled={!text.trim() || sending}
        className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
      >
        <Send size={18} />
      </button>
    </div>
  );
}

import { useState, useRef, useEffect } from 'react';
import { X, Send, Hash, Circle } from 'lucide-react';
import type { AgentChatMessage } from '../types';

interface AgentChatProps {
  open: boolean;
  onClose: () => void;
}

type Channel = 'manager' | 'jacob' | 'angie';

const CHANNELS: { id: Channel; label: string; description: string; color: string; online: boolean }[] = [
  { id: 'manager', label: 'agent-manager', description: 'General commands & status', color: 'text-blue-400', online: true },
  { id: 'jacob', label: 'jacob', description: 'Talk directly to Jacob', color: 'text-green-400', online: true },
  { id: 'angie', label: 'angie', description: 'Talk directly to Angie', color: 'text-purple-400', online: false },
];

function agentReply(channel: Channel, message: string): string {
  const msg = message.toLowerCase();
  if (channel === 'manager') {
    if (msg.includes('status')) return '📊 All systems operational. Jacob is active (23 messages sent today). Angie is offline. Database healthy.';
    if (msg.includes('jacob')) return '🤖 Jacob is currently running. He\'s sent 23 messages today with a 12% reply rate.';
    if (msg.includes('angie')) return '🤖 Angie is currently offline. Last active 2 hours ago.';
    if (msg.includes('stats') || msg.includes('report')) return '📈 Today: 23 SMS sent, 3 replies, 0 docs. Reply rate: 13%. Hot leads: 5.';
    return '✅ Got it. Command received. Let me check that for you.';
  }
  if (channel === 'jacob') {
    if (msg.includes('stop') || msg.includes('pause')) return '⏸ Pausing outreach sequences. No more messages will be sent until you resume.';
    if (msg.includes('resume') || msg.includes('start')) return '▶️ Resuming outreach. Starting with the next contact in queue.';
    if (msg.includes('how many') || msg.includes('sent')) return '📤 I\'ve sent 23 messages today. Currently at contact #847 in the queue.';
    if (msg.includes('next')) return '➡️ Next contact in queue: Business Owner from Miami, FL. Ready to send.';
    return `📱 Understood. I'll handle that right away.`;
  }
  if (channel === 'angie') {
    return '😴 Angie is currently offline. She was last active 2 hours ago. You can still send her commands and she\'ll process them when she comes back online.';
  }
  return 'Message received.';
}

function formatTs(d: Date): string {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

export function AgentChat({ open, onClose }: AgentChatProps) {
  const [channel, setChannel] = useState<Channel>('manager');
  const [histories, setHistories] = useState<Record<Channel, AgentChatMessage[]>>({
    manager: [
      {
        id: '1', channel: 'manager', role: 'agent', ts: new Date(Date.now() - 60000),
        text: '👋 Agent Manager online. Jacob is active, Angie is offline. Type "status" for a full report.',
      },
    ],
    jacob: [
      {
        id: '2', channel: 'jacob', role: 'agent', ts: new Date(Date.now() - 120000),
        text: '🤖 Jacob here. I\'m currently running outreach. Sent 23 messages today. What do you need?',
      },
    ],
    angie: [
      {
        id: '3', channel: 'angie', role: 'agent', ts: new Date(Date.now() - 7200000),
        text: '😴 Angie is offline. Last seen 2 hours ago.',
      },
    ],
  });
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages = histories[channel];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, channel]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;

    const userMsg: AgentChatMessage = {
      id: Date.now().toString(),
      channel,
      role: 'user',
      text,
      ts: new Date(),
    };

    setHistories((prev) => ({
      ...prev,
      [channel]: [...prev[channel], userMsg],
    }));
    setInput('');
    setTyping(true);

    const delay = 800 + Math.random() * 800;
    setTimeout(() => {
      const reply = agentReply(channel, text);
      const agentMsg: AgentChatMessage = {
        id: (Date.now() + 1).toString(),
        channel,
        role: 'agent',
        text: reply,
        ts: new Date(),
      };
      setHistories((prev) => ({
        ...prev,
        [channel]: [...prev[channel], agentMsg],
      }));
      setTyping(false);
    }, delay);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeChannel = CHANNELS.find((c) => c.id === channel)!;

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Panel — slides in from right on desktop, bottom on mobile */}
      <div
        className={`
          fixed z-50 bg-gray-900 border-gray-800 flex flex-col transition-all duration-300 ease-in-out
          md:inset-y-0 md:right-0 md:w-96 md:border-l
          inset-x-0 bottom-0 rounded-t-2xl border-t
          ${open
            ? 'md:translate-x-0 translate-y-0'
            : 'md:translate-x-full translate-y-full'}
        `}
        style={{ maxHeight: open ? '100vh' : undefined }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-800 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-600/80 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
            AI
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Agent Chat</p>
            <p className="text-xs text-gray-500">Discord-style agent interface</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-gray-800">
            <X size={16} />
          </button>
        </div>

        {/* Channel list */}
        <div className="flex-shrink-0 border-b border-gray-800 px-2 py-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-2 mb-1">Channels</p>
          {CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                channel === ch.id ? 'bg-indigo-600/20 text-indigo-300' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Hash size={14} className="flex-shrink-0 text-gray-600" />
              <span className="flex-1 text-left font-medium">{ch.label}</span>
              <Circle
                size={8}
                className={ch.online ? 'text-green-400 fill-green-400' : 'text-gray-600 fill-gray-600'}
              />
            </button>
          ))}
        </div>

        {/* Channel header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 flex-shrink-0 bg-gray-900/50">
          <Hash size={14} className="text-gray-500" />
          <span className={`text-sm font-semibold ${activeChannel.color}`}>{activeChannel.label}</span>
          <span className="text-xs text-gray-600">— {activeChannel.description}</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div key={msg.id} className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                  isUser
                    ? 'bg-gradient-to-br from-purple-500 to-indigo-600 text-white'
                    : msg.channel === 'jacob'
                    ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white'
                    : msg.channel === 'angie'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                }`}>
                  {isUser ? 'JC' : msg.channel === 'jacob' ? 'JA' : msg.channel === 'angie' ? 'AN' : 'AM'}
                </div>

                <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} min-w-0 max-w-[80%]`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={`text-xs font-medium ${isUser ? 'text-purple-400' : activeChannel.color}`}>
                      {isUser ? 'You' : activeChannel.label}
                    </span>
                    <span className="text-xs text-gray-600">{formatTs(msg.ts)}</span>
                  </div>
                  <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-sm'
                      : 'bg-gray-800 text-gray-100 rounded-tl-sm'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })}

          {typing && (
            <div className="flex gap-2.5">
              <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold ${
                channel === 'jacob'
                  ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white'
                  : channel === 'angie'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
              }`}>
                {channel === 'jacob' ? 'JA' : channel === 'angie' ? 'AN' : 'AM'}
              </div>
              <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="flex items-end gap-2 px-4 py-3 border-t border-gray-800 flex-shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Message #${activeChannel.label}…`}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="p-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </>
  );
}

import { useState, useRef, useEffect } from 'react';
import { X, Send, Hash, Circle, Brain } from 'lucide-react';
import type { AgentChatMessage } from '../types';

interface AgentChatProps {
  open: boolean;
  onClose: () => void;
  agentName?: string;   // tenant's agent name
  agentTitle?: string;  // tenant's agent title
}

type Channel = 'manager' | 'jacob' | 'angie' | 'brain';

const CHANNELS: { id: Channel; label: string; description: string; color: string; online: boolean; special?: boolean }[] = [
  { id: 'brain', label: 'brain', description: 'Configure your workspace with plain English', color: 'text-amber-400', online: true, special: true },
  { id: 'manager', label: 'agent-manager', description: 'General commands & status', color: 'text-blue-400', online: true },
  { id: 'jacob', label: 'jacob', description: 'Talk directly to Jacob', color: 'text-green-400', online: true },
  { id: 'angie', label: 'angie', description: 'Talk directly to Angie', color: 'text-purple-400', online: false },
];

/** Read preferences from localStorage */
function getPrefs(): Record<string, unknown> {
  try {
    return JSON.parse(localStorage.getItem('user_preferences') || '{}');
  } catch {
    return {};
  }
}

/** Write preferences to localStorage */
function setPrefs(update: Record<string, unknown>): void {
  try {
    const current = getPrefs();
    localStorage.setItem('user_preferences', JSON.stringify({ ...current, ...update }));
  } catch {}
}

/** Brain channel: parse natural language commands and update user_preferences */
function brainReply(message: string): string {
  const msg = message.toLowerCase();
  const prefs = getPrefs();

  // Layout changes
  if (msg.includes('stats') && (msg.includes('top') || msg.includes('first'))) {
    const widgetOrder = ['stats', ...(Array.isArray(prefs.widgetOrder) ? (prefs.widgetOrder as string[]).filter(w => w !== 'stats') : ['contacts', 'agents'])];
    setPrefs({ widgetOrder });
    return '✅ Done! Stats moved to the top of your dashboard. Refresh to see the change.';
  }
  if (msg.includes('contacts') && (msg.includes('first') || msg.includes('top'))) {
    setPrefs({ layout: 'contacts_first' });
    return '✅ Layout updated to Contacts First. Your dashboard will show the contact grid front and center.';
  }
  if (msg.includes('messages') && (msg.includes('first') || msg.includes('inbox'))) {
    setPrefs({ layout: 'messages_first' });
    return '✅ Switched to Messages First layout. Your inbox is now the main view.';
  }
  if (msg.includes('pipeline') && (msg.includes('first') || msg.includes('kanban'))) {
    setPrefs({ layout: 'pipeline_first' });
    return '✅ Pipeline/Kanban view is now your default layout.';
  }
  if (msg.includes('overview') && msg.includes('first')) {
    setPrefs({ layout: 'overview_first' });
    return '✅ Overview First layout restored — stats, pipeline, and recent activity.';
  }

  // Tone changes
  if (msg.includes('tone') || msg.includes('style')) {
    const toneMap: Record<string, string> = {
      'casual': 'casual', 'friendly': 'casual',
      'professional': 'professional', 'formal': 'professional',
      'urgent': 'urgent', 'aggressive': 'urgent',
      'empathetic': 'empathetic', 'warm': 'empathetic',
      'bold': 'bold', 'confident': 'bold',
    };
    for (const [keyword, tone] of Object.entries(toneMap)) {
      if (msg.includes(keyword)) {
        setPrefs({ agentTone: tone });
        return `✅ Agent tone updated to **${tone}**. New messages will reflect this style.`;
      }
    }
    return '🤔 I can set the tone to: professional, casual, urgent, empathetic, or bold. Which one?';
  }

  // Filter changes
  if (msg.includes('hot leads') || msg.includes('only hot') || msg.includes('show hot')) {
    const filters = (prefs.filters as Record<string, unknown>) || {};
    setPrefs({ filters: { ...filters, default: 'hot' } });
    return '✅ Default filter set to **Hot Leads**. Your dashboard will show hot leads by default.';
  }
  if (msg.includes('all leads') || msg.includes('show all') || msg.includes('remove filter')) {
    const filters = (prefs.filters as Record<string, unknown>) || {};
    setPrefs({ filters: { ...filters, default: 'all' } });
    return '✅ Filter cleared. Showing all leads by default.';
  }
  if (msg.includes('new leads') || msg.includes('fresh leads')) {
    const filters = (prefs.filters as Record<string, unknown>) || {};
    setPrefs({ filters: { ...filters, default: 'new' } });
    return '✅ Default filter set to **New Leads**.';
  }

  // Capability toggles
  if (msg.includes('voice') && (msg.includes('off') || msg.includes('disable') || msg.includes('turn off'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, voiceNotes: false } });
    return '✅ Voice notes disabled. Your agent will no longer send voice messages.';
  }
  if (msg.includes('voice') && (msg.includes('on') || msg.includes('enable') || msg.includes('turn on'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, voiceNotes: true } });
    return '✅ Voice notes enabled! Your agent will now send voice messages when appropriate.';
  }
  if ((msg.includes('sms') || msg.includes('text')) && (msg.includes('off') || msg.includes('disable'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, sms: false } });
    return '⚠️ SMS outreach disabled. Your agent will stop sending text messages.';
  }
  if ((msg.includes('sms') || msg.includes('text')) && (msg.includes('on') || msg.includes('enable'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, sms: true } });
    return '✅ SMS outreach re-enabled. Your agent will resume sending messages.';
  }
  if (msg.includes('auto') && msg.includes('reply') && (msg.includes('off') || msg.includes('disable'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, autoReply: false } });
    return '✅ Auto-reply disabled. Incoming messages will wait for manual response.';
  }
  if (msg.includes('auto') && msg.includes('reply') && (msg.includes('on') || msg.includes('enable'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, autoReply: true } });
    return '✅ Auto-reply enabled. Your agent will respond to leads automatically.';
  }
  if (msg.includes('notifications') && (msg.includes('off') || msg.includes('disable'))) {
    setPrefs({ notificationPrefs: { smsReply: false, docReceived: false, dealUpdate: false } });
    return '✅ All notifications muted.';
  }
  if (msg.includes('notifications') && (msg.includes('on') || msg.includes('enable'))) {
    setPrefs({ notificationPrefs: { smsReply: true, docReceived: true, dealUpdate: true } });
    return '✅ All notifications enabled. You\'ll be alerted for replies, documents, and deal updates.';
  }

  // Show current preferences
  if (msg.includes('settings') || msg.includes('preferences') || msg.includes('config') || msg.includes('what') && msg.includes('set')) {
    const current = getPrefs();
    const caps = (current.agentCapabilities as Record<string, unknown>) || {};
    return `📋 **Current Settings:**\n` +
      `• Layout: ${current.layout || 'overview_first'}\n` +
      `• Tone: ${current.agentTone || 'professional'}\n` +
      `• Default filter: ${(current.filters as any)?.default || 'all'}\n` +
      `• SMS: ${caps.sms !== false ? '✅' : '❌'} | Email: ${caps.email !== false ? '✅' : '❌'} | Auto-reply: ${caps.autoReply !== false ? '✅' : '❌'}\n` +
      `• Voice notes: ${caps.voiceNotes ? '✅' : '❌'} | Call bridge: ${caps.callBridge ? '✅' : '❌'}`;
  }

  // Help
  if (msg.includes('help') || msg.includes('what can') || msg.includes('commands')) {
    return `🧠 **Brain Channel — What I can do:**\n\n` +
      `**Layout**\n` +
      `• "Move stats to the top"\n` +
      `• "Switch to contacts first"\n` +
      `• "Show pipeline view"\n\n` +
      `**Agent Tone**\n` +
      `• "Change tone to casual"\n` +
      `• "Make agent more professional"\n\n` +
      `**Filters**\n` +
      `• "Show only hot leads"\n` +
      `• "Show all leads"\n\n` +
      `**Capabilities**\n` +
      `• "Turn off voice notes"\n` +
      `• "Enable auto-reply"\n` +
      `• "Disable notifications"\n\n` +
      `**Info**\n` +
      `• "Show my settings"`;
  }

  return `🧠 I didn't quite catch that. Try:\n• "Move stats to the top"\n• "Change tone to casual"\n• "Show only hot leads"\n• "Turn off voice notes"\n\nOr type **help** to see all commands.`;
}

function agentReply(channel: Channel, message: string): string {
  if (channel === 'brain') return brainReply(message);
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

export function AgentChat({ open, onClose, agentName, agentTitle }: AgentChatProps) {
  // Build tenant-aware channels: replace jacob/angie with tenant agent if provided
  const agentLabel = agentName ? agentName.toLowerCase().replace(/\s+/g, '-') : 'jacob';
  const agentDisplay = agentName || 'jacob';
  const agentDesc = agentTitle ? `Talk to ${agentName}` : 'Talk directly to Jacob';

  const TENANT_CHANNELS = [
    { id: 'brain' as Channel, label: 'brain', description: 'Configure your workspace with plain English', color: 'text-amber-400', online: true, special: true },
    { id: 'manager' as Channel, label: 'agent-manager', description: 'General commands & status', color: 'text-blue-400', online: true },
    { id: 'jacob' as Channel, label: agentLabel, description: agentDesc, color: 'text-green-400', online: true },
    { id: 'angie' as Channel, label: 'angie', description: 'Talk directly to Angie', color: 'text-purple-400', online: false },
  ];

  const [channel, setChannel] = useState<Channel>('brain');
  const [histories, setHistories] = useState<Record<Channel, AgentChatMessage[]>>({
    brain: [
      {
        id: '0', channel: 'brain', role: 'agent', ts: new Date(Date.now() - 30000),
        text: `🧠 Brain channel online. Talk to me in plain English to configure your workspace.\n\nExamples:\n• "Move stats to the top"\n• "Change tone to casual"\n• "Show only hot leads"\n• "Turn off voice notes"\n\nType **help** to see all commands.`,
      },
    ],
    manager: [
      {
        id: '1', channel: 'manager', role: 'agent', ts: new Date(Date.now() - 60000),
        text: `👋 Agent Manager online. ${agentDisplay} is active. Type "status" for a full report.`,
      },
    ],
    jacob: [
      {
        id: '2', channel: 'jacob', role: 'agent', ts: new Date(Date.now() - 120000),
        text: `🤖 ${agentDisplay} here. I'm currently running outreach. Sent 23 messages today. What do you need?`,
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

  const handleSend = async () => {
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

    if (channel === 'brain') {
      // Call real Bedrock Claude via API
      try {
        const configStr = localStorage.getItem('user_preferences') || '{}';
        const config = JSON.parse(configStr);
        const res = await fetch('/app/api/v1/brain/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, userId: 'user', config }),
        });
        const data = await res.json();
        const reply = data.reply || data.error || 'Hmm, let me think about that...';
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
      } catch {
        const agentMsg: AgentChatMessage = {
          id: (Date.now() + 1).toString(),
          channel,
          role: 'agent',
          text: 'Connection issue — try again in a moment.',
          ts: new Date(),
        };
        setHistories((prev) => ({
          ...prev,
          [channel]: [...prev[channel], agentMsg],
        }));
      }
      setTyping(false);
    } else {
      // Other channels: use static replies for now
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
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const activeChannel = TENANT_CHANNELS.find((c) => c.id === channel)!;

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
          {TENANT_CHANNELS.map((ch) => (
            <button
              key={ch.id}
              onClick={() => setChannel(ch.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                channel === ch.id
                  ? ch.special ? 'bg-amber-600/20 text-amber-300' : 'bg-indigo-600/20 text-indigo-300'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {ch.special ? (
                <Brain size={14} className="flex-shrink-0 text-amber-500" />
              ) : (
                <Hash size={14} className="flex-shrink-0 text-gray-600" />
              )}
              <span className="flex-1 text-left font-medium">{ch.label}</span>
              {ch.special && <span className="text-xs text-amber-600 font-medium">AI</span>}
              <Circle
                size={8}
                className={ch.online ? 'text-green-400 fill-green-400' : 'text-gray-600 fill-gray-600'}
              />
            </button>
          ))}
        </div>

        {/* Channel header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 flex-shrink-0 bg-gray-900/50">
          {activeChannel.special ? (
            <Brain size={14} className="text-amber-500" />
          ) : (
            <Hash size={14} className="text-gray-500" />
          )}
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
                    : msg.channel === 'brain'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                    : msg.channel === 'jacob'
                    ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white'
                    : msg.channel === 'angie'
                    ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                    : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                }`}>
                  {isUser ? 'JC' : msg.channel === 'brain' ? '🧠' : msg.channel === 'jacob' ? 'JA' : msg.channel === 'angie' ? 'AN' : 'AM'}
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
                channel === 'brain'
                  ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
                  : channel === 'jacob'
                  ? 'bg-gradient-to-br from-green-500 to-teal-600 text-white'
                  : channel === 'angie'
                  ? 'bg-gradient-to-br from-purple-500 to-pink-600 text-white'
                  : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
              }`}>
                {channel === 'brain' ? '🧠' : channel === 'jacob' ? 'JA' : channel === 'angie' ? 'AN' : 'AM'}
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

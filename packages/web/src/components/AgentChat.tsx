import React from 'react';
import { useState, useRef, useEffect } from 'react';
import { X, Send, Hash, Circle, Brain } from 'lucide-react';
import type { AgentChatMessage } from '../types';
import { usePreferences } from '../context/PreferencesContext';
import type { UserPreferences } from '../context/PreferencesContext';

interface BrainAction {
  type: 'navigate' | 'update_preferences' | 'refresh_stats' | 'show_contact' | 'none';
  payload?: Record<string, unknown>;
}

interface AgentChatProps {
  open: boolean;
  onClose: () => void;
  agentName?: string;
  agentTitle?: string;
  onNavigate?: (page: string, filter?: string) => void;
  onRefreshStats?: () => void;
  onUpdatePreferences?: (partial: Partial<UserPreferences>) => void;
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

/** Write preferences to localStorage AND capture what was written */
let _lastPrefsDelta: Record<string, unknown> | null = null;

function setPrefs(update: Record<string, unknown>): void {
  try {
    _lastPrefsDelta = update;
    const current = getPrefs();
    localStorage.setItem('user_preferences', JSON.stringify({ ...current, ...update }));
  } catch {}
}

/** Brain channel: parse natural language commands and update user_preferences */
function brainReply(message: string): string {
  const msg = message.toLowerCase();
  const prefs = getPrefs();

  // Theme changes
  if (msg.includes('light mode') || msg.includes('light theme') || msg.includes('white theme')) {
    setPrefs({ theme: 'light' });
    return '☀️ Switched to **light mode**! The dashboard is now bright and clean.';
  }
  if (msg.includes('dark mode') || msg.includes('dark theme')) {
    setPrefs({ theme: 'dark' });
    return '🌙 Switched to **dark mode**.';
  }
  if (msg.includes('midnight') && (msg.includes('theme') || msg.includes('mode'))) {
    setPrefs({ theme: 'midnight' });
    return '🌑 **Midnight theme** activated — deep black with purple accents.';
  }
  if (msg.includes('ocean') && (msg.includes('theme') || msg.includes('mode') || msg.includes('vibe'))) {
    setPrefs({ theme: 'ocean' });
    return '🌊 **Ocean theme** activated — deep teal with cyan accents.';
  }
  if (msg.includes('sunset') && (msg.includes('theme') || msg.includes('mode') || msg.includes('vibe'))) {
    setPrefs({ theme: 'sunset' });
    return '🌅 **Sunset vibes** activated — warm amber tones.';
  }

  // Invert colors
  if ((msg.includes('invert') || msg.includes('flip')) && (msg.includes('color') || msg.includes('colour') || msg.includes('dashboard') || msg.includes('screen'))) {
    const current = !prefs.invertColors;
    setPrefs({ invertColors: current });
    return current ? '🔄 Colors **inverted**! Things look interesting now.' : '🔄 Colors restored to normal.';
  }

  // Font size
  if (msg.includes('bigger text') || msg.includes('larger text') || msg.includes('increase font') || msg.includes('font larger') || msg.includes('font bigger')) {
    setPrefs({ fontSize: 'large' });
    return '🔡 Font size set to **large**. Easier to read!';
  }
  if (msg.includes('smaller text') || msg.includes('decrease font') || msg.includes('font smaller')) {
    setPrefs({ fontSize: 'small' });
    return '🔡 Font size set to **small**.';
  }
  if (msg.includes('normal text') || msg.includes('reset font') || msg.includes('medium font')) {
    setPrefs({ fontSize: 'medium' });
    return '🔡 Font size reset to **medium**.';
  }

  // Compact mode
  if (msg.includes('compact mode') || msg.includes('compact view') || msg.includes('condense')) {
    setPrefs({ compactMode: true });
    return '📦 **Compact mode** on — cards are smaller, more fits on screen.';
  }
  if ((msg.includes('turn off compact') || msg.includes('disable compact') || msg.includes('normal mode') || msg.includes('full size'))) {
    setPrefs({ compactMode: false });
    return '📦 Compact mode **off** — back to full card view.';
  }

  // Sidebar collapse
  if (msg.includes('collapse sidebar') || msg.includes('hide sidebar') || msg.includes('minimize sidebar')) {
    setPrefs({ sidebarCollapsed: true });
    return '◀️ Sidebar **collapsed** — icon-only mode for more screen space.';
  }
  if (msg.includes('expand sidebar') || msg.includes('show sidebar') || msg.includes('open sidebar')) {
    setPrefs({ sidebarCollapsed: false });
    return '▶️ Sidebar **expanded**.';
  }

  // Accent color
  const accentMatch = msg.match(/accent (?:to |color |colour )?(green|blue|purple|red|orange|pink|teal|yellow|cyan|indigo)/);
  if (accentMatch || (msg.includes('change accent') || msg.includes('accent color') || msg.includes('accent colour'))) {
    const colorMap: Record<string, string> = {
      green: '#10b981', blue: '#3b82f6', purple: '#8b5cf6',
      red: '#ef4444', orange: '#f97316', pink: '#ec4899',
      teal: '#14b8a6', yellow: '#eab308', cyan: '#06b6d4', indigo: '#6366f1',
    };
    const colorName = accentMatch?.[1];
    const hex = colorName ? colorMap[colorName] : null;
    if (hex) {
      setPrefs({ accentColor: hex });
      return `🎨 Accent color changed to **${colorName}** (${hex}).`;
    }
    // Check for hex directly
    const hexMatch = msg.match(/#[0-9a-f]{6}/i);
    if (hexMatch) {
      setPrefs({ accentColor: hexMatch[0] });
      return `🎨 Accent color set to **${hexMatch[0]}**.`;
    }
    return '🎨 I can set the accent to: green, blue, purple, red, orange, pink, teal, yellow, cyan, or indigo. Which one?';
  }

  // Layout changes
  if (msg.includes('stats') && (msg.includes('top') || msg.includes('first'))) {
    const widgetOrder = ['stats', ...(Array.isArray(prefs.widgetOrder) ? (prefs.widgetOrder as string[]).filter(w => w !== 'stats') : ['contacts', 'agents'])];
    setPrefs({ widgetOrder });
    return '✅ Stats moved to the top of your dashboard.';
  }
  if (msg.includes('contacts') && (msg.includes('first') || msg.includes('top'))) {
    setPrefs({ layout: 'contacts_first' });
    return '✅ Layout updated to **Contacts First**. Your dashboard shows the contact grid front and center.';
  }
  if (msg.includes('messages') && (msg.includes('first') || msg.includes('inbox'))) {
    setPrefs({ layout: 'messages_first' });
    return '✅ Switched to **Messages First** layout. Your inbox is now the main view.';
  }
  if (msg.includes('pipeline') && (msg.includes('first') || msg.includes('kanban'))) {
    setPrefs({ layout: 'pipeline_first' });
    return '✅ **Pipeline/Kanban** view is now your default layout.';
  }
  if (msg.includes('overview') && msg.includes('first')) {
    setPrefs({ layout: 'overview_first' });
    return '✅ **Overview First** layout restored — stats, pipeline, and recent activity.';
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
    setPrefs({ filters: { ...filters, default: 'hot' }, defaultFilter: 'hot' });
    return '✅ Default filter set to **Hot Leads**.';
  }
  if (msg.includes('all leads') || msg.includes('show all') || msg.includes('remove filter')) {
    const filters = (prefs.filters as Record<string, unknown>) || {};
    setPrefs({ filters: { ...filters, default: 'all' }, defaultFilter: 'all' });
    return '✅ Filter cleared. Showing all leads by default.';
  }
  if (msg.includes('new leads') || msg.includes('fresh leads')) {
    const filters = (prefs.filters as Record<string, unknown>) || {};
    setPrefs({ filters: { ...filters, default: 'new' }, defaultFilter: 'new' });
    return '✅ Default filter set to **New Leads**.';
  }

  // Capability toggles
  if (msg.includes('voice') && (msg.includes('off') || msg.includes('disable') || msg.includes('turn off'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, voiceNotes: false } });
    return '✅ Voice notes disabled.';
  }
  if (msg.includes('voice') && (msg.includes('on') || msg.includes('enable') || msg.includes('turn on'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, voiceNotes: true } });
    return '✅ Voice notes enabled!';
  }
  if ((msg.includes('sms') || msg.includes('text')) && (msg.includes('off') || msg.includes('disable'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, sms: false } });
    return '⚠️ SMS outreach disabled.';
  }
  if ((msg.includes('sms') || msg.includes('text')) && (msg.includes('on') || msg.includes('enable'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, sms: true } });
    return '✅ SMS outreach re-enabled.';
  }
  if (msg.includes('auto') && msg.includes('reply') && (msg.includes('off') || msg.includes('disable'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, autoReply: false } });
    return '✅ Auto-reply disabled.';
  }
  if (msg.includes('auto') && msg.includes('reply') && (msg.includes('on') || msg.includes('enable'))) {
    const caps = (prefs.agentCapabilities as Record<string, unknown>) || {};
    setPrefs({ agentCapabilities: { ...caps, autoReply: true } });
    return '✅ Auto-reply enabled.';
  }
  if (msg.includes('notifications') && (msg.includes('off') || msg.includes('disable'))) {
    setPrefs({ notificationPrefs: { smsReply: false, docReceived: false, dealUpdate: false } });
    return '✅ All notifications muted.';
  }
  if (msg.includes('notifications') && (msg.includes('on') || msg.includes('enable'))) {
    setPrefs({ notificationPrefs: { smsReply: true, docReceived: true, dealUpdate: true } });
    return '✅ All notifications enabled.';
  }

  // Reset all preferences
  if (msg.includes('reset') && (msg.includes('preference') || msg.includes('setting') || msg.includes('theme') || msg.includes('everything'))) {
    localStorage.removeItem('user_preferences');
    return '🔄 All preferences **reset to defaults**. Reload the page to see the changes take effect.';
  }

  // Show current preferences
  if (msg.includes('settings') || msg.includes('preferences') || msg.includes('config') || (msg.includes('what') && msg.includes('set'))) {
    const current = getPrefs();
    const caps = (current.agentCapabilities as Record<string, unknown>) || {};
    return `📋 **Current Settings:**\n` +
      `• Theme: ${current.theme || 'dark'}\n` +
      `• Layout: ${current.layout || 'overview_first'}\n` +
      `• Font size: ${current.fontSize || 'medium'}\n` +
      `• Compact mode: ${current.compactMode ? '✅' : '❌'}\n` +
      `• Sidebar: ${current.sidebarCollapsed ? 'collapsed' : 'expanded'}\n` +
      `• Inverted: ${current.invertColors ? '✅' : '❌'}\n` +
      `• Accent: ${current.accentColor || '#6366f1'}\n` +
      `• Tone: ${current.agentTone || 'professional'}\n` +
      `• Default filter: ${(current.filters as any)?.default || 'all'}\n` +
      `• SMS: ${caps.sms !== false ? '✅' : '❌'} | Auto-reply: ${caps.autoReply !== false ? '✅' : '❌'}`;
  }

  // Help
  if (msg.includes('help') || msg.includes('what can') || msg.includes('commands')) {
    return `🧠 **Brain Channel — What I can do:**\n\n` +
      `**Themes**\n` +
      `• "Light mode" / "Dark mode" / "Ocean theme" / "Sunset vibes" / "Midnight"\n\n` +
      `**Visuals**\n` +
      `• "Invert colors" • "Bigger text" • "Compact mode" • "Collapse sidebar"\n` +
      `• "Change accent to green/blue/purple/teal"\n\n` +
      `**Layout**\n` +
      `• "Contacts first" • "Messages first" • "Pipeline first" • "Overview first"\n\n` +
      `**Agent Tone**\n` +
      `• "Change tone to casual/professional/urgent/empathetic"\n\n` +
      `**Filters**\n` +
      `• "Show only hot leads" • "Show all leads"\n\n` +
      `**Capabilities**\n` +
      `• "Turn off voice notes" • "Enable auto-reply" • "Disable SMS"\n\n` +
      `**Info**\n` +
      `• "Show my settings" • "Reset preferences"`;
  }

  return `🧠 I didn't quite catch that. Try:\n• "Ocean theme"\n• "Invert colors"\n• "Compact mode"\n• "Bigger text"\n• "Contacts first"\n\nOr type **help** to see all commands.`;
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

export function AgentChat({ open, onClose, agentName, agentTitle, onNavigate, onRefreshStats, onUpdatePreferences }: AgentChatProps) {
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
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = React.useRef<any>(null);

  const startVoice = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;
    if (recognitionRef.current) return; // already recording
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    let finalTranscript = '';
    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setInput(finalTranscript + interim);
    };
    recognition.onerror = () => { setIsRecording(false); recognitionRef.current = null; };
    recognition.onend = () => { setIsRecording(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopVoice = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsRecording(false);
    }
  };
  const [typing, setTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  /** Handle action instructions returned by the Brain operator */
  function handleBrainAction(action: BrainAction) {
    try {
      switch (action.type) {
        case 'navigate': {
          const page = action.payload?.page as string;
          const filter = action.payload?.filter as string | undefined;
          if (onNavigate && page) {
            onNavigate(page, filter);
          }
          break;
        }
        case 'update_preferences': {
          if (onUpdatePreferences && action.payload) {
            // Instant update via context — no page reload needed!
            onUpdatePreferences(action.payload as Partial<UserPreferences>);
          } else {
            // Fallback: merge into localStorage (context will pick up on next render)
            const current = JSON.parse(localStorage.getItem('user_preferences') || '{}');
            const updated = { ...current, ...action.payload };
            localStorage.setItem('user_preferences', JSON.stringify(updated));
          }
          break;
        }
        case 'refresh_stats': {
          if (onRefreshStats) onRefreshStats();
          break;
        }
        case 'show_contact': {
          const phone = action.payload?.contactPhone as string;
          if (onNavigate && phone) {
            onNavigate('contacts', phone);
          }
          break;
        }
        default:
          break;
      }
    } catch (e) {
      // Non-critical — action failures shouldn't break the chat
      console.warn('Brain action failed', action, e);
    }
  }

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
      // Call real Bedrock Claude via API (with tool use — full operator mode)
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

        // Handle any frontend actions returned by the Brain
        if (data.action && data.action.type !== 'none') {
          handleBrainAction(data.action);
        }

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
        // API unavailable — fall back to local brain reply
        _lastPrefsDelta = null;
        const reply = brainReply(text);
        // If brainReply wrote preferences, propagate to context
        if (_lastPrefsDelta && onUpdatePreferences) {
          onUpdatePreferences(_lastPrefsDelta as Partial<UserPreferences>);
          _lastPrefsDelta = null;
        }
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
          <button
            onTouchStart={(e) => { e.preventDefault(); startVoice(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopVoice(); }}
            onMouseDown={() => startVoice()}
            onMouseUp={() => stopVoice()}
            onMouseLeave={() => stopVoice()}
            id="mic-btn"
            className={`p-2.5 rounded-xl transition-all select-none ${isRecording ? 'bg-red-600 animate-pulse scale-110' : 'bg-gray-700 hover:bg-gray-600'} text-white`}
            title="Hold to speak"
          >
            {isRecording ? '🔴' : '🎤'}
          </button>
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

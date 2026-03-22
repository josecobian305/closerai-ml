import { useState, useEffect, useRef, useCallback } from 'react';
import { Phone, PhoneOff, Mic, MicOff, MessageSquare, Send, X, ChevronDown, User } from 'lucide-react';

interface SoftphoneProps {
  phone?: string;
  name?: string;
  onClose?: () => void;
}

type CallState = 'idle' | 'connecting' | 'calling' | 'active' | 'ended';

interface Agent {
  id: string;
  phone: string;
  name: string;
}

interface RecentCall {
  to: string;
  name?: string;
  agent: string;
  duration: number;
  ts: string;
}

const AGENTS: Agent[] = [
  { id: 'jose', phone: '+17862804399', name: 'Jose' },
  { id: 'ed', phone: '+16463728300', name: 'Ed' },
];

const API_BASE = typeof window !== 'undefined' && window.location.hostname === 'closerai.apipay.cash'
  ? '/api/v1/phone'
  : '/app/api/v1/phone';

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function formatPhone(p: string): string {
  const d = p.replace(/\D/g, '');
  if (d.length === 11 && d[0] === '1') {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  return p;
}

export function Softphone({ phone, name, onClose }: SoftphoneProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent>(AGENTS[0]);
  const [smsText, setSmsText] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsStatus, setSmsStatus] = useState<string | null>(null);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [showSms, setShowSms] = useState(false);
  const [callSid, setCallSid] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0);

  // Load recent calls from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('softphone_recent');
      if (stored) setRecentCalls(JSON.parse(stored).slice(0, 5));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCall = useCallback(async () => {
    if (!phone) return;
    setCallState('connecting');
    try {
      const res = await fetch(`${API_BASE}/call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, agent: selectedAgent.id }),
      });
      const data = await res.json();
      if (data.success) {
        setCallSid(data.callSid);
        setCallState('calling');
        // Simulate connection after a delay (Twilio webhook handles actual connection)
        setTimeout(() => {
          setCallState('active');
          elapsedRef.current = 0;
          timerRef.current = setInterval(() => {
            elapsedRef.current += 1;
            setElapsed(elapsedRef.current);
          }, 1000);
        }, 3000);
      } else {
        setCallState('idle');
        alert(`Call failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setCallState('idle');
      console.error('Call error:', err);
    }
  }, [phone, selectedAgent]);

  const endCall = useCallback(() => {
    setCallState('ended');
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    // Save to recent calls
    const call: RecentCall = {
      to: phone || '',
      name,
      agent: selectedAgent.id,
      duration: elapsedRef.current,
      ts: new Date().toISOString(),
    };
    const updated = [call, ...recentCalls].slice(0, 5);
    setRecentCalls(updated);
    try { localStorage.setItem('softphone_recent', JSON.stringify(updated)); } catch { /* ignore */ }
    setTimeout(() => {
      setCallState('idle');
      setElapsed(0);
      setMuted(false);
      setCallSid(null);
    }, 2000);
  }, [phone, name, selectedAgent, recentCalls]);

  const sendSms = useCallback(async () => {
    if (!phone || !smsText.trim()) return;
    setSmsSending(true);
    setSmsStatus(null);
    try {
      const res = await fetch(`${API_BASE}/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: phone, message: smsText.trim(), agent: selectedAgent.id }),
      });
      const data = await res.json();
      if (data.success) {
        setSmsStatus(`Sent via ${data.provider}`);
        setSmsText('');
        setTimeout(() => setSmsStatus(null), 3000);
      } else {
        setSmsStatus(`Failed: ${data.error}`);
      }
    } catch (err) {
      setSmsStatus('Send failed');
    } finally {
      setSmsSending(false);
    }
  }, [phone, smsText, selectedAgent]);

  const stateColor: Record<CallState, string> = {
    idle: 'text-[var(--text-muted)]',
    connecting: 'text-yellow-400',
    calling: 'text-yellow-400',
    active: 'text-green-400',
    ended: 'text-[var(--text-muted)]',
  };

  const stateLabel: Record<CallState, string> = {
    idle: 'Ready',
    connecting: 'Connecting…',
    calling: `Ringing ${name || formatPhone(phone || '')}…`,
    active: `Active · ${formatElapsed(elapsed)}`,
    ended: 'Call ended',
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] overflow-hidden w-full">
      {/* Header */}
      <div className="bg-[var(--bg-elevated)] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-green-400" />
          <span className="text-sm font-semibold text-white">Softphone</span>
          <span className="text-xs text-[var(--text-muted)] ml-1">WebRTC</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white text-lg leading-none">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Agent Selector */}
      <div className="px-4 pt-3">
        <div className="flex gap-2">
          {AGENTS.map((a) => (
            <button
              key={a.id}
              onClick={() => setSelectedAgent(a)}
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                selectedAgent.id === a.id
                  ? 'bg-indigo-600/30 border border-indigo-500/50 text-indigo-300'
                  : 'bg-[var(--bg-elevated)] border border-transparent text-[var(--text-muted)] hover:text-white'
              }`}
            >
              <User size={12} />
              <div className="text-left">
                <div>{a.name}</div>
                <div className="opacity-60">{formatPhone(a.phone)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Contact info */}
      <div className="px-5 py-4 text-center">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xl font-bold mx-auto mb-2">
          {name?.[0]?.toUpperCase() || <Phone size={20} />}
        </div>
        <p className="text-white font-semibold">{name || 'Unknown'}</p>
        <p className="text-[var(--text-muted)] text-sm mt-0.5">{phone ? formatPhone(phone) : '—'}</p>
        <p className={`text-sm mt-2 font-medium ${stateColor[callState]} ${callState === 'calling' || callState === 'connecting' ? 'animate-pulse' : ''}`}>
          {stateLabel[callState]}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Caller ID: {selectedAgent.name} ({formatPhone(selectedAgent.phone)})
        </p>
      </div>

      {/* Active call controls */}
      {callState === 'active' && (
        <div className="flex justify-center gap-4 px-5 pb-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className={`p-3 rounded-full transition-colors ${muted ? 'bg-red-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-white'}`}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
        </div>
      )}

      {/* Main action button */}
      <div className="px-5 pb-3 mt-1">
        {(callState === 'idle' || callState === 'ended') && (
          <button onClick={startCall} disabled={!phone} className="w-full btn-success flex items-center justify-center gap-2 disabled:opacity-40">
            <Phone size={18} />
            Call {name || (phone ? formatPhone(phone) : '')}
          </button>
        )}
        {(callState === 'connecting' || callState === 'calling' || callState === 'active') && (
          <button onClick={endCall} className="w-full btn-danger flex items-center justify-center gap-2">
            <PhoneOff size={18} />
            End Call
          </button>
        )}
      </div>

      {/* SMS Section */}
      <div className="border-t border-[var(--border)]">
        <button
          onClick={() => setShowSms(!showSms)}
          className="w-full px-4 py-2 flex items-center justify-between text-xs text-[var(--text-muted)] hover:text-white"
        >
          <span className="flex items-center gap-1.5"><MessageSquare size={13} /> SMS</span>
          <ChevronDown size={14} className={`transition-transform ${showSms ? 'rotate-180' : ''}`} />
        </button>
        {showSms && (
          <div className="px-4 pb-3 space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={smsText}
                onChange={(e) => setSmsText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendSms()}
                placeholder="Type message…"
                className="flex-1 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:border-indigo-500/50"
              />
              <button
                onClick={sendSms}
                disabled={smsSending || !smsText.trim()}
                className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white disabled:opacity-40 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
            {smsStatus && (
              <p className={`text-xs ${smsStatus.startsWith('Sent') ? 'text-green-400' : 'text-red-400'}`}>
                {smsStatus}
              </p>
            )}
            <p className="text-xs text-[var(--text-muted)]">
              From: {selectedAgent.name} ({formatPhone(selectedAgent.phone)})
            </p>
          </div>
        )}
      </div>

      {/* Recent Calls */}
      {recentCalls.length > 0 && (
        <div className="border-t border-[var(--border)] px-4 py-2">
          <p className="text-xs text-[var(--text-muted)] mb-1">Recent</p>
          {recentCalls.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-1 text-xs">
              <span className="text-white truncate">{c.name || formatPhone(c.to)}</span>
              <span className="text-[var(--text-muted)] ml-2 shrink-0">
                {formatElapsed(c.duration)} · {c.agent}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Floating softphone widget */
interface FloatingSoftphoneProps {
  phone?: string;
  name?: string;
  onClose: () => void;
}

export function FloatingSoftphone({ phone, name, onClose }: FloatingSoftphoneProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 shadow-2xl shadow-black/60 animate-in slide-in-from-bottom-4">
      <Softphone phone={phone} name={name} onClose={onClose} />
    </div>
  );
}

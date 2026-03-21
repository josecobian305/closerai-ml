import { useState, useEffect, useRef } from 'react';
import { Phone, PhoneOff, Mic, MicOff, PauseCircle, PlayCircle } from 'lucide-react';

interface SoftphoneProps {
  phone?: string;
  name?: string;
  onClose?: () => void;
}

type CallState = 'idle' | 'calling' | 'active' | 'ended';

function formatElapsed(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

export function Softphone({ phone, name, onClose }: SoftphoneProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [muted, setMuted] = useState(false);
  const [held, setHeld] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const startCall = () => {
    setCallState('calling');
    setTimeout(() => {
      setCallState('active');
      timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
    }, 2000);
  };

  const endCall = () => {
    setCallState('ended');
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setTimeout(() => {
      setCallState('idle');
      setElapsed(0);
      setMuted(false);
      setHeld(false);
    }, 2000);
  };

  const stateColor = {
    idle: 'text-gray-400',
    calling: 'text-yellow-400',
    active: 'text-green-400',
    ended: 'text-gray-400',
  }[callState];

  const stateLabel = {
    idle: 'Ready to call',
    calling: `Calling ${name || phone || '…'}`,
    active: `Active · ${formatElapsed(elapsed)}`,
    ended: 'Call ended',
  }[callState];

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Phone size={16} className="text-green-400" />
          <span className="text-sm font-semibold text-white">Softphone</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">×</button>
        )}
      </div>

      {/* Contact info */}
      <div className="px-5 py-4 text-center">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
          {name?.[0]?.toUpperCase() || <Phone size={24} />}
        </div>
        <p className="text-white font-semibold text-lg">{name || 'Unknown'}</p>
        <p className="text-gray-400 text-sm mt-0.5">{phone || '—'}</p>
        <p className={`text-sm mt-2 font-medium ${stateColor} ${callState === 'calling' ? 'animate-pulse' : ''}`}>
          {stateLabel}
        </p>
      </div>

      {/* Active call controls */}
      {callState === 'active' && (
        <div className="flex justify-center gap-4 px-5 pb-2">
          <button
            onClick={() => setMuted((m) => !m)}
            className={`p-3 rounded-full transition-colors ${muted ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            title={muted ? 'Unmute' : 'Mute'}
          >
            {muted ? <MicOff size={18} /> : <Mic size={18} />}
          </button>
          <button
            onClick={() => setHeld((h) => !h)}
            className={`p-3 rounded-full transition-colors ${held ? 'bg-yellow-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}
            title={held ? 'Resume' : 'Hold'}
          >
            {held ? <PlayCircle size={18} /> : <PauseCircle size={18} />}
          </button>
        </div>
      )}

      {/* Main action button */}
      <div className="px-5 pb-5 mt-2">
        {(callState === 'idle' || callState === 'ended') && (
          <button onClick={startCall} className="w-full btn-success flex items-center justify-center gap-2">
            <Phone size={18} />
            Call {name || phone || ''}
          </button>
        )}
        {(callState === 'calling' || callState === 'active') && (
          <button onClick={endCall} className="w-full btn-danger flex items-center justify-center gap-2">
            <PhoneOff size={18} />
            End Call
          </button>
        )}
      </div>
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

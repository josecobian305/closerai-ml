import { useState } from 'react';

interface SoftphoneProps {
  phone: string;
  name: string;
}

type CallState = 'idle' | 'calling' | 'active' | 'ended';

/**
 * Floating softphone widget with call and hangup controls.
 * In production, integrate with Twilio/Aircall/GHL calling.
 */
export function Softphone({ phone, name }: SoftphoneProps) {
  const [callState, setCallState] = useState<CallState>('idle');
  const [elapsed, setElapsed] = useState(0);
  const [_timer, setTimer] = useState<ReturnType<typeof setInterval> | null>(null);

  const startCall = () => {
    setCallState('calling');
    // Simulate ringing → active
    setTimeout(() => {
      setCallState('active');
      const t = setInterval(() => setElapsed((s) => s + 1), 1000);
      setTimer(t);
    }, 2000);
  };

  const endCall = () => {
    setCallState('ended');
    setTimer((t) => {
      if (t) clearInterval(t);
      return null;
    });
    setTimeout(() => {
      setCallState('idle');
      setElapsed(0);
    }, 2000);
  };

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-2xl p-4">
      {/* Call status */}
      <div className="text-center mb-4">
        {callState === 'idle' && (
          <p className="text-gray-400 text-sm">Ready to call</p>
        )}
        {callState === 'calling' && (
          <p className="text-yellow-400 text-sm animate-pulse">📞 Calling {name}…</p>
        )}
        {callState === 'active' && (
          <p className="text-green-400 text-sm font-medium">🔴 On call — {formatElapsed(elapsed)}</p>
        )}
        {callState === 'ended' && (
          <p className="text-gray-400 text-sm">Call ended</p>
        )}
        <p className="text-base text-white font-medium mt-1">{phone}</p>
      </div>

      {/* Controls */}
      <div className="flex gap-3">
        {(callState === 'idle' || callState === 'ended') && (
          <button
            onClick={startCall}
            className="flex-1 btn-success flex items-center justify-center gap-2 text-lg"
          >
            📞 Call
          </button>
        )}

        {(callState === 'calling' || callState === 'active') && (
          <button
            onClick={endCall}
            className="flex-1 btn-danger flex items-center justify-center gap-2 text-lg"
          >
            📵 Hang Up
          </button>
        )}
      </div>
    </div>
  );
}

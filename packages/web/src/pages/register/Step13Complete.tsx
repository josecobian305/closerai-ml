import { useEffect, useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface Props {
  agentName: string;
  onLaunch: () => void;
  loading?: boolean;
}

export function Step13Complete({ agentName, onLaunch, loading }: Props) {
  const [showCheck, setShowCheck] = useState(false);
  const [showText, setShowText] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowCheck(true), 200);
    const t2 = setTimeout(() => setShowText(true), 700);
    const t3 = setTimeout(() => setShowButton(true), 1100);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-6">
      <div
        className={`transition-all duration-700 ${showCheck ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-8 shadow-2xl shadow-green-500/30 mx-auto">
          <CheckCircle size={50} className="text-white" />
        </div>
      </div>

      <div className={`transition-all duration-700 delay-100 ${showText ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Your AI sales team is ready.
        </h2>
        <p className="text-lg text-gray-400 mb-3 max-w-md mx-auto">
          <span className="text-indigo-300 font-semibold">{agentName || 'Your agent'}</span> is configured and ready to start working leads.
        </p>
        <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500 mb-10">
          <span>✅ Agent configured</span>
          <span>✅ Rules generated</span>
          <span>✅ Dashboard personalized</span>
        </div>
      </div>

      <div className={`transition-all duration-700 ${showButton ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
        <button
          onClick={onLaunch}
          disabled={loading}
          className="group flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white text-lg font-semibold px-10 py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-105"
        >
          {loading ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Setting up...
            </>
          ) : (
            <>
              🚀 Launch Dashboard
            </>
          )}
        </button>
      </div>
    </div>
  );
}

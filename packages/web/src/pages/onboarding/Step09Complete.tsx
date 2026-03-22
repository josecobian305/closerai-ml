import { useEffect, useState } from 'react';
import { PartyPopper, Mail, GraduationCap, ExternalLink } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

export function Step09Complete({ data }: StepProps) {
  const [confetti, setConfetti] = useState(true);
  useEffect(() => { const t = setTimeout(() => setConfetti(false), 4000); return () => clearTimeout(t); }, []);

  return (
    <div className="flex flex-col items-center h-full px-6 pt-8 text-center relative">
      {/* Confetti */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
          {Array.from({ length: 40 }).map((_, i) => (
            <div key={i} style={{
              position: 'absolute', top: -10,
              left: `${Math.random() * 100}%`,
              width: 6 + Math.random() * 6, height: 6 + Math.random() * 6,
              borderRadius: Math.random() > 0.5 ? '50%' : 2,
              background: ['#635bff','#4f46e5','#22c55e','#f59e0b','#ef4444','#06b6d4'][Math.floor(Math.random() * 6)],
              animation: `confettiFall ${2 + Math.random() * 3}s ease-in forwards`,
              animationDelay: `${Math.random() * 1.5}s`, opacity: 0,
            }} />
          ))}
          <style>{`@keyframes confettiFall { 0% { opacity:1; transform:translateY(0) rotate(0deg); } 100% { opacity:0; transform:translateY(100vh) rotate(720deg); } }`}</style>
        </div>
      )}

      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/30 flex items-center justify-center mx-auto mb-6">
        <PartyPopper size={36} className="text-indigo-400" />
      </div>

      <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-3">You're all set!</h2>
      <p className="text-lg text-[var(--text-muted)] mb-10 max-w-md">Your CloserAI account has been created. Check your email for login credentials.</p>

      <div className="grid grid-cols-2 gap-4 max-w-lg w-full mb-10">
        {/* CRM Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
              <Mail size={20} className="text-indigo-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Email 1</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Main CRM</div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
            Your CRM dashboard with {data.pipelineStages.length || 6} pipeline stages, {data.aiLevel}% AI, and {data.iqModel} intelligence.
          </p>
          <a href="https://agents.chccapitalgroup.com/app/login" target="_blank" rel="noopener"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300">
            Open CRM <ExternalLink size={10} />
          </a>
        </div>

        {/* Training Room Card */}
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl p-6 text-left">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <GraduationCap size={20} className="text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Email 2</div>
              <div className="text-[10px] text-[var(--text-subtle)]">Training Room</div>
            </div>
          </div>
          <p className="text-xs text-[var(--text-muted)] leading-relaxed mb-4">
            Upload new training data, review AI performance, and fine-tune your agents.
          </p>
          <a href="https://agents.chccapitalgroup.com/training/login" target="_blank" rel="noopener"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300">
            Open Training Room <ExternalLink size={10} />
          </a>
        </div>
      </div>

      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-5 py-3 max-w-lg text-xs text-[var(--text-muted)] leading-relaxed">
        📧 Two emails sent to <strong className="text-white">{data.email || 'your inbox'}</strong> — one for CRM login, one for Training Room. Check spam if you don't see them within 60 seconds.
      </div>
    </div>
  );
}

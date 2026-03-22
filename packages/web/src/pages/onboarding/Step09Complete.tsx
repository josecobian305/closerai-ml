import { useEffect, useState } from 'react';
import { PartyPopper, Mail, GraduationCap, ExternalLink } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

export function Step09Complete({ data }: StepProps) {
  const [confetti, setConfetti] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setConfetti(false), 4000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ textAlign: 'center', maxWidth: 540, margin: '0 auto' }}>
      {/* Confetti animation */}
      {confetti && (
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 200, overflow: 'hidden' }}>
          {Array.from({ length: 50 }).map((_, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: -20,
                left: `${Math.random() * 100}%`,
                width: 8 + Math.random() * 8,
                height: 8 + Math.random() * 8,
                borderRadius: Math.random() > 0.5 ? '50%' : 2,
                background: ['#635bff', '#4f46e5', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'][Math.floor(Math.random() * 6)],
                animation: `confettiFall ${2 + Math.random() * 3}s ease-in forwards`,
                animationDelay: `${Math.random() * 1.5}s`,
                opacity: 0,
              }}
            />
          ))}
          <style>{`
            @keyframes confettiFall {
              0% { opacity: 1; transform: translateY(0) rotate(0deg); }
              100% { opacity: 0; transform: translateY(100vh) rotate(${360 + Math.random() * 720}deg); }
            }
          `}</style>
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <PartyPopper size={56} style={{ color: '#635bff' }} />
      </div>

      <div style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 12, letterSpacing: -1 }}>
        You're all set!
      </div>
      <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)', marginBottom: 40, lineHeight: 1.6 }}>
        Your CloserAI account has been created. Check your email for login credentials.
      </div>

      {/* Two email cards */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 40 }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: 24, textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'rgba(99,91,255,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Mail size={20} style={{ color: '#635bff' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Email 1</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Main CRM</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 16 }}>
            Your CRM dashboard with {data.pipelineStages.length || 6} pipeline stages, {data.aiLevel}% AI, and {data.iqModel} intelligence.
          </div>
          <a
            href="https://agents.chccapitalgroup.com/app/login"
            target="_blank" rel="noopener"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#635bff', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Open CRM <ExternalLink size={12} />
          </a>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 14, padding: 24, textAlign: 'left',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, background: 'rgba(34,197,94,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <GraduationCap size={20} style={{ color: '#22c55e' }} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700 }}>Email 2</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Training Room</div>
            </div>
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 16 }}>
            Upload new training data, review AI performance, and fine-tune your agents.
          </div>
          <a
            href="https://agents.chccapitalgroup.com/training/login"
            target="_blank" rel="noopener"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              color: '#22c55e', fontSize: 13, fontWeight: 600, textDecoration: 'none',
            }}
          >
            Open Training Room <ExternalLink size={12} />
          </a>
        </div>
      </div>

      <div style={{
        background: 'rgba(99,91,255,0.08)', border: '1px solid rgba(99,91,255,0.2)',
        borderRadius: 12, padding: 16, fontSize: 13, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6,
      }}>
        📧 Two emails sent to <strong style={{ color: '#fff' }}>{data.email || 'your inbox'}</strong> — one for your CRM login, one for Training Room access. Check spam if you don't see them within 60 seconds.
      </div>
    </div>
  );
}

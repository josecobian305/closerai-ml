import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Building2, Heart, UtensilsCrossed, ShoppingBag, Car, Scale, Home, Wind, Truck, Cpu, Leaf, Users, BarChart3, Megaphone, HelpCircle, ArrowRight, Zap } from 'lucide-react';
import type { StepProps } from './OnboardingRouter';

const INDUSTRIES = [
  { id: 'construction', label: 'Construction', icon: Building2 },
  { id: 'healthcare', label: 'Healthcare', icon: Heart },
  { id: 'restaurant', label: 'Restaurant', icon: UtensilsCrossed },
  { id: 'retail', label: 'Retail', icon: ShoppingBag },
  { id: 'auto', label: 'Auto', icon: Car },
  { id: 'legal', label: 'Legal', icon: Scale },
  { id: 'real_estate', label: 'Real Estate', icon: Home },
  { id: 'hvac', label: 'HVAC', icon: Wind },
  { id: 'trucking', label: 'Trucking', icon: Truck },
  { id: 'tech', label: 'Tech', icon: Cpu },
  { id: 'landscaping', label: 'Landscaping', icon: Leaf },
  { id: 'staffing', label: 'Staffing', icon: Users },
  { id: 'mca', label: 'MCA / Finance', icon: BarChart3 },
  { id: 'marketing', label: 'Marketing', icon: Megaphone },
  { id: 'other', label: 'Other', icon: HelpCircle },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
  'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

type Phase = 'welcome' | 'business' | 'contact' | 'state';

export function Step01BusinessProfile({ data, onUpdate, onNext }: StepProps) {
  const [phase, setPhase] = useState<Phase>('welcome');

  // ─── Welcome ────────────────────────────────────────────────────────────────
  if (phase === 'welcome') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <div className="w-20 h-20 rounded-[10px] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30">
          <Zap size={40} className="text-white" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
          Let's build your<br />
          <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AI sales team
          </span>
        </h1>
        <p className="text-xl text-[var(--text-muted)] mb-12 max-w-md">
          In 5 minutes, you'll have a fully configured AI agent ready to qualify leads, collect docs, and follow up 24/7.
        </p>
        <button
          onClick={() => setPhase('business')}
          className="group flex items-center gap-3 bg-[var(--accent)] hover:opacity-90 text-white text-lg font-semibold px-8 py-4 rounded-[10px] transition-all duration-200 shadow-lg shadow-indigo-600/30 hover:shadow-indigo-500/40 hover:scale-105"
        >
          Get Started
          <ArrowRight size={22} className="transition-transform group-hover:translate-x-1" />
        </button>
        <p className="text-sm text-[var(--text-subtle)] mt-6">No credit card required · Free 14-day trial</p>
      </div>
    );
  }

  // ─── Business Name + Industry ───────────────────────────────────────────────
  if (phase === 'business') {
    return (
      <div className="flex flex-col items-center h-full px-6 pt-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
          Tell us about your business
        </h2>
        <p className="text-[var(--text-muted)] mb-8 text-center">We'll personalize everything to your industry.</p>
        <div className="w-full max-w-lg space-y-6">
          <input
            type="text"
            value={data.businessName}
            onChange={e => onUpdate({ businessName: e.target.value })}
            placeholder="Business name"
            className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-xl text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
          />
          <div>
            <p className="text-sm font-medium text-[var(--text-muted)] mb-3">Industry</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {INDUSTRIES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => onUpdate({ industry: id })}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all duration-150 ${
                    data.industry === id
                      ? 'bg-[var(--accent)]/20 border-indigo-500 text-indigo-300'
                      : 'bg-[var(--bg-elevated)]/40 border-[var(--border)]/60 text-[var(--text-muted)] hover:border-[var(--border)] hover:text-gray-200'
                  }`}
                >
                  <Icon size={22} />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent">
          <button
            onClick={() => setPhase('contact')}
            disabled={!data.businessName.trim() || !data.industry}
            className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base py-4 rounded-xl transition-all duration-200 block"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ─── Contact Info ───────────────────────────────────────────────────────────
  if (phase === 'contact') {
    const canContinue = data.email.trim() && data.phone.trim() && data.password.length >= 8;
    return (
      <div className="flex flex-col items-center h-full px-6 pt-8">
        <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
          Your contact info
        </h2>
        <p className="text-[var(--text-muted)] mb-8 text-center">We'll send your login credentials here.</p>
        <div className="w-full max-w-lg space-y-4">
          <input
            type="email"
            value={data.email}
            onChange={e => onUpdate({ email: e.target.value })}
            placeholder="Email address"
            className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-lg text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
          />
          <input
            type="tel"
            value={data.phone}
            onChange={e => onUpdate({ phone: e.target.value })}
            placeholder="Phone number"
            className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-lg text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
          />
          <input
            type="password"
            value={data.password}
            onChange={e => onUpdate({ password: e.target.value })}
            placeholder="Create a password (8+ chars)"
            className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-lg text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
          />
        </div>
        <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent">
          <button
            onClick={() => setPhase('state')}
            disabled={!canContinue}
            className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base py-4 rounded-xl transition-all duration-200 block"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  // ─── State ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        Where are you based?
      </h2>
      <p className="text-[var(--text-muted)] mb-8 text-center">Select your state.</p>
      <div className="w-full max-w-lg">
        <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
          {US_STATES.map(st => (
            <button
              key={st}
              onClick={() => onUpdate({ state: st })}
              className={`py-2.5 rounded-lg text-sm font-semibold border transition-all duration-150 ${
                data.state === st
                  ? 'bg-[var(--accent)]/20 border-indigo-500 text-indigo-300'
                  : 'bg-[var(--bg-elevated)]/40 border-[var(--border)]/60 text-[var(--text-muted)] hover:border-[var(--border)] hover:text-gray-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent">
        <button
          onClick={onNext}
          disabled={!data.state}
          className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-base py-4 rounded-xl transition-all duration-200 block"
        >
          Continue →
        </button>
      </div>
    </div>
  );
}

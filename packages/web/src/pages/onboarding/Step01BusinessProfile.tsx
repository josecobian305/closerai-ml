import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import type { StepProps } from './OnboardingRouter';

const INDUSTRIES = [
  'Auto Repair / Dealership', 'Construction / Contracting', 'E-Commerce / Retail',
  'Food & Beverage / Restaurant', 'Healthcare / Medical', 'HVAC / Plumbing / Electrical',
  'Landscaping / Lawn Care', 'Legal / Law Firm', 'Manufacturing / Wholesale',
  'Real Estate', 'Staffing / Recruiting', 'Transportation / Trucking',
  'Merchant Cash Advance / Finance', 'SaaS / Technology', 'Marketing / Agency', 'Other',
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY',
  'LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND',
  'OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC',
];

interface Field {
  key: keyof FieldMap;
  label: string;
  sublabel?: string;
  type: 'text' | 'email' | 'password' | 'tel' | 'select' | 'number';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

type FieldMap = {
  businessName: string; industry: string; state: string; phone: string;
  email: string; password: string; monthlyRevenue: string; dealSize: string; agentCount: number;
};

const FIELDS: Field[] = [
  { key: 'businessName', label: 'What\'s your business name?', sublabel: 'The name your customers know you by.', type: 'text', placeholder: 'Acme Funding LLC', required: true },
  { key: 'industry', label: 'What industry are you in?', type: 'select', options: INDUSTRIES, required: true },
  { key: 'state', label: 'What state are you based in?', type: 'select', options: US_STATES, required: true },
  { key: 'phone', label: 'Your business phone number?', type: 'tel', placeholder: '(555) 123-4567', required: true },
  { key: 'email', label: 'Your email address?', sublabel: 'We\'ll send your login credentials here.', type: 'email', placeholder: 'you@business.com', required: true },
  { key: 'password', label: 'Create a password', sublabel: 'At least 8 characters.', type: 'password', placeholder: '••••••••', required: true },
  { key: 'monthlyRevenue', label: 'Average monthly revenue?', sublabel: 'Rough estimate is fine.', type: 'text', placeholder: '$50,000', required: true },
  { key: 'dealSize', label: 'Typical deal size?', sublabel: 'Average funding amount per deal.', type: 'text', placeholder: '$25,000' },
  { key: 'agentCount', label: 'How many sales agents?', sublabel: 'Including yourself.', type: 'number', placeholder: '1' },
];

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'transparent', border: 'none',
  borderBottom: '2px solid rgba(255,255,255,0.08)', color: '#fff',
  fontSize: 'clamp(18px, 3vw, 28px)', fontFamily: 'inherit', fontWeight: 500,
  padding: '12px 0', outline: 'none', caretColor: '#635bff',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle, appearance: 'none' as const, cursor: 'pointer',
};

export function Step01BusinessProfile({ data, onUpdate, onNext }: StepProps) {
  const [fieldIdx, setFieldIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null);
  const field = FIELDS[fieldIdx];

  useEffect(() => { inputRef.current?.focus(); }, [fieldIdx]);

  const val = String((data as any)[field.key] ?? '');

  const advance = () => {
    if (field.required && !val.trim()) return;
    if (fieldIdx < FIELDS.length - 1) {
      setFieldIdx(i => i + 1);
    } else {
      onNext();
    }
  };

  const handleKey = (e: KeyboardEvent) => { if (e.key === 'Enter') advance(); };

  const handleChange = (v: string) => {
    const parsed = field.type === 'number' ? Number(v) || 0 : v;
    onUpdate({ [field.key]: parsed } as any);
  };

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#635bff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ background: '#635bff', color: '#fff', width: 20, height: 20, borderRadius: '50%', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {fieldIdx + 1}
        </span>
        BUSINESS PROFILE
      </div>

      <div style={{ fontSize: 'clamp(24px, 4vw, 40px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 12, letterSpacing: -0.5 }}>
        {field.label}
      </div>

      {field.sublabel && (
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 36, lineHeight: 1.6 }}>
          {field.sublabel}
        </div>
      )}

      {field.type === 'select' ? (
        <select
          ref={inputRef as any}
          value={val}
          onChange={e => { handleChange(e.target.value); }}
          onKeyDown={handleKey}
          style={selectStyle}
        >
          <option value="" disabled>Select…</option>
          {field.options!.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          ref={inputRef as any}
          type={field.type}
          value={val}
          placeholder={field.placeholder}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKey}
          style={inputStyle}
        />
      )}

      <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={advance} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: '#635bff', color: '#fff', border: 'none',
          padding: '14px 28px', borderRadius: 8, fontSize: 15, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {fieldIdx < FIELDS.length - 1 ? 'OK ✓' : 'Continue →'}
        </button>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
          press <span style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 600 }}>Enter ↵</span>
        </span>
      </div>

      {fieldIdx > 0 && (
        <button onClick={() => setFieldIdx(i => i - 1)} style={{
          marginTop: 16, background: 'none', border: 'none', color: 'rgba(255,255,255,0.35)',
          cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
        }}>
          ← Previous
        </button>
      )}
    </div>
  );
}

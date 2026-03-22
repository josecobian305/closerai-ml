import { Building2, Heart, UtensilsCrossed, ShoppingBag, Car, Scale, Home, Wind, Truck, Cpu, HelpCircle } from 'lucide-react';

interface Props {
  data: { businessName: string; industry: string };
  onChange: (data: Partial<{ businessName: string; industry: string }>) => void;
}

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
  { id: 'other', label: 'Other', icon: HelpCircle },
];

export function Step02Business({ data, onChange }: Props) {
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
          onChange={(e) => onChange({ businessName: e.target.value })}
          placeholder="Business name"
          className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-xl text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
        />

        <div>
          <p className="text-sm font-medium text-[var(--text-muted)] mb-3">Industry</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {INDUSTRIES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onChange({ industry: id })}
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
    </div>
  );
}

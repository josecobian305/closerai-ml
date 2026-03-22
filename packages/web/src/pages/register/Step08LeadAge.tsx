interface Props {
  data: { leadAge: string };
  onChange: (data: Partial<{ leadAge: string }>) => void;
}

const AGES = [
  { id: '0-48h', label: '0–48 hours', badge: 'Fresh 🔥', desc: 'Highest intent, fastest response' },
  { id: '2-7d', label: '2–7 days', badge: 'Warm', desc: 'Still engaged, needs nurturing' },
  { id: '7-14d', label: '7–14 days', badge: 'Cooling', desc: 'Requires re-engagement' },
  { id: '14-30d', label: '14–30 days', badge: 'Cold', desc: 'Needs strong hook' },
  { id: '30-90d', label: '30–90 days', badge: 'Aged', desc: 'Long-form nurture campaign' },
  { id: '90d+', label: '90+ days', badge: 'Re-engagement', desc: 'Win-back sequences' },
];

export function Step08LeadAge({ data, onChange }: Props) {
  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        How old are your typical leads?
      </h2>
      <p className="text-[var(--text-muted)] mb-8 text-center max-w-md">
        Lead age determines messaging urgency and follow-up cadence.
      </p>

      <div className="w-full max-w-lg space-y-3">
        {AGES.map(({ id, label, badge, desc }) => (
          <button
            key={id}
            onClick={() => onChange({ leadAge: id })}
            className={`w-full flex items-center justify-between px-5 py-4 rounded-xl border-2 transition-all duration-150 text-left ${
              data.leadAge === id
                ? 'bg-[var(--accent)]/20 border-indigo-500 text-white'
                : 'bg-[var(--bg-elevated)]/40 border-[var(--border)]/60 text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]/60'
            }`}
          >
            <div>
              <p className="font-semibold">{label}</p>
              <p className={`text-sm mt-0.5 ${data.leadAge === id ? 'text-indigo-300' : 'text-[var(--text-muted)]'}`}>{desc}</p>
            </div>
            <span className={`text-xs font-medium px-3 py-1.5 rounded-full flex-shrink-0 ml-4 ${
              data.leadAge === id
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
            }`}>
              {badge}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

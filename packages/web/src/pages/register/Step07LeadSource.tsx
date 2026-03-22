interface Props {
  data: { leadSources: string[] };
  onChange: (data: Partial<{ leadSources: string[] }>) => void;
}

const SOURCES = [
  'LendingTree', 'Fundera', 'Nav', 'Cold List', 'Referral',
  'Google Ads', 'Social Media', 'Direct/Inbound', 'Other',
];

export function Step07LeadSource({ data, onChange }: Props) {
  const toggle = (source: string) => {
    const cur = data.leadSources;
    const next = cur.includes(source) ? cur.filter((s) => s !== source) : [...cur, source];
    onChange({ leadSources: next });
  };

  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        Where do your leads come from?
      </h2>
      <p className="text-[var(--text-muted)] mb-8 text-center max-w-md">
        Select all that apply. We'll optimize messaging for each source.
      </p>

      <div className="w-full max-w-lg flex flex-wrap gap-3 justify-center">
        {SOURCES.map((source) => {
          const selected = data.leadSources.includes(source);
          return (
            <button
              key={source}
              onClick={() => toggle(source)}
              className={`px-5 py-3 rounded-full border-2 text-sm font-medium transition-all duration-150 ${
                selected
                  ? 'bg-[var(--accent)]/20 border-indigo-500 text-indigo-200'
                  : 'bg-[var(--bg-elevated)]/40 border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border)] hover:text-gray-200'
              }`}
            >
              {selected && <span className="mr-1.5">✓</span>}
              {source}
            </button>
          );
        })}
      </div>

      {data.leadSources.length > 0 && (
        <p className="mt-6 text-sm text-[var(--text-muted)]">
          {data.leadSources.length} source{data.leadSources.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

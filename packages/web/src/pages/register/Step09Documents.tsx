interface Props {
  data: { documents: string[] };
  onChange: (data: Partial<{ documents: string[] }>) => void;
}

const DOCS = [
  { id: 'bank3', label: 'Bank statements (3 months)', icon: '📊' },
  { id: 'bank4', label: 'Bank statements (4 months)', icon: '📊' },
  { id: 'mtd', label: 'MTD transactions', icon: '📄' },
  { id: 'dl', label: "Driver's license", icon: '🪪' },
  { id: 'voided_check', label: 'Voided check', icon: '🏦' },
  { id: 'payoff_letter', label: 'Payoff letter', icon: '📝' },
  { id: 'tax_returns', label: 'Tax returns', icon: '📋' },
  { id: 'pnl', label: 'P&L statement', icon: '💰' },
  { id: 'articles', label: 'Articles of incorporation', icon: '🏢' },
  { id: 'ein', label: 'EIN letter', icon: '📃' },
];

export function Step09Documents({ data, onChange }: Props) {
  const toggle = (docId: string) => {
    const cur = data.documents;
    const next = cur.includes(docId) ? cur.filter((d) => d !== docId) : [...cur, docId];
    onChange({ documents: next });
  };

  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        What docs do you need?
      </h2>
      <p className="text-[var(--text-muted)] mb-8 text-center max-w-md">
        Your agent will automatically request these from leads.
      </p>

      <div className="w-full max-w-lg grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DOCS.map(({ id, label, icon }) => {
          const selected = data.documents.includes(id);
          return (
            <button
              key={id}
              onClick={() => toggle(id)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-150 text-left ${
                selected
                  ? 'bg-[var(--accent)]/20 border-indigo-500 text-white'
                  : 'bg-[var(--bg-elevated)]/40 border-[var(--border)]/60 text-[var(--text-secondary)] hover:border-[var(--border)] hover:bg-[var(--bg-elevated)]/60'
              }`}
            >
              <span className="text-xl flex-shrink-0">{icon}</span>
              <span className="text-sm font-medium flex-1">{label}</span>
              {selected && (
                <div className="w-5 h-5 rounded-full bg-[var(--accent)] flex items-center justify-center flex-shrink-0">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {data.documents.length > 0 && (
        <p className="mt-4 text-sm text-[var(--text-muted)]">
          {data.documents.length} document type{data.documents.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  );
}

interface Props {
  data: { pitch: string };
  onChange: (data: Partial<{ pitch: string }>) => void;
}

export function Step03Selling({ data, onChange }: Props) {
  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        What are you selling?
      </h2>
      <p className="text-[var(--text-muted)] mb-8 text-center max-w-md">
        Describe what you offer in one sentence. This becomes your agent's pitch foundation.
      </p>

      <div className="w-full max-w-lg">
        <textarea
          value={data.pitch}
          onChange={(e) => onChange({ pitch: e.target.value })}
          placeholder='e.g. "Merchant cash advances up to $500K, same-day funding"'
          rows={4}
          className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-lg text-white placeholder-[var(--text-subtle)] outline-none transition-colors resize-none"
        />
        <div className="flex justify-between items-center mt-2">
          <p className="text-xs text-[var(--text-subtle)]">Keep it short and punchy — under 20 words is ideal.</p>
          <span className={`text-xs ${data.pitch.length > 200 ? 'text-red-400' : 'text-[var(--text-subtle)]'}`}>
            {data.pitch.length}/200
          </span>
        </div>
      </div>

      {/* Example chips */}
      <div className="mt-8 w-full max-w-lg">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider mb-3">Quick examples</p>
        <div className="flex flex-wrap gap-2">
          {[
            'Business funding up to $500K',
            'Same-day merchant cash advances',
            'Working capital for small businesses',
          ].map((ex) => (
            <button
              key={ex}
              onClick={() => onChange({ pitch: ex })}
              className="text-xs bg-[var(--bg-elevated)] hover:bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] px-3 py-1.5 rounded-lg transition-colors"
            >
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

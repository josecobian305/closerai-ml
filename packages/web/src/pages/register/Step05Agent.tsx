interface AgentData {
  agentName: string;
  agentTitle: string;
  agentEmail: string;
}

interface Props {
  data: AgentData;
  onChange: (data: Partial<AgentData>) => void;
}

const NAME_SUGGESTIONS = ['Jacob', 'Sarah', 'Alex', 'Riley', 'Jordan', 'Morgan'];

export function Step05Agent({ data, onChange }: Props) {
  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        Name your AI agent
      </h2>
      <p className="text-[var(--text-muted)] mb-8 text-center max-w-md">
        Give your agent a human name and identity. Leads will interact with this persona.
      </p>

      <div className="w-full max-w-md space-y-5">
        {/* Name with suggestions */}
        <div>
          <input
            type="text"
            value={data.agentName}
            onChange={(e) => onChange({ agentName: e.target.value })}
            placeholder="Agent first name (e.g. Jacob)"
            className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-base text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {NAME_SUGGESTIONS.map((n) => (
              <button
                key={n}
                onClick={() => onChange({ agentName: n })}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  data.agentName === n
                    ? 'bg-[var(--accent)]/20 border-indigo-500 text-indigo-300'
                    : 'bg-[var(--bg-elevated)] border-[var(--border)] text-[var(--text-muted)] hover:text-white hover:border-[var(--border)]'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        <input
          type="text"
          value={data.agentTitle}
          onChange={(e) => onChange({ agentTitle: e.target.value })}
          placeholder="Agent title (e.g. Head of Sales)"
          className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-base text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
        />

        <div>
          <input
            type="email"
            value={data.agentEmail}
            onChange={(e) => onChange({ agentEmail: e.target.value })}
            placeholder="Agent email (e.g. jacob@yourbusiness.com)"
            className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-base text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
          />
          <p className="text-xs text-[var(--text-subtle)] mt-1.5 ml-1">Documents and lead interactions will be sent to this address.</p>
        </div>
      </div>
    </div>
  );
}

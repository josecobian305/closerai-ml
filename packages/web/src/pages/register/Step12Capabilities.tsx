interface Capabilities {
  sms: boolean;
  email: boolean;
  voiceNotes: boolean;
  callBridge: boolean;
  autoReply: boolean;
  docCollection: boolean;
  courtSearch: boolean;
  notifications: boolean;
}

interface Props {
  data: Capabilities;
  onChange: (data: Partial<Capabilities>) => void;
}

const CAPABILITY_LIST: { id: keyof Capabilities; icon: string; label: string; desc: string; recommended?: boolean }[] = [
  { id: 'sms', icon: '📱', label: 'SMS outreach', desc: 'Send automated text messages to leads', recommended: true },
  { id: 'email', icon: '📧', label: 'Email follow-ups', desc: 'Automated email sequences', recommended: true },
  { id: 'voiceNotes', icon: '🎤', label: 'Voice notes', desc: 'Send personalized voice messages' },
  { id: 'callBridge', icon: '📞', label: 'Call bridge', desc: 'Route incoming calls through agent' },
  { id: 'autoReply', icon: '🤖', label: 'Auto-reply to leads', desc: 'Instantly respond to inbound messages', recommended: true },
  { id: 'docCollection', icon: '📄', label: 'Document collection', desc: 'Request and receive documents automatically', recommended: true },
  { id: 'courtSearch', icon: '⚖️', label: 'Court records check', desc: 'Background check for leads' },
  { id: 'notifications', icon: '🔔', label: 'Notifications to you', desc: 'Get alerted on important events', recommended: true },
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${
        on ? 'bg-[var(--accent)]' : 'bg-[var(--bg-elevated)]'
      }`}
    >
      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
        on ? 'translate-x-6' : 'translate-x-0.5'
      }`} />
    </button>
  );
}

export function Step12Capabilities({ data, onChange }: Props) {
  const toggle = (id: keyof Capabilities) => onChange({ [id]: !data[id] });
  const allOn = Object.values(data).every(Boolean);

  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        What should your agent do?
      </h2>
      <p className="text-[var(--text-muted)] mb-6 text-center max-w-md">
        Enable or disable capabilities. You can change these anytime.
      </p>

      <div className="w-full max-w-lg space-y-2">
        <div className="flex justify-end mb-1">
          <button
            onClick={() => {
              const val = !allOn;
              const update = Object.fromEntries(
                CAPABILITY_LIST.map((c) => [c.id, val])
              ) as Partial<Capabilities>;
              onChange(update);
            }}
            className="text-xs text-[#a5b4fc] hover:text-indigo-300 transition-colors"
          >
            {allOn ? 'Disable all' : 'Enable all'}
          </button>
        </div>

        {CAPABILITY_LIST.map(({ id, icon, label, desc, recommended }) => (
          <div
            key={id}
            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all ${
              data[id]
                ? 'bg-[var(--bg-elevated)]/60 border-[var(--border)]'
                : 'bg-[var(--bg-elevated)]/20 border-[var(--border)] opacity-60'
            }`}
          >
            <span className="text-xl flex-shrink-0">{icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-white">{label}</p>
                {recommended && (
                  <span className="text-xs px-1.5 py-0.5 bg-[var(--accent)]/30 text-[#a5b4fc] rounded font-medium">Recommended</span>
                )}
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
            </div>
            <Toggle on={data[id]} onToggle={() => toggle(id)} />
          </div>
        ))}
      </div>
    </div>
  );
}

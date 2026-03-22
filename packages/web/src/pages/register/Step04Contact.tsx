interface ContactData {
  yourName: string;
  email: string;
  phone: string;
  password: string;
}

interface Props {
  data: ContactData;
  onChange: (data: Partial<ContactData>) => void;
}

export function Step04Contact({ data, onChange }: Props) {
  return (
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        Your contact info
      </h2>
      <p className="text-[var(--text-muted)] mb-8 text-center">Where should leads and notifications reach you?</p>

      <div className="w-full max-w-md space-y-4">
        <input
          type="text"
          value={data.yourName}
          onChange={(e) => onChange({ yourName: e.target.value })}
          placeholder="Your full name"
          className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-base text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
        />
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="Email (becomes your login)"
          className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-base text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
        />
        <input
          type="tel"
          value={data.phone}
          onChange={(e) => onChange({ phone: e.target.value })}
          placeholder="Your phone number"
          className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-base text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
        />
        <div className="relative">
          <input
            type="password"
            value={data.password}
            onChange={(e) => onChange({ password: e.target.value })}
            placeholder="Create a password"
            className="w-full bg-[var(--bg-elevated)]/60 border border-[var(--border)] focus:border-[var(--accent)] rounded-xl px-5 py-4 text-base text-white placeholder-[var(--text-subtle)] outline-none transition-colors"
          />
          {data.password.length > 0 && data.password.length < 8 && (
            <p className="text-xs text-amber-400 mt-1.5 ml-1">At least 8 characters</p>
          )}
        </div>
      </div>
    </div>
  );
}

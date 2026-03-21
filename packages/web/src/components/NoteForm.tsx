import { useState } from 'react';

interface NoteFormProps {
  contactId: string;
  onSubmit: (note: string) => Promise<void>;
}

export function NoteForm({ contactId: _contactId, onSubmit }: NoteFormProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = note.trim();
    if (!body) return;
    setSaving(true);
    setError(null);
    try {
      await onSubmit(body);
      setNote('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        placeholder="Enter a note…"
        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
      />
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={!note.trim() || saving}
        className="btn-primary py-2 text-sm w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Note'}
      </button>
    </form>
  );
}

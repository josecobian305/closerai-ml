import { useState } from 'react';

interface NoteFormProps {
  contactId: string;
  onSubmit: (note: string) => Promise<void>;
}

/**
 * Form to add a note to a contact.
 */
export function NoteForm({ contactId: _contactId, onSubmit }: NoteFormProps) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await onSubmit(note.trim());
      setNote('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
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
        placeholder="Add a note… (e.g. Spoke with owner, interested in $50k)"
        rows={3}
        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-base resize-none focus:outline-none focus:border-indigo-500"
      />

      {error && (
        <p className="text-sm text-red-400">{error}</p>
      )}

      {success && (
        <p className="text-sm text-green-400">✓ Note saved</p>
      )}

      <button
        type="submit"
        disabled={saving || !note.trim()}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving…' : 'Save Note'}
      </button>
    </form>
  );
}

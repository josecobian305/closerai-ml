import { useState } from 'react';
import type { Contact } from '../types';
import { ChatLog } from './ChatLog';
import { NoteForm } from './NoteForm';
import { Softphone } from './Softphone';
import { useMessages } from '../hooks/useMessages';

interface ContactDetailProps {
  contact: Contact | null;
  onClose: () => void;
}

type Tab = 'chat' | 'info' | 'call' | 'notes';

/**
 * Slide-over detail panel for a selected contact.
 * Shows chat log, contact info, softphone, and note form.
 */
export function ContactDetail({ contact, onClose }: ContactDetailProps) {
  const [tab, setTab] = useState<Tab>('chat');
  const { messages, loading: msgLoading, error: msgError } = useMessages(contact?.phone ?? null);

  const handleSaveNote = async (note: string) => {
    if (!contact) return;
    const res = await fetch(`/api/v1/contacts/${contact.id}/notes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: note }),
    });
    if (!res.ok) throw new Error(`Failed to save note: ${res.status}`);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${contact ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50 w-full max-w-md bg-gray-950 border-l border-gray-800
          transform transition-transform duration-300 ease-in-out
          ${contact ? 'translate-x-0' : 'translate-x-full'}
          flex flex-col
        `}
      >
        {!contact ? null : (
          <>
            {/* Header */}
            <div className="flex items-start gap-4 p-5 border-b border-gray-800">
              <div className="flex-shrink-0 w-14 h-14 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold text-xl">
                {[contact.firstName?.[0], contact.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?'}
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white truncate">{contact.name || '—'}</h2>
                <p className="text-sm text-gray-400 truncate">{contact.companyName || 'No company'}</p>
                <p className="text-sm text-indigo-400 mt-0.5">{contact.phone}</p>
              </div>

              <button
                onClick={onClose}
                className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white flex-shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Quick action buttons */}
            <div className="flex gap-3 px-5 py-4 border-b border-gray-800">
              <a
                href={`tel:${contact.phone}`}
                className="btn-success flex-1 text-center flex items-center justify-center gap-2"
              >
                📞 Call
              </a>
              <a
                href={`sms:${contact.phone}`}
                className="btn-primary flex-1 text-center flex items-center justify-center gap-2"
              >
                💬 Text
              </a>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800">
              {(['chat', 'info', 'call', 'notes'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`
                    flex-1 py-3 text-sm font-medium capitalize transition-colors duration-150
                    ${tab === t ? 'text-indigo-400 border-b-2 border-indigo-400' : 'text-gray-500 hover:text-gray-300'}
                  `}
                >
                  {t === 'chat' ? '💬 Chat' : t === 'info' ? '👤 Info' : t === 'call' ? '📞 Call' : '📝 Notes'}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {tab === 'chat' && (
                <ChatLog messages={messages} loading={msgLoading} error={msgError} />
              )}

              {tab === 'info' && (
                <div className="p-5 space-y-4">
                  {[
                    { label: 'Phone', value: contact.phone },
                    { label: 'Email', value: contact.email || '—' },
                    { label: 'Company', value: contact.companyName || '—' },
                    { label: 'Tags', value: contact.tags?.join(', ') || '—' },
                    { label: 'Added', value: contact.dateAdded ? new Date(contact.dateAdded).toLocaleDateString() : '—' },
                    { label: 'SMS Sent', value: String(contact.smsSentCount) },
                    { label: 'Tier', value: contact.tier || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500 uppercase tracking-wide">{label}</span>
                      <span className="text-base text-white">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'call' && (
                <div className="p-5">
                  <Softphone phone={contact.phone} name={contact.firstName || contact.name} />
                </div>
              )}

              {tab === 'notes' && (
                <div className="p-5">
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Add Note to GHL</h3>
                  <NoteForm contactId={contact.id} onSubmit={handleSaveNote} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

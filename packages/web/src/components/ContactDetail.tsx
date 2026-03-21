import { useState } from 'react';
import { X, Phone, MessageSquare, Mail, StickyNote, FileText, Briefcase, Info, Building2 } from 'lucide-react';
import type { Contact } from '../types';
import { ChatLog } from './ChatLog';
import { useMessages } from '../hooks/useMessages';
import { sendMessage, saveNote } from '../api';

interface ContactDetailProps {
  contact: Contact | null;
  onClose: () => void;
  onCall: (contact: Contact) => void;
}

type Tab = 'chat' | 'info' | 'notes' | 'documents' | 'deals';

const GRADIENTS = [
  'from-indigo-500 to-indigo-700', 'from-purple-500 to-indigo-600',
  'from-blue-500 to-cyan-600', 'from-green-500 to-teal-600',
  'from-orange-500 to-red-600', 'from-pink-500 to-rose-600',
];

function gradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function tierBadge(tier?: string) {
  switch (tier) {
    case 'hot': return { cls: 'badge-hot', label: '🔥 Hot Lead' };
    case 'warm': return { cls: 'badge-warm', label: '🌤 Warm' };
    case 'cold': return { cls: 'badge-cold', label: '❄️ Cold' };
    case 'funded': return { cls: 'badge-funded', label: '💰 Funded' };
    default: return tier ? { cls: 'badge-default', label: tier } : null;
  }
}

function NotesTab({ contact }: { contact: Contact }) {
  const [notes, setNotes] = useState<{ id: string; body: string; ts: string }[]>([]);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    const body = note.trim();
    if (!body) return;
    setSaving(true);
    try {
      await saveNote(contact.id, body);
      setNotes((prev) => [{ id: Date.now().toString(), body, ts: new Date().toISOString() }, ...prev]);
      setNote('');
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="space-y-2">
        <label className="text-xs text-gray-500 uppercase tracking-wide font-medium">Add Note</label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Enter a note about this contact…"
          className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 resize-none"
        />
        <button
          onClick={handleSave}
          disabled={!note.trim() || saving}
          className="btn-primary py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save Note'}
        </button>
      </div>
      {notes.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Notes</p>
          {notes.map((n) => (
            <div key={n.id} className="bg-gray-800 rounded-xl p-3 text-sm text-gray-200">
              <p>{n.body}</p>
              <p className="text-xs text-gray-600 mt-1">{new Date(n.ts).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DocumentsTab({ contact }: { contact: Contact }) {
  const hasDocs = contact.tags?.some((t) => t.toLowerCase().includes('doc'));
  return (
    <div className="p-4">
      {hasDocs ? (
        <div className="space-y-2">
          <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-3">Received Documents</p>
          <div className="bg-gray-800 rounded-xl p-3 flex items-center gap-3">
            <FileText size={18} className="text-purple-400" />
            <div>
              <p className="text-sm text-white font-medium">Bank Statements</p>
              <p className="text-xs text-gray-500">Received via portal</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <FileText size={36} className="mb-3 opacity-40" />
          <p className="text-sm">No documents received yet</p>
        </div>
      )}
    </div>
  );
}

function DealsTab({ contact }: { contact: Contact }) {
  const funded = contact.tags?.some((t) => t.toLowerCase().includes('fund'));
  return (
    <div className="p-4">
      {funded ? (
        <div className="bg-green-900/30 border border-green-700/40 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="badge-funded">💰 Funded</span>
          </div>
          <p className="text-sm text-gray-300 mt-2">Deal marked as funded</p>
          <p className="text-xs text-gray-500 mt-1">Source: {contact.source || 'Unknown'}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-gray-500">
          <Briefcase size={36} className="mb-3 opacity-40" />
          <p className="text-sm">No deals yet</p>
        </div>
      )}
    </div>
  );
}

export function ContactDetail({ contact, onClose, onCall }: ContactDetailProps) {
  const [tab, setTab] = useState<Tab>('chat');
  const { messages, loading: msgLoading, error: msgError, reload } = useMessages(contact?.phone ?? null);

  const handleSend = async (text: string) => {
    if (!contact) return;
    await sendMessage(contact.phone, text);
    reload();
  };

  const initials = contact
    ? ([contact.firstName?.[0], contact.lastName?.[0]].filter(Boolean).join('').toUpperCase() || contact.name?.[0]?.toUpperCase() || '?')
    : '?';
  const gradient = contact ? gradientForName(contact.name || contact.id || '') : GRADIENTS[0];
  const badge = contact ? tierBadge(contact.tier) : null;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat', icon: <MessageSquare size={14} /> },
    { id: 'info', label: 'Info', icon: <Info size={14} /> },
    { id: 'notes', label: 'Notes', icon: <StickyNote size={14} /> },
    { id: 'documents', label: 'Docs', icon: <FileText size={14} /> },
    { id: 'deals', label: 'Deals', icon: <Briefcase size={14} /> },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 transition-opacity duration-300 ${contact ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`
          fixed inset-y-0 right-0 z-50 w-full sm:max-w-lg bg-gray-950 border-l border-gray-800
          transform transition-transform duration-300 ease-in-out flex flex-col
          ${contact ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {!contact ? null : (
          <>
            {/* Header */}
            <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-800 flex-shrink-0">
              <div className={`flex-shrink-0 w-14 h-14 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white truncate leading-tight">{contact.name || '—'}</h2>
                <p className="text-sm text-gray-400 truncate">{contact.companyName || 'No company'}</p>
                {badge && <span className={`${badge.cls} mt-1 inline-block`}>{badge.label}</span>}
              </div>
              <button onClick={onClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white flex-shrink-0">
                <X size={18} />
              </button>
            </div>

            {/* Quick actions */}
            <div className="flex gap-2 px-5 py-3 border-b border-gray-800 flex-shrink-0">
              <button
                onClick={() => onCall(contact)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
              >
                <Phone size={14} /> Call
              </button>
              <button
                onClick={() => setTab('chat')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors"
              >
                <MessageSquare size={14} /> Text
              </button>
              <a
                href={`mailto:${contact.email}`}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition-colors"
              >
                <Mail size={14} /> Email
              </a>
              <button
                onClick={() => setTab('notes')}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-white text-sm font-semibold transition-colors"
              >
                <StickyNote size={14} /> Note
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-800 flex-shrink-0">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                    tab === t.id ? 'tab-active' : 'tab-inactive'
                  }`}
                >
                  {t.icon}
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-hidden">
              {tab === 'chat' && (
                <div className="h-full flex flex-col">
                  <ChatLog
                    messages={messages}
                    loading={msgLoading}
                    error={msgError}
                    onSend={handleSend}
                  />
                </div>
              )}

              {tab === 'info' && (
                <div className="overflow-y-auto h-full p-4 space-y-3">
                  {[
                    { label: 'Phone', value: contact.phone, icon: <Phone size={14} /> },
                    { label: 'Email', value: contact.email || '—', icon: <Mail size={14} /> },
                    { label: 'Company', value: contact.companyName || '—', icon: <Building2 size={14} /> },
                    { label: 'Source', value: contact.source || '—', icon: null },
                    { label: 'Agent', value: contact.agent || '—', icon: null },
                    { label: 'Stage', value: contact.stage || contact.tier || '—', icon: null },
                    { label: 'Trust Score', value: contact.trustScore ? `${contact.trustScore}/100` : '—', icon: null },
                    { label: 'Industry', value: contact.industry || '—', icon: null },
                    { label: 'Monthly Revenue', value: contact.monthlyRevenue ? `$${contact.monthlyRevenue.toLocaleString()}` : '—', icon: null },
                    { label: 'Time in Business', value: contact.timeInBusiness || '—', icon: null },
                    { label: 'Tags', value: contact.tags?.join(', ') || '—', icon: null },
                    { label: 'Date Added', value: contact.dateAdded ? new Date(contact.dateAdded).toLocaleDateString() : '—', icon: null },
                    { label: 'SMS Sent', value: String(contact.smsSentCount), icon: null },
                  ].map(({ label, value, icon }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <span className="text-xs text-gray-500 uppercase tracking-wide flex items-center gap-1">
                        {icon}{label}
                      </span>
                      <span className="text-sm text-white">{value}</span>
                    </div>
                  ))}
                </div>
              )}

              {tab === 'notes' && (
                <div className="overflow-y-auto h-full">
                  <NotesTab contact={contact} />
                </div>
              )}

              {tab === 'documents' && (
                <div className="overflow-y-auto h-full">
                  <DocumentsTab contact={contact} />
                </div>
              )}

              {tab === 'deals' && (
                <div className="overflow-y-auto h-full">
                  <DealsTab contact={contact} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}

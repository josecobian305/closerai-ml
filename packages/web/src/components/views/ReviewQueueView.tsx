import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, FileText, MessageSquare, Send, Check, X, ExternalLink,
  ChevronRight, RefreshCw, AlertTriangle, Zap, File, Eye, CheckSquare,
  Square, Loader2
} from 'lucide-react';

const _apiBase = typeof window !== 'undefined' && window.location.hostname === 'closerai.apipay.cash' ? '/api/v1' : '/app/api/v1';
const API = _apiBase + '/pipeline';

interface Contact {
  id: string;
  phone: string;
  name: string;
  business: string;
  email: string;
  state: string;
  industry: string;
  monthly_revenue: string;
  credit_score: string;
  loan_amount: string;
  priority: string;
  segment: string;
  status: string;
  ghl_tags: string;
  doc_count: number;
  last_activity: string;
  last_message: string;
}

interface Document {
  id: string;
  doc_type: string;
  s3_key: string;
  filename: string;
  file_size: number;
  presigned_url: string | null;
}

interface Communication {
  id: string;
  comm_type: string;
  message: string;
  ts: string;
  agent: string;
  category: string;
}

interface LenderMatch {
  rank: number;
  lender_id?: string;
  lender_name?: string;
  name?: string;
  score?: number;
  match_score?: number;
  application_type: string;
  products?: string[];
  funding_speed?: string;
  contact_email?: string;
}

const PRIORITY_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  hyper: { label: 'HYPER', emoji: '⚡', color: 'text-purple-400', bg: 'bg-purple-500/20 border-purple-500/40' },
  docs_received: { label: 'Docs', emoji: '📄', color: 'text-blue-400', bg: 'bg-blue-500/20 border-blue-500/40' },
  urgent: { label: 'Hot', emoji: '🔥', color: 'text-orange-400', bg: 'bg-orange-500/20 border-orange-500/40' },
  interested: { label: 'Interested', emoji: '🟢', color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/40' },
  warm: { label: 'Warm', emoji: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/40' },
};

function timeAgo(ts: string): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatBytes(bytes: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

// ─── Contact List Card ──────────────────────────────────────────
function ContactCard({ contact, selected, onClick }: { contact: Contact; selected: boolean; onClick: () => void }) {
  const p = PRIORITY_CONFIG[contact.priority] || PRIORITY_CONFIG.warm;
  return (
    <div
      onClick={onClick}
      className={`p-3 border-b border-[var(--border)]/50 cursor-pointer transition-all ${
        selected ? 'bg-blue-600/20 border-l-2 border-l-blue-500' : 'hover:bg-[var(--bg-elevated)]/50 border-l-2 border-l-transparent'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-white truncate">{contact.business || 'Unknown Business'}</div>
          <div className="text-xs text-[var(--text-muted)] truncate">{contact.name} · {contact.phone}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${p.bg}`}>
            {p.emoji} {p.label}
          </span>
          {contact.doc_count > 0 && (
            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5">
              <FileText size={10} /> {contact.doc_count}
            </span>
          )}
        </div>
      </div>
      {contact.last_activity && (
        <div className="text-[10px] text-[var(--text-muted)] mt-1">{timeAgo(contact.last_activity)}</div>
      )}
      {contact.status === 'submitted' && (
        <div className="text-[10px] text-green-400 mt-0.5 flex items-center gap-1">
          <Check size={10} /> Submitted
        </div>
      )}
    </div>
  );
}

// ─── SMS Thread ─────────────────────────────────────────────────
function SmsThread({ communications }: { communications: Communication[] }) {
  const sms = communications.filter(c => c.comm_type === 'sms_in' || c.comm_type === 'sms_out');
  if (sms.length === 0) return <div className="text-[var(--text-muted)] text-sm p-4">No SMS history</div>;

  return (
    <div className="space-y-2 max-h-64 overflow-y-auto p-3">
      {sms.map((msg) => {
        const isInbound = msg.comm_type === 'sms_in';
        return (
          <div key={msg.id} className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
            <div className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
              isInbound
                ? 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                : 'bg-blue-600 text-white'
            }`}>
              <div>{msg.message}</div>
              <div className="text-[10px] mt-1 opacity-60 flex items-center gap-1">
                {msg.ts ? new Date(msg.ts).toLocaleString() : ''}
                {msg.agent && <span>· {msg.agent}</span>}
                {msg.category && <span className="bg-black/20 px-1 rounded">{msg.category}</span>}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Document List ──────────────────────────────────────────────
function DocList({ documents, selectedDocs, onToggle }: {
  documents: Document[];
  selectedDocs: Set<string>;
  onToggle: (id: string) => void;
}) {
  const grouped = {
    chc_application: documents.filter(d => d.doc_type === 'chc_application'),
    wotr_application: documents.filter(d => d.doc_type === 'wotr_application'),
    bank_statement: documents.filter(d => d.doc_type === 'bank_statement'),
  };

  const renderDoc = (doc: Document) => (
    <div key={doc.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-[var(--bg-elevated)]/50 rounded text-sm">
      <button onClick={() => onToggle(doc.id)} className="shrink-0">
        {selectedDocs.has(doc.id)
          ? <CheckSquare size={16} className="text-blue-400" />
          : <Square size={16} className="text-[var(--text-muted)]" />}
      </button>
      <File size={14} className="text-[var(--text-muted)] shrink-0" />
      <span className="truncate text-[var(--text-secondary)] flex-1">{doc.filename}</span>
      {doc.file_size > 0 && <span className="text-[10px] text-[var(--text-muted)] shrink-0">{formatBytes(doc.file_size)}</span>}
      {doc.presigned_url && (
        <a href={doc.presigned_url} target="_blank" rel="noopener" className="shrink-0">
          <Eye size={14} className="text-blue-400 hover:text-blue-300" />
        </a>
      )}
    </div>
  );

  return (
    <div className="space-y-3">
      {grouped.chc_application.length > 0 && (
        <div>
          <div className="text-xs font-medium text-[var(--text-muted)] mb-1 px-2">CHC Application</div>
          {grouped.chc_application.map(renderDoc)}
        </div>
      )}
      {grouped.wotr_application.length > 0 && (
        <div>
          <div className="text-xs font-medium text-[var(--text-muted)] mb-1 px-2">WOTR Application</div>
          {grouped.wotr_application.map(renderDoc)}
        </div>
      )}
      {grouped.bank_statement.length > 0 && (
        <div>
          <div className="text-xs font-medium text-[var(--text-muted)] mb-1 px-2">Bank Statements ({grouped.bank_statement.length})</div>
          {grouped.bank_statement.map(renderDoc)}
        </div>
      )}
    </div>
  );
}

// ─── Lender Match Results ───────────────────────────────────────
function LenderMatchPanel({ matches, selectedLenders, onToggle }: {
  matches: LenderMatch[];
  selectedLenders: Set<number>;
  onToggle: (idx: number) => void;
}) {
  if (matches.length === 0) return <div className="text-[var(--text-muted)] text-sm p-3">No lender matches</div>;

  return (
    <div className="space-y-1 max-h-72 overflow-y-auto">
      {matches.slice(0, 15).map((m, i) => {
        const name = m.lender_name || m.name || `Lender #${m.rank}`;
        const score = m.match_score || m.score || 0;
        const isSelected = selectedLenders.has(i);

        return (
          <div key={i} className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-all ${
            isSelected ? 'bg-blue-600/15 border border-blue-500/30' : 'hover:bg-[var(--bg-elevated)]/50 border border-transparent'
          }`} onClick={() => onToggle(i)}>
            <div className="shrink-0">
              {isSelected
                ? <CheckSquare size={16} className="text-blue-400" />
                : <Square size={16} className="text-[var(--text-muted)]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white truncate">{name}</div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  m.application_type === 'WOTR' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                }`}>{m.application_type}</span>
                {m.products && <span className="text-[10px] text-[var(--text-muted)] truncate">{
                  Array.isArray(m.products) ? m.products.join(', ') : m.products
                }</span>}
                {m.funding_speed && <span className="text-[10px] text-[var(--text-muted)]">⚡ {m.funding_speed}</span>}
              </div>
            </div>
            <div className="shrink-0 w-20">
              <div className="bg-[var(--bg-elevated)] rounded-full h-1.5 w-full">
                <div className="bg-green-500 rounded-full h-1.5" style={{ width: `${Math.min(score, 100)}%` }} />
              </div>
              <div className="text-[10px] text-[var(--text-muted)] text-right mt-0.5">{score}%</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Confirm Modal ──────────────────────────────────────────────
function ConfirmModal({ contact, lenders, docCount, notes, onNotesChange, onConfirm, onCancel, submitting }: {
  contact: Contact;
  lenders: { lender_name: string; app_type: string; contact_email: string }[];
  docCount: number;
  notes: string;
  onNotesChange: (n: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6">
        <h3 className="text-lg font-bold text-white mb-4">Confirm Submission</h3>
        <div className="text-sm text-[var(--text-secondary)] mb-4">
          <div className="font-medium">{contact.business}</div>
          <div className="text-[var(--text-muted)]">{contact.name} · {contact.phone}</div>
        </div>

        <div className="mb-4">
          <div className="text-xs text-[var(--text-muted)] mb-2">Sending to {lenders.length} lenders:</div>
          <div className="space-y-1">
            {lenders.map((l, i) => (
              <div key={i} className="flex items-center gap-2 text-sm bg-[var(--bg-elevated)] rounded px-3 py-1.5">
                <span className="text-white flex-1">{l.lender_name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  l.app_type === 'WOTR' ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                }`}>{l.app_type}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="text-sm text-[var(--text-muted)] mb-4">
          📎 {docCount} documents attached per lender
        </div>

        <div className="mb-4">
          <label className="text-xs text-[var(--text-muted)] block mb-1">Agent Notes</label>
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white resize-none h-20"
            placeholder="Additional notes for the submission..."
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg text-sm hover:bg-[var(--bg-elevated)]">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? 'Sending...' : 'CONFIRM & SEND'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main View ──────────────────────────────────────────────────
export function ReviewQueueView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false); // Mobile: show detail panel
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [selectedLenders, setSelectedLenders] = useState<Set<number>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitNotes, setSubmitNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitResults, setSubmitResults] = useState<any[] | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/review-queue`);
      const data = await resp.json();
      setContacts(data.contacts || []);
    } catch (err) {
      console.error('Failed to load review queue', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const loadDetail = useCallback(async (contactId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setSubmitResults(null);
    try {
      const resp = await fetch(`${API}/review/${contactId}`);
      const data = await resp.json();
      setDetail(data);
      // Select all docs by default
      const allDocIds = new Set((data.documents || []).map((d: Document) => d.id));
      setSelectedDocs(allDocIds);
      // Pre-select top 5 lenders
      const top5 = new Set(
        (data.lender_matches || []).slice(0, 5).map((_: any, i: number) => i)
      );
      setSelectedLenders(top5);
    } catch (err) {
      console.error('Failed to load contact detail', err);
    }
    setDetailLoading(false);
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setShowDetail(true); // Mobile: switch to detail view
    loadDetail(id);
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleLender = (idx: number) => {
    setSelectedLenders(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx); else next.add(idx);
      return next;
    });
  };

  const getSelectedLenderDetails = () => {
    if (!detail?.lender_matches) return [];
    return Array.from(selectedLenders)
      .filter(i => i < detail.lender_matches.length)
      .map(i => {
        const m = detail.lender_matches[i];
        return {
          lender_id: m.lender_id || m.id || '',
          lender_name: m.lender_name || m.name || '',
          contact_email: m.contact_email || m.email || '',
          app_type: m.application_type || 'CHC',
        };
      });
  };

  const handleSubmit = async () => {
    if (!selectedId || !detail) return;
    setSubmitting(true);
    try {
      const resp = await fetch(`${API}/review/${selectedId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lenders: getSelectedLenderDetails(),
          notes: submitNotes,
          agent: 'Jose',
        }),
      });
      const data = await resp.json();
      setSubmitResults(data.results || []);
      setShowConfirm(false);
      // Refresh queue
      loadQueue();
    } catch (err) {
      console.error('Submit failed', err);
    }
    setSubmitting(false);
  };

  // Filter contacts
  const filtered = contacts.filter(c => {
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        (c.business || '').toLowerCase().includes(q) ||
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').includes(q)
      );
    }
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-[var(--bg-base)] text-white relative overflow-hidden">
      {/* LEFT PANEL: Contact List */}
      <div className={`${showDetail ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-[var(--border)] flex-col shrink-0`}>
        <div className="p-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold flex-1">Review Queue</h2>
            <button onClick={loadQueue} className="p-1 hover:bg-[var(--bg-elevated)] rounded">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
          <div className="relative mb-2">
            <Search size={14} className="absolute left-2.5 top-2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-[var(--text-subtle)]"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {['all', 'hyper', 'docs_received', 'urgent', 'warm'].map(f => (
              <button
                key={f}
                onClick={() => setFilterPriority(f)}
                className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                  filterPriority === f
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                    : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border)]'
                }`}
              >
                {f === 'all' ? 'All' : (PRIORITY_CONFIG[f]?.emoji || '') + ' ' + (PRIORITY_CONFIG[f]?.label || f)}
              </button>
            ))}
          </div>
          <div className="text-[10px] text-[var(--text-muted)] mt-1.5">{filtered.length} contacts</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 size={20} className="animate-spin text-[var(--text-muted)]" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-[var(--text-muted)] text-sm p-8">No contacts found</div>
          ) : (
            filtered.map(c => (
              <ContactCard
                key={c.id}
                contact={c}
                selected={c.id === selectedId}
                onClick={() => handleSelect(c.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* CENTER PANEL: Contact Detail */}
      <div className={`${showDetail ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-y-auto`}>
        {!selectedId ? (
          <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
            <FileText size={48} className="mb-4 opacity-30" />
            <p className="text-sm">Select a contact to review</p>
          </div>
        ) : detailLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
          </div>
        ) : detail ? (
          <div className="p-4 space-y-4 max-w-3xl">
            {/* Mobile back button */}
            <button
              onClick={() => setShowDetail(false)}
              className="md:hidden flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-2"
            >
              <span>←</span> Back to contacts
            </button>
            {/* Success banner */}
            {submitResults && (
              <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3">
                <div className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                  <Check size={16} /> Submission Complete
                </div>
                {submitResults.map((r: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm py-0.5">
                    {r.status === 'sent'
                      ? <Check size={14} className="text-green-400" />
                      : <X size={14} className="text-red-400" />}
                    <span className="text-[var(--text-secondary)]">{r.lender_name}</span>
                    <span className={`text-[10px] ${r.status === 'sent' ? 'text-green-400' : 'text-red-400'}`}>
                      {r.status === 'sent' ? 'Sent' : r.error}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Profile */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">{detail.contact.business || 'Unknown Business'}</h3>
                  <div className="text-sm text-[var(--text-muted)]">{detail.contact.name}</div>
                  <div className="text-sm text-[var(--text-muted)]">{detail.contact.phone} · {detail.contact.email}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded border font-medium ${
                  PRIORITY_CONFIG[detail.contact.priority]?.bg || 'bg-[var(--bg-elevated)] border-[var(--border)]'
                }`}>
                  {PRIORITY_CONFIG[detail.contact.priority]?.emoji} {PRIORITY_CONFIG[detail.contact.priority]?.label || detail.contact.priority}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {[
                  { label: 'Industry', value: detail.contact.industry },
                  { label: 'State', value: detail.contact.state },
                  { label: 'Monthly Rev', value: detail.contact.monthly_revenue ? `$${Number(detail.contact.monthly_revenue).toLocaleString()}` : '' },
                  { label: 'Credit Score', value: detail.contact.credit_score },
                  { label: 'Loan Amount', value: detail.contact.loan_amount ? `$${Number(detail.contact.loan_amount).toLocaleString()}` : '' },
                  { label: 'Source', value: detail.contact.source },
                ].filter(f => f.value).map((f, i) => (
                  <div key={i}>
                    <div className="text-[10px] text-[var(--text-muted)] uppercase">{f.label}</div>
                    <div className="text-sm text-gray-200">{f.value}</div>
                  </div>
                ))}
              </div>
              {detail.contact.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {detail.contact.tags.map((t: string, i: number) => (
                    <span key={i} className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* SMS Thread */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
              <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2">
                <MessageSquare size={14} className="text-[var(--text-muted)]" />
                <span className="text-sm font-medium">SMS Thread</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  ({(detail.communications || []).filter((c: any) => c.comm_type.startsWith('sms')).length} messages)
                </span>
              </div>
              <SmsThread communications={detail.communications || []} />
            </div>

            {/* Documents */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
              <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2">
                <FileText size={14} className="text-[var(--text-muted)]" />
                <span className="text-sm font-medium">Documents</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {detailLoading ? 'Loading...' : `(${(detail?.documents || []).length} files)`}
                </span>
              </div>
              <div className="p-2">
                <DocList documents={detail.documents || []} selectedDocs={selectedDocs} onToggle={toggleDoc} />
              </div>
            </div>

            {/* Statement Analysis */}
            {detail.statement_analysis && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4">
                <div className="text-sm font-medium mb-2 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-yellow-400" />
                  Statement Analysis
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detail.statement_analysis.avg_revenue && (
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)]">Avg Revenue</div>
                      <div className="text-gray-200">{detail.statement_analysis.avg_revenue}</div>
                    </div>
                  )}
                  {detail.statement_analysis.negative_days != null && (
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)]">Negative Days</div>
                      <div className="text-gray-200">{detail.statement_analysis.negative_days}</div>
                    </div>
                  )}
                  {detail.statement_analysis.position && (
                    <div>
                      <div className="text-[10px] text-[var(--text-muted)]">Position</div>
                      <div className="text-gray-200">{detail.statement_analysis.position}</div>
                    </div>
                  )}
                  {detail.statement_analysis.red_flags && (
                    <div className="col-span-2">
                      <div className="text-[10px] text-[var(--text-muted)]">Red Flags</div>
                      <div className="text-gray-200 text-xs">{
                        Array.isArray(detail.statement_analysis.red_flags)
                          ? detail.statement_analysis.red_flags.join(', ')
                          : detail.statement_analysis.red_flags
                      }</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lender Matches */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg">
              <div className="px-4 py-2 border-b border-[var(--border)] flex items-center gap-2">
                <Zap size={14} className="text-yellow-400" />
                <span className="text-sm font-medium">Lender Matches</span>
                <span className="text-[10px] text-[var(--text-muted)]">({(detail.lender_matches || []).length} matches)</span>
              </div>
              <div className="p-2">
                <LenderMatchPanel
                  matches={detail.lender_matches || []}
                  selectedLenders={selectedLenders}
                  onToggle={toggleLender}
                />
              </div>
            </div>

            {/* Submit Panel */}
            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 sticky bottom-0">
              <div className="flex items-center justify-between">
                <div className="text-sm text-[var(--text-muted)]">
                  Sending to <span className="text-white font-medium">{selectedLenders.size}</span> lenders,{' '}
                  <span className="text-white font-medium">{selectedDocs.size}</span> documents attached
                </div>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={selectedLenders.size === 0 || detail.contact.status === 'submitted'}
                  className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-medium text-sm hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Send size={16} />
                  Send Submission Package
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Confirm Modal */}
      {showConfirm && detail && (
        <ConfirmModal
          contact={detail.contact}
          lenders={getSelectedLenderDetails()}
          docCount={selectedDocs.size}
          notes={submitNotes}
          onNotesChange={setSubmitNotes}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}

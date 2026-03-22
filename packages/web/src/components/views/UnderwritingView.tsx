import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, FileText, MessageSquare, Send, Check, X, ChevronDown, ChevronUp,
  RefreshCw, AlertTriangle, Zap, File, Eye, CheckSquare, Square, Loader2,
  Upload, Pause, ClipboardList, Shield, TrendingUp, Star, Building2, ArrowLeft
} from 'lucide-react';

const _apiBase = typeof window !== 'undefined' && window.location.hostname === 'closerai.apipay.cash' ? '/api/v1' : '/app/api/v1';
const API = _apiBase + '/underwriting';
const DOC_API = '/app/api/v1/pipeline/doc';

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface QueueContact {
  id: string; phone: string; name: string; business: string; email: string;
  state: string; industry: string; monthly_revenue: string; credit_score: string;
  loan_amount: string; priority: string; segment: string; status: string;
  ghl_tags: string; tags: string[]; score: number;
  doc_count: number; bank_stmt_count: number; app_count: number;
  credit_report_count: number; bg_check_count: number;
  last_statement_date: string; last_activity: string; last_message: string;
}

interface Doc {
  id: string; doc_type: string; s3_key: string; s3_bucket: string;
  filename: string; file_size: number; presigned_url: string | null; uploaded_at: string;
}

interface LenderMatch {
  rank: number; lender_id?: string; lender_name?: string; name?: string;
  score?: number; match_score?: number; application_type: string;
  products?: string[]; product_types?: string[]; funding_speed?: string;
  max_amount?: number; min_credit_score?: number;
  contact_email?: string; email?: string; why?: string;
  match_reasons?: string[];
}

interface Lender {
  lender_id: string; lender_name: string; name?: string;
  app_type: 'CHC' | 'WOTR'; contact_email?: string;
  product_types?: string[]; products?: string[];
  max_amount?: number; min_credit_score?: number; funding_speed?: string;
}

// ═══════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════

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

function scoreColor(s: number): string {
  if (s >= 85) return 'bg-green-500';
  if (s >= 70) return 'bg-yellow-500';
  return 'bg-red-500';
}

function scoreBadge(s: number): string {
  if (s >= 85) return 'text-green-400';
  if (s >= 70) return 'text-yellow-400';
  return 'text-red-400';
}

const PRIORITY_CONFIG: Record<string, { label: string; emoji: string; bg: string }> = {
  hyper: { label: 'HYPER', emoji: '⚡', bg: 'bg-purple-500/20 border-purple-500/40' },
  docs_received: { label: 'Docs', emoji: '📄', bg: 'bg-blue-500/20 border-blue-500/40' },
  urgent: { label: 'Hot', emoji: '🔥', bg: 'bg-orange-500/20 border-orange-500/40' },
  interested: { label: 'Interested', emoji: '🟢', bg: 'bg-green-500/20 border-green-500/40' },
  warm: { label: 'Warm', emoji: '🟡', bg: 'bg-yellow-500/20 border-yellow-500/40' },
};

const MISSING_DOC_OPTIONS = [
  '4th month bank statement',
  'Payoff letter',
  'Tax return',
  'MTD transactions',
  "Driver's license",
  'Voided check',
];

// ═══════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════

function QueueCard({ c, selected, onClick }: { c: QueueContact; selected: boolean; onClick: () => void }) {
  const p = PRIORITY_CONFIG[c.priority] || PRIORITY_CONFIG.warm;
  return (
    <div
      onClick={onClick}
      className={`p-3 border-b cursor-pointer transition-all ${
        selected ? 'bg-blue-600/20 border-l-2 border-l-blue-500 border-[var(--border)]/50' : 'hover:bg-[var(--bg-elevated)]/50 border-l-2 border-l-transparent border-[var(--border)]/50'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm text-white truncate">{c.business || 'Unknown Business'}</div>
          <div className="text-xs text-[var(--text-muted)] truncate">{c.name} · {c.phone}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium ${p.bg}`}>
            {p.emoji} {p.label}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-0.5"><FileText size={10} /> {c.bank_stmt_count} stmt{c.bank_stmt_count !== 1 ? 's' : ''}</span>
        {c.app_count > 0 && <span>📋 App</span>}
        {c.credit_report_count > 0 && <span>🔍 CR</span>}
        {c.doc_count > 0 && <span className="text-[var(--text-subtle)]">({c.doc_count} total)</span>}
      </div>
      {c.last_statement_date && <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">Last stmt: {timeAgo(c.last_statement_date)}</div>}
      {c.status === 'submitted' && (
        <div className="text-[10px] text-green-400 mt-0.5 flex items-center gap-1"><Check size={10} /> Submitted</div>
      )}
    </div>
  );
}

function Collapsible({ title, icon, children, defaultOpen = true, badge }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; badge?: string | number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-[var(--bg-elevated)]/50 transition-colors">
        {icon}
        <span className="text-sm font-medium flex-1 text-left">{title}</span>
        {badge !== undefined && <span className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">{badge}</span>}
        {open ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
      </button>
      {open && <div className="border-t border-[var(--border)]">{children}</div>}
    </div>
  );
}

function AppToggle({ value, onChange }: { value: 'CHC' | 'WOTR'; onChange: (v: 'CHC' | 'WOTR') => void }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-[var(--border)] text-xs">
      <button
        onClick={() => onChange('CHC')}
        className={`px-3 py-1.5 font-medium transition-colors ${
          value === 'CHC' ? 'bg-blue-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
      >CHC</button>
      <button
        onClick={() => onChange('WOTR')}
        className={`px-3 py-1.5 font-medium transition-colors ${
          value === 'WOTR' ? 'bg-purple-600 text-white' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
        }`}
      >WOTR</button>
    </div>
  );
}

// ─── Request Docs Modal ─────────────────────────────────────────
function RequestDocsModal({ contact, onConfirm, onCancel, submitting }: {
  contact: any; onConfirm: (docs: string[]) => void; onCancel: () => void; submitting: boolean;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (d: string) => { setSelected(prev => { const n = new Set(prev); n.has(d) ? n.delete(d) : n.add(d); return n; }); };
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl max-w-md w-full p-6">
        <h3 className="text-lg font-bold text-white mb-2">Request More Documents</h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">Select missing documents to request from {contact.business || contact.name}:</p>
        <div className="space-y-2 mb-4">
          {MISSING_DOC_OPTIONS.map(d => (
            <button key={d} onClick={() => toggle(d)} className={`w-full text-left flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
              selected.has(d) ? 'bg-blue-600/20 border border-blue-500/40 text-blue-300' : 'bg-[var(--bg-elevated)] border border-[var(--border)] text-[var(--text-secondary)] hover:bg-gray-750'
            }`}>
              {selected.has(d) ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-[var(--text-muted)]" />}
              {d}
            </button>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg text-sm hover:bg-[var(--bg-elevated)]">Cancel</button>
          <button
            onClick={() => onConfirm(Array.from(selected))}
            disabled={selected.size === 0 || submitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? 'Sending...' : `Send SMS (${selected.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Approve Confirm Modal ──────────────────────────────────────
function ApproveModal({ contact, lenders, onConfirm, onCancel, submitting }: {
  contact: any; lenders: { lender_name: string; app_type: string; contact_email: string }[];
  onConfirm: (notes: string) => void; onCancel: () => void; submitting: boolean;
}) {
  const [notes, setNotes] = useState('');
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
                <span className="text-white flex-1 truncate">{l.lender_name}</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  l.app_type === 'WOTR' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                }`}>{l.app_type}</span>
                <span className="text-[10px] text-[var(--text-muted)] truncate max-w-[140px]">{l.contact_email}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="mb-4">
          <label className="text-xs text-[var(--text-muted)] block mb-1">Agent Notes</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-white resize-none h-20"
            placeholder="Additional notes..." />
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 bg-[var(--bg-elevated)] text-[var(--text-secondary)] rounded-lg text-sm hover:bg-[var(--bg-elevated)]">Cancel</button>
          <button onClick={() => onConfirm(notes)} disabled={submitting}
            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-500 disabled:opacity-50 flex items-center justify-center gap-2">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            {submitting ? 'Sending...' : 'CONFIRM & SEND'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// LENDERS SUB-TAB
// ═══════════════════════════════════════════════════════════════════

function LendersManager() {
  const [lenders, setLenders] = useState<Lender[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/lenders`);
      const data = await resp.json();
      setLenders(data.lenders || []);
    } catch (err) { console.error('Failed to load lenders', err); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateRouting = async (lenderId: string, appType: 'CHC' | 'WOTR') => {
    setSaving(lenderId);
    try {
      await fetch(`${API}/lenders/${encodeURIComponent(lenderId)}/routing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ app_type: appType }),
      });
      setLenders(prev => prev.map(l =>
        (l.lender_id === lenderId) ? { ...l, app_type: appType } : l
      ));
    } catch (err) { console.error('Failed to update routing', err); }
    setSaving(null);
  };

  const filtered = lenders.filter(l => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (l.lender_name || l.name || '').toLowerCase().includes(q);
  });

  const chcLenders = filtered.filter(l => l.app_type === 'CHC');
  const wotrLenders = filtered.filter(l => l.app_type === 'WOTR');

  const renderLender = (l: Lender) => {
    const name = l.lender_name || l.name || 'Unknown';
    const products = l.product_types || l.products || [];
    return (
      <div key={l.lender_id} className="flex items-center gap-3 p-3 border-b border-[var(--border)] hover:bg-[var(--bg-elevated)]/30 transition-colors">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-white">{name}</div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {(Array.isArray(products) ? products : []).map((p, i) => (
              <span key={i} className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-muted)] px-1.5 py-0.5 rounded">{p}</span>
            ))}
            {l.max_amount && <span className="text-[10px] text-[var(--text-muted)]">Max: ${Number(l.max_amount).toLocaleString()}</span>}
            {l.funding_speed && <span className="text-[10px] text-[var(--text-muted)]">⚡ {l.funding_speed}</span>}
            {l.min_credit_score && <span className="text-[10px] text-[var(--text-muted)]">Min CS: {l.min_credit_score}</span>}
          </div>
          {l.contact_email && <div className="text-[10px] text-[var(--text-subtle)] mt-0.5">{l.contact_email}</div>}
        </div>
        <div className="shrink-0 relative">
          {saving === l.lender_id && (
            <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-card)]/50 rounded-lg z-10">
              <Loader2 size={14} className="animate-spin text-blue-400" />
            </div>
          )}
          <AppToggle value={l.app_type} onChange={(v) => updateRouting(l.lender_id, v)} />
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-[var(--text-muted)]" /></div>
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <div className="text-sm text-[var(--text-muted)] mb-3">
          Submitting companies: <span className="text-blue-400 font-medium">CHC Capital Group</span> | <span className="text-purple-400 font-medium">Way of the Road (WOTR)</span>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-2 text-[var(--text-muted)]" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lenders..."
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-[var(--text-subtle)]" />
        </div>
      </div>

      {wotrLenders.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <h3 className="text-sm font-bold text-purple-300">Way of the Road (WOTR)</h3>
            <span className="text-[10px] bg-purple-500/20 text-purple-400 px-1.5 py-0.5 rounded">{wotrLenders.length}</span>
          </div>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
            {wotrLenders.map(renderLender)}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <h3 className="text-sm font-bold text-blue-300">CHC Capital Group</h3>
          <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded">{chcLenders.length}</span>
        </div>
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg overflow-hidden">
          {chcLenders.map(renderLender)}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN UNDERWRITING VIEW
// ═══════════════════════════════════════════════════════════════════

export function UnderwritingView() {
  const [tab, setTab] = useState<'queue' | 'lenders'>('queue');
  const [contacts, setContacts] = useState<QueueContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [detail, setDetail] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [selectedLenders, setSelectedLenders] = useState<Set<number>>(new Set());
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitResults, setSubmitResults] = useState<any[] | null>(null);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API}/queue`);
      const data = await resp.json();
      setContacts(data.contacts || []);
    } catch (err) { console.error('Failed to load UW queue', err); }
    setLoading(false);
  }, []);

  useEffect(() => { loadQueue(); }, [loadQueue]);

  const loadDetail = useCallback(async (contactId: string) => {
    setDetailLoading(true);
    setDetail(null);
    setSubmitResults(null);
    try {
      const resp = await fetch(`${API}/${contactId}`);
      const data = await resp.json();
      setDetail(data);
      const allDocIds = new Set((data.documents || []).map((d: Doc) => d.id));
      setSelectedDocs(allDocIds);
      const top5 = new Set((data.lender_matches || []).slice(0, 5).map((_: any, i: number) => i));
      setSelectedLenders(top5);
    } catch (err) { console.error('Failed to load UW detail', err); }
    setDetailLoading(false);
  }, []);

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setShowDetail(true);
    loadDetail(id);
  };

  const toggleDoc = (id: string) => {
    setSelectedDocs(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const toggleLender = (idx: number) => {
    setSelectedLenders(prev => { const n = new Set(prev); n.has(idx) ? n.delete(idx) : n.add(idx); return n; });
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

  const handleApprove = async (notes: string) => {
    if (!selectedId || !detail) return;
    setSubmitting(true);
    try {
      const resp = await fetch(`${API}/${selectedId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lenders: getSelectedLenderDetails(), notes, agent: 'Jose', decision: 'approve' }),
      });
      const data = await resp.json();
      setSubmitResults(data.results || []);
      setShowApproveModal(false);
      loadQueue();
    } catch (err) { console.error('Approve failed', err); }
    setSubmitting(false);
  };

  const handlePause = async () => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/${selectedId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'pause', notes: 'Paused from Underwriting UI', agent: 'Jose' }),
      });
      loadQueue();
      loadDetail(selectedId);
    } catch (err) { console.error('Pause failed', err); }
    setSubmitting(false);
  };

  const handleRequestDocs = async (docs: string[]) => {
    if (!selectedId) return;
    setSubmitting(true);
    try {
      await fetch(`${API}/${selectedId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: 'request_docs', missing_docs: docs, agent: 'Jose' }),
      });
      setShowRequestModal(false);
      loadQueue();
    } catch (err) { console.error('Request docs failed', err); }
    setSubmitting(false);
  };

  const handleUpload = async (docType: string) => {
    if (!selectedId) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.pdf,.jpg,.jpeg,.png';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      setUploadingType(docType);
      try {
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          await fetch(`${API}/${selectedId}/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ filename: file.name, content_base64: base64, doc_type: docType }),
          });
          loadDetail(selectedId);
          setUploadingType(null);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error('Upload failed', err);
        setUploadingType(null);
      }
    };
    input.click();
  };

  const filtered = contacts.filter(c => {
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    if (search) {
      const q = search.toLowerCase();
      return (c.business || '').toLowerCase().includes(q) || (c.name || '').toLowerCase().includes(q) || (c.phone || '').includes(q);
    }
    return true;
  });

  // ── TAB HEADER ──
  const renderTabs = () => (
    <div className="flex items-center gap-1 px-3 py-2 border-b border-[var(--border)] bg-[var(--bg-card)]/50">
      <button onClick={() => setTab('queue')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        tab === 'queue' ? 'bg-blue-600/20 text-blue-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
      }`}>
        <span className="flex items-center gap-1.5"><ClipboardList size={14} /> Queue</span>
      </button>
      <button onClick={() => setTab('lenders')} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        tab === 'lenders' ? 'bg-purple-600/20 text-purple-400' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
      }`}>
        <span className="flex items-center gap-1.5"><Building2 size={14} /> Lenders</span>
      </button>
    </div>
  );

  if (tab === 'lenders') {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] bg-[var(--bg-base)] text-white">
        {renderTabs()}
        <div className="flex-1 overflow-y-auto p-4">
          <LendersManager />
        </div>
      </div>
    );
  }

  // ── QUEUE TAB ──
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-[var(--bg-base)] text-white">
      {renderTabs()}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT: Queue */}
        <div className={`${showDetail ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-[var(--border)] flex-col shrink-0`}>
          <div className="p-3 border-b border-[var(--border)]">
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-bold flex-1">Underwriting Queue</h2>
              <span className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded">{filtered.length}</span>
              <button onClick={loadQueue} className="p-1 hover:bg-[var(--bg-elevated)] rounded"><RefreshCw size={14} className={loading ? 'animate-spin' : ''} /></button>
            </div>
            <div className="relative mb-2">
              <Search size={14} className="absolute left-2.5 top-2 text-[var(--text-muted)]" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search..."
                className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg pl-8 pr-3 py-1.5 text-sm text-white placeholder-[var(--text-subtle)]" />
            </div>
            <div className="flex gap-1 flex-wrap">
              {['all', 'hyper', 'docs_received', 'urgent', 'warm'].map(f => (
                <button key={f} onClick={() => setFilterPriority(f)} className={`text-[10px] px-2 py-1 rounded-full border transition-all ${
                  filterPriority === f ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border)]'
                }`}>
                  {f === 'all' ? 'All' : (PRIORITY_CONFIG[f]?.emoji || '') + ' ' + (PRIORITY_CONFIG[f]?.label || f)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32"><Loader2 size={20} className="animate-spin text-[var(--text-muted)]" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center text-[var(--text-muted)] text-sm p-8">No contacts in queue</div>
            ) : (
              filtered.map(c => <QueueCard key={c.id} c={c} selected={c.id === selectedId} onClick={() => handleSelect(c.id)} />)
            )}
          </div>
        </div>

        {/* RIGHT: Dossier */}
        <div className={`${showDetail ? 'flex' : 'hidden md:flex'} flex-1 flex-col overflow-y-auto`}>
          {!selectedId ? (
            <div className="flex flex-col items-center justify-center h-full text-[var(--text-muted)]">
              <Shield size={48} className="mb-4 opacity-30" />
              <p className="text-sm">Select a contact to review</p>
            </div>
          ) : detailLoading ? (
            <div className="flex items-center justify-center h-full"><Loader2 size={24} className="animate-spin text-[var(--text-muted)]" /></div>
          ) : detail ? (
            <div className="p-4 space-y-4 max-w-4xl pb-32">
              {/* Mobile back */}
              <button onClick={() => setShowDetail(false)} className="md:hidden flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 mb-2">
                <ArrowLeft size={14} /> Back
              </button>

              {/* Success banner */}
              {submitResults && (
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3">
                  <div className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2"><Check size={16} /> Sent to {submitResults.filter((r: any) => r.status === 'sent').length} lenders at {new Date().toLocaleTimeString()}</div>
                  {submitResults.map((r: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-0.5">
                      {r.status === 'sent' ? <Check size={14} className="text-green-400" /> : <X size={14} className="text-red-400" />}
                      <span className="text-[var(--text-secondary)]">{r.lender_name}</span>
                      <span className={`text-[10px] ${r.status === 'sent' ? 'text-green-400' : 'text-red-400'}`}>{r.status === 'sent' ? 'Sent' : r.error}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 1. Merchant Profile */}
              <Collapsible title="Merchant Profile" icon={<Building2 size={14} className="text-blue-400" />}>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold">{detail.contact.business || 'Unknown Business'}</h3>
                      <div className="text-sm text-[var(--text-muted)]">{detail.contact.name}</div>
                      <div className="text-sm text-[var(--text-muted)]">{detail.contact.phone} · {detail.contact.email || 'No email'}</div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded border font-medium ${PRIORITY_CONFIG[detail.contact.priority]?.bg || 'bg-[var(--bg-elevated)] border-[var(--border)]'}`}>
                      {PRIORITY_CONFIG[detail.contact.priority]?.emoji} {PRIORITY_CONFIG[detail.contact.priority]?.label || detail.contact.priority}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: 'Industry', value: detail.contact.industry },
                      { label: 'State', value: detail.contact.state },
                      { label: 'Monthly Revenue', value: detail.contact.monthly_revenue ? `$${Number(detail.contact.monthly_revenue).toLocaleString()}` : '' },
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
                    <div className="flex flex-wrap gap-1 mt-3">
                      {detail.contact.tags.map((t: string, i: number) => (
                        <span key={i} className="text-[10px] bg-indigo-500/15 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-500/30">{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Collapsible>

              {/* 2. Documents */}
              <Collapsible title="Documents" icon={<FileText size={14} className="text-green-400" />} badge={(detail.documents || []).length}>
                <div className="p-3 space-y-4">
                  {/* Bank Statements */}
                  {(() => {
                    const stmts = (detail.documents || []).filter((d: Doc) => d.doc_type === 'bank_statement');
                    return stmts.length > 0 ? (
                      <div>
                        <div className="text-xs font-medium text-[var(--text-muted)] mb-1 px-1">Bank Statements ({stmts.length})</div>
                        {stmts.map((doc: Doc) => (
                          <div key={doc.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-[var(--bg-elevated)]/50 rounded text-sm">
                            <button onClick={() => toggleDoc(doc.id)} className="shrink-0">
                              {selectedDocs.has(doc.id) ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-[var(--text-muted)]" />}
                            </button>
                            <File size={14} className="text-[var(--text-muted)] shrink-0" />
                            <span className="truncate text-[var(--text-secondary)] flex-1">{doc.filename}</span>
                            <span className="text-[10px] text-[var(--text-subtle)]">{doc.uploaded_at ? timeAgo(doc.uploaded_at) : ''}</span>
                            {doc.file_size > 0 && <span className="text-[10px] text-[var(--text-muted)]">{formatBytes(doc.file_size)}</span>}
                            {doc.presigned_url && <a href={doc.presigned_url} target="_blank" rel="noopener"><Eye size={14} className="text-blue-400 hover:text-blue-300" /></a>}
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {/* Applications */}
                  {(() => {
                    const apps = (detail.documents || []).filter((d: Doc) => d.doc_type === 'chc_application' || d.doc_type === 'wotr_application');
                    return apps.length > 0 ? (
                      <div>
                        <div className="text-xs font-medium text-[var(--text-muted)] mb-1 px-1">Applications ({apps.length})</div>
                        {apps.map((doc: Doc) => (
                          <div key={doc.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-[var(--bg-elevated)]/50 rounded text-sm">
                            <button onClick={() => toggleDoc(doc.id)} className="shrink-0">
                              {selectedDocs.has(doc.id) ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-[var(--text-muted)]" />}
                            </button>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                              doc.doc_type === 'wotr_application' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'
                            }`}>{doc.doc_type === 'wotr_application' ? 'WOTR' : 'CHC'}</span>
                            <span className="truncate text-[var(--text-secondary)] flex-1">{doc.filename}</span>
                            {doc.presigned_url && <a href={doc.presigned_url} target="_blank" rel="noopener"><Eye size={14} className="text-blue-400 hover:text-blue-300" /></a>}
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}

                  {/* Credit Report */}
                  <div>
                    <div className="flex items-center justify-between mb-1 px-1">
                      <span className="text-xs font-medium text-[var(--text-muted)]">Credit Report</span>
                      <button onClick={() => handleUpload('credit_report')} disabled={uploadingType === 'credit_report'}
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        {uploadingType === 'credit_report' ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />} Upload
                      </button>
                    </div>
                    {(detail.documents || []).filter((d: Doc) => d.doc_type === 'credit_report').map((doc: Doc) => (
                      <div key={doc.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-[var(--bg-elevated)]/50 rounded text-sm">
                        <button onClick={() => toggleDoc(doc.id)} className="shrink-0">
                          {selectedDocs.has(doc.id) ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <File size={14} className="text-[var(--text-muted)]" />
                        <span className="truncate text-[var(--text-secondary)] flex-1">{doc.filename}</span>
                        {doc.presigned_url && <a href={doc.presigned_url} target="_blank" rel="noopener"><Eye size={14} className="text-blue-400" /></a>}
                      </div>
                    ))}
                    {(detail.documents || []).filter((d: Doc) => d.doc_type === 'credit_report').length === 0 && (
                      <div className="text-[10px] text-[var(--text-subtle)] px-2">Not uploaded</div>
                    )}
                  </div>

                  {/* Background Check */}
                  <div>
                    <div className="flex items-center justify-between mb-1 px-1">
                      <span className="text-xs font-medium text-[var(--text-muted)]">Background Check</span>
                      <button onClick={() => handleUpload('background_check')} disabled={uploadingType === 'background_check'}
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                        {uploadingType === 'background_check' ? <Loader2 size={10} className="animate-spin" /> : <Upload size={10} />} Upload
                      </button>
                    </div>
                    {(detail.documents || []).filter((d: Doc) => d.doc_type === 'background_check').map((doc: Doc) => (
                      <div key={doc.id} className="flex items-center gap-2 py-1.5 px-2 hover:bg-[var(--bg-elevated)]/50 rounded text-sm">
                        <button onClick={() => toggleDoc(doc.id)} className="shrink-0">
                          {selectedDocs.has(doc.id) ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-[var(--text-muted)]" />}
                        </button>
                        <File size={14} className="text-[var(--text-muted)]" />
                        <span className="truncate text-[var(--text-secondary)] flex-1">{doc.filename}</span>
                        {doc.presigned_url && <a href={doc.presigned_url} target="_blank" rel="noopener"><Eye size={14} className="text-blue-400" /></a>}
                      </div>
                    ))}
                    {(detail.documents || []).filter((d: Doc) => d.doc_type === 'background_check').length === 0 && (
                      <div className="text-[10px] text-[var(--text-subtle)] px-2">Not uploaded</div>
                    )}
                  </div>
                </div>
              </Collapsible>

              {/* 3. Statement Analysis */}
              {detail.statement_analysis && (
                <Collapsible title="Statement Analysis" icon={<TrendingUp size={14} className="text-yellow-400" />}>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      {detail.statement_analysis.status === 'clean' && <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">🟢 Clean</span>}
                      {detail.statement_analysis.status === 'needs_attention' && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full border border-yellow-500/30">🟡 Needs Attention</span>}
                      {detail.statement_analysis.status === 'high_risk' && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded-full border border-red-500/30">🔴 High Risk</span>}
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                      {detail.statement_analysis.avg_revenue && (
                        <div><div className="text-[10px] text-[var(--text-muted)]">Avg Monthly Revenue</div><div className="text-gray-200">{detail.statement_analysis.avg_revenue}</div></div>
                      )}
                      {detail.statement_analysis.negative_days != null && (
                        <div><div className="text-[10px] text-[var(--text-muted)]">Negative Days</div><div className="text-gray-200">{detail.statement_analysis.negative_days}</div></div>
                      )}
                      {detail.statement_analysis.revenue_trend && (
                        <div><div className="text-[10px] text-[var(--text-muted)]">Revenue Trend</div><div className="text-gray-200">{detail.statement_analysis.revenue_trend}</div></div>
                      )}
                    </div>
                    {detail.statement_analysis.existing_advances?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] text-[var(--text-muted)] mb-1">Existing Advances</div>
                        <div className="text-sm text-orange-300">{detail.statement_analysis.existing_advances.join(', ')}</div>
                      </div>
                    )}
                    {detail.statement_analysis.red_flags?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-[10px] text-[var(--text-muted)] mb-1">Red Flags</div>
                        <div className="space-y-1">
                          {(Array.isArray(detail.statement_analysis.red_flags) ? detail.statement_analysis.red_flags : [detail.statement_analysis.red_flags]).map((f: string, i: number) => (
                            <div key={i} className="flex items-center gap-1 text-sm text-red-400">
                              <AlertTriangle size={12} /> {f}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Collapsible>
              )}

              {/* 4. Lender Match Results */}
              <Collapsible title="Lender Match Results" icon={<Star size={14} className="text-yellow-400" />} badge={(detail.lender_matches || []).length}>
                <div className="p-3 space-y-1 max-h-[500px] overflow-y-auto">
                  {(detail.lender_matches || []).length === 0 ? (
                    <div className="text-[var(--text-muted)] text-sm p-3">No lender matches available</div>
                  ) : (
                    (detail.lender_matches || []).slice(0, 15).map((m: LenderMatch, i: number) => {
                      const name = m.lender_name || m.name || `Lender #${m.rank}`;
                      const score = m.match_score || m.score || 0;
                      const isSelected = selectedLenders.has(i);
                      const products = m.product_types || m.products || [];
                      return (
                        <div key={i} className={`p-3 rounded-lg cursor-pointer transition-all ${
                          isSelected ? 'bg-blue-600/10 border border-blue-500/30' : 'hover:bg-[var(--bg-elevated)]/50 border border-transparent'
                        }`} onClick={() => toggleLender(i)}>
                          <div className="flex items-center gap-2">
                            <div className="shrink-0">
                              {isSelected ? <CheckSquare size={16} className="text-blue-400" /> : <Square size={16} className="text-[var(--text-muted)]" />}
                            </div>
                            <div className="text-xs font-bold text-[var(--text-muted)] w-5 shrink-0">#{m.rank}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-white truncate">{name}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                  m.application_type === 'WOTR' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}>{m.application_type}</span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {(Array.isArray(products) ? products : []).map((p, j) => (
                                  <span key={j} className="text-[10px] bg-[var(--bg-elevated)] text-[var(--text-muted)] px-1 py-0.5 rounded">{p}</span>
                                ))}
                                {m.funding_speed && <span className="text-[10px] text-[var(--text-muted)]">⚡ {m.funding_speed}</span>}
                                {m.max_amount && <span className="text-[10px] text-[var(--text-muted)]">Max: ${Number(m.max_amount).toLocaleString()}</span>}
                              </div>
                            </div>
                            <div className="shrink-0 w-20 text-right">
                              <div className="bg-[var(--bg-elevated)] rounded-full h-2 w-full mb-0.5">
                                <div className={`${scoreColor(score)} rounded-full h-2 transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
                              </div>
                              <div className={`text-xs font-bold ${scoreBadge(score)}`}>{score}%</div>
                            </div>
                          </div>
                          {/* WHY matched */}
                          {m.why && (
                            <div className="mt-2 ml-7 text-[11px] text-[var(--text-muted)] bg-[var(--bg-elevated)]/50 rounded px-2 py-1.5 border-l-2 border-blue-500/30">
                              💡 {m.why}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </Collapsible>

              {/* 5. Decision Panel */}
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-4 sticky bottom-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="text-sm text-[var(--text-muted)]">
                    {selectedLenders.size} lenders selected · {selectedDocs.size} docs
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setShowRequestModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 flex items-center gap-1.5">
                      <ClipboardList size={14} /> Request Docs
                    </button>
                    <button onClick={handlePause} disabled={submitting}
                      className="px-4 py-2 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-500 disabled:opacity-50 flex items-center gap-1.5">
                      <Pause size={14} /> Pause
                    </button>
                    <button onClick={() => setShowApproveModal(true)}
                      disabled={selectedLenders.size === 0 || detail.contact.status === 'submitted'}
                      className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5">
                      <Send size={14} /> Approve & Send
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      {showApproveModal && detail && (
        <ApproveModal
          contact={detail.contact}
          lenders={getSelectedLenderDetails()}
          onConfirm={handleApprove}
          onCancel={() => setShowApproveModal(false)}
          submitting={submitting}
        />
      )}
      {showRequestModal && detail && (
        <RequestDocsModal
          contact={detail.contact}
          onConfirm={handleRequestDocs}
          onCancel={() => setShowRequestModal(false)}
          submitting={submitting}
        />
      )}
    </div>
  );
}

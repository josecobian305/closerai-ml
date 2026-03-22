import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Package, RefreshCw, X, ExternalLink, Send, Clock, CheckCircle, XCircle, ArrowLeftRight } from 'lucide-react';

const BASE = typeof window !== 'undefined' && window.location.hostname === 'closerai.apipay.cash'
  ? '/api/v1' : '/app/api/v1';

interface LenderOffer {
  id: string;
  deal_id: string;
  contact_id?: string;
  lender_id?: string;
  lender_name: string;
  status: string;
  offer_amount?: number;
  requested_amount?: number;
  factor_rate?: number;
  term_months?: number;
  payment_amount?: number;
  payment_frequency?: string;
  total_payback?: number;
  buy_rate?: number;
  sell_rate?: number;
  commission_pct?: number;
  commission_dollars?: number;
  decline_reason?: string;
  notes?: string;
  received_at: string;
  business?: string;
  phone?: string;
  amount_requested?: number;
  merchant_name?: string;
  merchant_email?: string;
}

interface BoardData {
  summary: { pending: number; approved: number; declined: number; countered: number; total: number };
  approved: LenderOffer[];
  declined: LenderOffer[];
  countered: LenderOffer[];
  pending: LenderOffer[];
  all: LenderOffer[];
}

type StatusFilter = 'all' | 'approved' | 'declined' | 'countered' | 'pending';

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function timeAgo(iso: string): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function money(n?: number): string {
  if (n === undefined || n === null) return '—';
  return '$' + Number(n).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    approved: { bg: 'bg-green-500/20', text: 'text-green-400', label: '🟢 APPROVED' },
    accepted: { bg: 'bg-green-500/20', text: 'text-green-400', label: '🟢 ACCEPTED' },
    declined: { bg: 'bg-red-500/20', text: 'text-red-400', label: '🔴 DECLINED' },
    countered: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', label: '🔄 COUNTERED' },
    pending: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '⏳ PENDING' },
    submitted: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: '⏳ SUBMITTED' },
  };
  const s = map[status] || map.pending;
  return <span className={`px-2 py-1 rounded text-xs font-bold ${s.bg} ${s.text}`}>{s.label}</span>;
}

function LogResponseModal({ offer, onClose, onSaved }: { offer: LenderOffer; onClose: () => void; onSaved: () => void }) {
  const [status, setStatus] = useState<string>('approved');
  const [offerAmount, setOfferAmount] = useState('');
  const [factorRate, setFactorRate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentFrequency, setPaymentFrequency] = useState('daily');
  const [declineReason, setDeclineReason] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${BASE}/deals/offers/${offer.id}/manual-entry`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          offer_amount: offerAmount ? parseFloat(offerAmount) : undefined,
          factor_rate: factorRate ? parseFloat(factorRate) : undefined,
          term_months: termMonths ? parseInt(termMonths) : undefined,
          payment_amount: paymentAmount ? parseFloat(paymentAmount) : undefined,
          payment_frequency: paymentFrequency || undefined,
          decline_reason: declineReason || undefined,
          notes: notes || undefined,
        }),
      });
      onSaved();
      onClose();
    } catch (e) {
      console.error('Failed to save', e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#1a1a2e] rounded-xl p-6 w-full max-w-md border border-indigo-500/30" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-lg">Log Response — {offer.lender_name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-gray-400 text-sm mb-4">{offer.business}</p>

        <label className="block text-gray-400 text-sm mb-1">Status</label>
        <select value={status} onChange={e => setStatus(e.target.value)}
          className="w-full mb-3 p-2 bg-[#0f0f23] border border-gray-700 rounded text-white">
          <option value="approved">Approved</option>
          <option value="declined">Declined</option>
          <option value="countered">Countered</option>
        </select>

        {(status === 'approved' || status === 'countered') && (
          <>
            <label className="block text-gray-400 text-sm mb-1">Offer Amount</label>
            <input type="number" value={offerAmount} onChange={e => setOfferAmount(e.target.value)}
              placeholder="45000" className="w-full mb-3 p-2 bg-[#0f0f23] border border-gray-700 rounded text-white" />

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Factor Rate</label>
                <input type="number" step="0.01" value={factorRate} onChange={e => setFactorRate(e.target.value)}
                  placeholder="1.28" className="w-full p-2 bg-[#0f0f23] border border-gray-700 rounded text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Term (months)</label>
                <input type="number" value={termMonths} onChange={e => setTermMonths(e.target.value)}
                  placeholder="6" className="w-full p-2 bg-[#0f0f23] border border-gray-700 rounded text-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Payment Amount</label>
                <input type="number" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)}
                  placeholder="420" className="w-full p-2 bg-[#0f0f23] border border-gray-700 rounded text-white" />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Frequency</label>
                <select value={paymentFrequency} onChange={e => setPaymentFrequency(e.target.value)}
                  className="w-full p-2 bg-[#0f0f23] border border-gray-700 rounded text-white">
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="bi-weekly">Bi-Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>
          </>
        )}

        {status === 'declined' && (
          <>
            <label className="block text-gray-400 text-sm mb-1">Decline Reason</label>
            <textarea value={declineReason} onChange={e => setDeclineReason(e.target.value)}
              placeholder="Credit score below minimum requirement"
              className="w-full mb-3 p-2 bg-[#0f0f23] border border-gray-700 rounded text-white h-20 resize-none" />
          </>
        )}

        <label className="block text-gray-400 text-sm mb-1">Notes</label>
        <textarea value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Additional notes..."
          className="w-full mb-4 p-2 bg-[#0f0f23] border border-gray-700 rounded text-white h-16 resize-none" />

        <button onClick={handleSave} disabled={saving}
          className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Response'}
        </button>
      </div>
    </div>
  );
}

export function OffersView() {
  const [data, setData] = useState<BoardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [modalOffer, setModalOffer] = useState<LenderOffer | null>(null);
  const [isLive, setIsLive] = useState(true);
  const lastCheck = useRef<string | null>(null);
  const intervalRef = useRef<number | null>(null);

  const fetchBoard = useCallback(async (since?: string) => {
    try {
      const url = since ? `${BASE}/deals/offers-board?since=${encodeURIComponent(since)}` : `${BASE}/deals/offers-board`;
      const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
      const json = await res.json();
      lastCheck.current = new Date().toISOString();
      return json as BoardData;
    } catch (e) {
      console.error('Failed to fetch offers board', e);
      return null;
    }
  }, []);

  const loadFull = useCallback(async () => {
    setLoading(true);
    const d = await fetchBoard();
    if (d) setData(d);
    setLoading(false);
  }, [fetchBoard]);

  // Initial load
  useEffect(() => { loadFull(); }, [loadFull]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (!isLive) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(async () => {
      // Full refresh to get accurate summaries
      const d = await fetchBoard();
      if (d) setData(d);
    }, 30000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isLive, fetchBoard]);

  const handleViewDeal = (dealId: string) => {
    sessionStorage.setItem('openDealId', dealId);
    // Navigate to deals — dispatch a custom event the app can listen for
    window.dispatchEvent(new CustomEvent('navigate', { detail: 'deals' }));
  };

  const handleFollowUp = async (offer: LenderOffer) => {
    try {
      await fetch(`${BASE}/pipeline/submit-offer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: offer.deal_id,
          lender_name: offer.lender_name,
          follow_up: true,
          follow_up_hours: 48,
        }),
      });
      alert(`Follow-up scheduled for ${offer.lender_name}`);
    } catch {
      alert('Failed to send follow-up');
    }
  };

  const getFiltered = (): LenderOffer[] => {
    if (!data) return [];
    switch (filter) {
      case 'approved': return data.approved;
      case 'declined': return data.declined;
      case 'countered': return data.countered;
      case 'pending': return data.pending;
      default: return data.all;
    }
  };

  const summary = data?.summary || { approved: 0, declined: 0, countered: 0, pending: 0, total: 0 };
  const filtered = getFiltered();

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Package className="text-indigo-400" size={24} />
          <h1 className="text-xl font-bold text-white">Offers Board</h1>
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
              </span>
              Live
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsLive(!isLive)}
            className={`px-3 py-1 text-xs rounded ${isLive ? 'bg-green-500/20 text-green-400' : 'bg-gray-700 text-gray-400'}`}>
            {isLive ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
          </button>
          <button onClick={loadFull} className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Summary Bar */}
      <div className="flex items-center gap-2 flex-wrap bg-[#1a1a2e] rounded-lg p-3 border border-indigo-500/20">
        <button onClick={() => setFilter('approved')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${filter === 'approved' ? 'bg-green-500/30 text-green-300' : 'text-green-400 hover:bg-green-500/10'}`}>
          ✅ Approved: {summary.approved}
        </button>
        <button onClick={() => setFilter('declined')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${filter === 'declined' ? 'bg-red-500/30 text-red-300' : 'text-red-400 hover:bg-red-500/10'}`}>
          ❌ Declined: {summary.declined}
        </button>
        <button onClick={() => setFilter('countered')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${filter === 'countered' ? 'bg-yellow-500/30 text-yellow-300' : 'text-yellow-400 hover:bg-yellow-500/10'}`}>
          🔄 Counter: {summary.countered}
        </button>
        <button onClick={() => setFilter('pending')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${filter === 'pending' ? 'bg-blue-500/30 text-blue-300' : 'text-blue-400 hover:bg-blue-500/10'}`}>
          ⏳ Pending: {summary.pending}
        </button>
        <span className="text-gray-500 mx-2">|</span>
        <button onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${filter === 'all' ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
          Total: {summary.total}
        </button>
      </div>

      {/* Offer Cards */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading offers...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Package className="mx-auto mb-4 opacity-30" size={48} />
          <p className="text-lg">No offers yet.</p>
          <p className="text-sm mt-1">Submissions will appear here once Maria processes lender replies.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(offer => (
            <div key={offer.id} className="bg-[#1a1a2e] border border-indigo-500/15 rounded-lg p-4 hover:border-indigo-500/30 transition">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-base">{offer.lender_name || 'Unknown Lender'}</span>
                    <StatusBadge status={offer.status} />
                  </div>
                  <p className="text-gray-400 text-sm mt-0.5">
                    {offer.business || 'Unknown Business'}
                    {offer.merchant_name ? ` · ${offer.merchant_name}` : ''}
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500">
                  <div>{formatDate(offer.received_at)}</div>
                  <div className="text-gray-600">{timeAgo(offer.received_at)}</div>
                </div>
              </div>

              <div className="text-sm text-gray-400 mb-3">
                Requested: <span className="text-white font-medium">{money(offer.amount_requested || offer.requested_amount)}</span>
              </div>

              <div className="border-t border-gray-700/50 pt-3">
                {/* Approved/Accepted */}
                {(offer.status === 'approved' || offer.status === 'accepted') && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1 text-sm">
                    <div><span className="text-gray-500">Amount:</span> <span className="text-green-400 font-bold">{money(offer.offer_amount)}</span></div>
                    <div><span className="text-gray-500">Factor:</span> <span className="text-white">{offer.factor_rate || '—'}</span></div>
                    <div><span className="text-gray-500">Term:</span> <span className="text-white">{offer.term_months ? `${offer.term_months}mo` : '—'}</span></div>
                    <div><span className="text-gray-500">Payment:</span> <span className="text-white">{money(offer.payment_amount)}/{offer.payment_frequency || 'day'}</span></div>
                    <div><span className="text-gray-500">Total Payback:</span> <span className="text-white">{money(offer.total_payback)}</span></div>
                    {(offer.buy_rate || offer.sell_rate) && (
                      <div><span className="text-gray-500">Buy/Sell:</span> <span className="text-white">{offer.buy_rate || '—'} / {offer.sell_rate || '—'}</span></div>
                    )}
                    {offer.commission_dollars !== undefined && offer.commission_dollars !== null && offer.commission_dollars > 0 && (
                      <div className="col-span-full mt-1">
                        <span className="text-yellow-400 font-bold">💰 Commission: {money(offer.commission_dollars)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Declined */}
                {offer.status === 'declined' && (
                  <div className="text-sm">
                    <span className="text-gray-500">Reason:</span>{' '}
                    <span className="text-red-300 italic">"{offer.decline_reason || offer.notes || 'No reason provided'}"</span>
                  </div>
                )}

                {/* Countered */}
                {offer.status === 'countered' && (
                  <div className="text-sm space-y-1">
                    {offer.offer_amount && (
                      <div><span className="text-gray-500">Counter Amount:</span> <span className="text-yellow-400 font-bold">{money(offer.offer_amount)}</span></div>
                    )}
                    {offer.notes && <div><span className="text-gray-500">Notes:</span> <span className="text-gray-300">{offer.notes}</span></div>}
                  </div>
                )}

                {/* Pending */}
                {(offer.status === 'pending' || offer.status === 'submitted') && (
                  <div className="flex items-center gap-2 text-sm text-blue-400">
                    <Clock size={14} />
                    <span>Submitted {formatDate(offer.received_at)} · No response yet ({timeAgo(offer.received_at)})</span>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-700/30">
                <button onClick={() => setModalOffer(offer)}
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-medium rounded transition flex items-center gap-1">
                  <CheckCircle size={12} /> Log Response
                </button>
                <button onClick={() => handleViewDeal(offer.deal_id)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded transition flex items-center gap-1">
                  <ExternalLink size={12} /> View Deal
                </button>
                <button onClick={() => handleFollowUp(offer)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-medium rounded transition flex items-center gap-1">
                  <Send size={12} /> Send Follow-up
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Log Response Modal */}
      {modalOffer && (
        <LogResponseModal offer={modalOffer} onClose={() => setModalOffer(null)} onSaved={loadFull} />
      )}
    </div>
  );
}

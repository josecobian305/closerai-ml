import { useEffect, useState, useCallback } from 'react';
import { DollarSign, Trophy, Calculator, CheckSquare, Send, Plus, X, FileText, ChevronDown, ChevronUp, RefreshCw, Shield, Zap, Star, MapPin, CreditCard, TrendingUp, Clock, Package } from 'lucide-react';

const BASE = window.location.hostname === 'closerai.apipay.cash'
  ? '/api/v1' : '/app/api/v1';

async function api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
}

interface Offer {
  id: string;
  deal_id: string;
  lender_name: string;
  status: string;
  offer_amount: number;
  requested_amount: number;
  factor_rate: number;
  term_months: number;
  payment_amount: number;
  payment_frequency: string;
  total_payback: number;
  buy_rate: number;
  sell_rate: number;
  commission_pct: number;
  commission_dollars: number;
  decline_reason: string;
  notes: string;
  received_at: string;
  merchant_accepted: number;
}

interface LenderMatch {
  lender_id: string;
  lender_name: string;
  score: number;
  match_reasons: string[];
  flags: string[];
  max_amount: number | null;
  min_credit_score: number;
  factor_rate_range: string;
  funding_speed: string | null;
  commission_range: string;
  product_types: string[];
  rank: number;
}

interface Deal {
  id: string;
  contact_id: string;
  phone: string;
  business: string;
  status: string;
  created_at: string;
  updated_at: string;
  pitch_report_url: string;
  notes: string;
  industry: string;
  state: string;
  monthly_revenue: number;
  credit_score: string;
  avg_daily_balance: number;
  existing_advances: any[];
  amount_requested: number;
  position: string;
  lender_matches: LenderMatch[];
}

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
}

// ─── Score Bar ───────────────────────────────────────────────────
function ScoreBar({ score }: { score: number }) {
  const color = score >= 85 ? 'bg-green-500' : score >= 70 ? 'bg-yellow-500' : 'bg-red-500';
  const textColor = score >= 85 ? 'text-green-400' : score >= 70 ? 'text-yellow-400' : 'text-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${Math.min(score, 100)}%` }} />
      </div>
      <span className={`text-sm font-bold ${textColor} min-w-[36px] text-right`}>{score}</span>
    </div>
  );
}

// ─── Build WHY explanation ───────────────────────────────────────
function buildWhyExplanation(match: LenderMatch, deal: Deal): string {
  const parts: string[] = [];

  // Credit score
  if (match.min_credit_score && deal.credit_score) {
    const cs = parseInt(deal.credit_score);
    const min = match.min_credit_score;
    if (cs >= min + 50) {
      parts.push(`Credit ${cs} well above their ${min} minimum`);
    } else if (cs >= min) {
      parts.push(`Credit ${cs} meets their ${min} minimum`);
    }
  }

  // Revenue
  const rev = deal.monthly_revenue;
  const minRev = match.match_reasons.find(r => r.includes(' min'))?.match(/\$[\d,]+\s+min/)?.[0];
  if (rev) {
    if (minRev) {
      parts.push(`Revenue $${Number(rev).toLocaleString()}/mo vs ${minRev}`);
    } else {
      parts.push(`Revenue $${Number(rev).toLocaleString()}/mo`);
    }
  }

  // State
  if (deal.state) {
    const stateMatch = match.match_reasons.find(r => r.toLowerCase().includes('not restricted'));
    if (stateMatch) {
      parts.push(`${deal.state} not restricted`);
    }
  }

  // Positions
  const advCount = Array.isArray(deal.existing_advances) ? deal.existing_advances.length : 0;
  const posMatch = match.match_reasons.find(r => r.toLowerCase().includes('position'));
  if (posMatch) {
    if (advCount === 0) {
      parts.push('No existing positions — clean stack');
    } else {
      parts.push(`${advCount} active advance${advCount > 1 ? 's' : ''} within tolerance`);
    }
  } else if (advCount === 0) {
    parts.push('Clean — no existing advances');
  }

  // Funding speed
  if (match.funding_speed) {
    const speed = match.funding_speed.replace(/_/g, ' ');
    parts.push(`${speed.charAt(0).toUpperCase() + speed.slice(1)} funding`);
  }

  // Amount
  if (deal.amount_requested && match.max_amount) {
    if (deal.amount_requested <= match.max_amount) {
      parts.push(`$${Number(deal.amount_requested).toLocaleString()} within $${Number(match.max_amount).toLocaleString()} max`);
    }
  }

  // Products
  if (match.product_types?.length > 0) {
    if (match.product_types.length > 1) {
      parts.push(`Multiple products: ${match.product_types.join(', ')}`);
    }
  }

  // Fallback: use raw match_reasons if we couldn't build much
  if (parts.length < 2 && match.match_reasons.length > 0) {
    for (const r of match.match_reasons) {
      if (!parts.some(p => p.toLowerCase().includes(r.split(' ')[0].toLowerCase()))) {
        parts.push(r.charAt(0).toUpperCase() + r.slice(1));
      }
      if (parts.length >= 4) break;
    }
  }

  return parts.join('. ') + '.';
}

// ─── Lender Match Card ──────────────────────────────────────────
function LenderMatchCard({ match, deal, rank, selected, onToggle }: {
  match: LenderMatch; deal: Deal; rank: number; selected: boolean; onToggle: () => void;
}) {
  const [expanded, setExpanded] = useState(rank <= 3);
  const why = buildWhyExplanation(match, deal);
  const scoreColor = match.score >= 85 ? 'border-green-500/40' : match.score >= 70 ? 'border-yellow-500/40' : 'border-red-500/40';
  const rankBg = rank === 1 ? 'bg-yellow-500 text-black' : rank === 2 ? 'bg-gray-300 text-black' : rank === 3 ? 'bg-amber-600 text-white' : 'bg-gray-700 text-gray-300';

  // Determine application type (CHC = direct, WOTR = wholesale)
  const isWotr = match.commission_range?.includes('0.') || match.product_types?.includes('MCA');
  const appType = isWotr ? 'WOTR' : 'CHC';
  const appBadge = appType === 'CHC'
    ? 'bg-blue-600/30 text-blue-400 border-blue-600/50'
    : 'bg-purple-600/30 text-purple-400 border-purple-600/50';

  return (
    <div className={`bg-[#1a1a2e] border-2 ${selected ? 'border-indigo-500 ring-1 ring-indigo-500/40' : scoreColor} rounded-xl p-5 transition-all hover:border-indigo-400/30`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          {/* Rank badge */}
          <div className={`w-9 h-9 rounded-lg ${rankBg} flex items-center justify-center font-bold text-sm shadow-lg`}>
            #{rank}
          </div>
          <div>
            <h3 className="text-white font-bold text-lg leading-tight">{match.lender_name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${appBadge}`}>
                {appType}
              </span>
              {match.funding_speed && (
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Zap size={10} className="text-yellow-400" />
                  {match.funding_speed.replace(/_/g, ' ')}
                </span>
              )}
            </div>
          </div>
        </div>
        {/* Checkbox */}
        <button onClick={onToggle}
          className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600 hover:border-indigo-400'}`}>
          {selected && <CheckSquare size={15} className="text-white" />}
        </button>
      </div>

      {/* Score bar */}
      <div className="mb-3">
        <ScoreBar score={match.score} />
      </div>

      {/* WHY explanation - always visible */}
      <div className="bg-[#0f0f23] rounded-lg p-3 mb-3 border-l-3 border-l-indigo-500" style={{ borderLeft: '3px solid #818cf8' }}>
        <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mb-1">Why This Lender</p>
        <p className="text-gray-200 text-sm leading-relaxed">{why}</p>
      </div>

      {/* Key terms */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-[#0f0f23] rounded-lg p-2 text-center">
          <p className="text-gray-500 mb-0.5">Max Amount</p>
          <p className="text-white font-bold">{match.max_amount ? `$${Number(match.max_amount).toLocaleString()}` : 'N/A'}</p>
        </div>
        <div className="bg-[#0f0f23] rounded-lg p-2 text-center">
          <p className="text-gray-500 mb-0.5">Factor Range</p>
          <p className="text-white font-bold">{match.factor_rate_range?.replace('None', '—') || '—'}</p>
        </div>
        <div className="bg-[#0f0f23] rounded-lg p-2 text-center">
          <p className="text-gray-500 mb-0.5">Commission</p>
          <p className="text-yellow-400 font-bold">{match.commission_range?.replace(/None/g, '—')?.replace('%', ' pts') || '—'}</p>
        </div>
      </div>

      {/* Products */}
      {expanded && match.product_types?.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {match.product_types.map(p => (
            <span key={p} className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{p}</span>
          ))}
        </div>
      )}

      {/* Flags */}
      {match.flags?.length > 0 && (
        <div className="mt-2">
          {match.flags.map((f, i) => (
            <p key={i} className="text-xs text-red-400 flex items-center gap-1">
              <Shield size={10} /> {f}
            </p>
          ))}
        </div>
      )}

      {!expanded && (
        <button onClick={() => setExpanded(true)} className="text-xs text-gray-500 hover:text-gray-300 mt-2 flex items-center gap-1">
          <ChevronDown size={12} /> Show details
        </button>
      )}
    </div>
  );
}

// ─── Calculator Modal ────────────────────────────────────────────
function CalculatorModal({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const [amount, setAmount] = useState(offer.offer_amount || 50000);
  const [factor, setFactor] = useState(offer.factor_rate || 1.3);

  const totalPayback = amount * factor;
  const termDays = (offer.term_months || 6) * 22;
  const dailyPayment = totalPayback / termDays;
  const weeklyPayment = dailyPayment * 5;
  const buyRate = offer.buy_rate || factor - 0.06;
  const commission = ((factor - buyRate) / factor) * 100;
  const commissionDollars = amount * (factor - buyRate);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-[#333] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white text-lg font-bold flex items-center gap-2"><Calculator size={20} className="text-indigo-400" /> Offer Calculator</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>

        <div className="space-y-5">
          <div>
            <label className="text-sm text-gray-400 block mb-1">Funding Amount: <span className="text-white font-bold">${amount.toLocaleString()}</span></label>
            <input type="range" min={5000} max={500000} step={1000} value={amount} onChange={e => setAmount(+e.target.value)}
              className="w-full accent-indigo-500" />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-1">Factor Rate: <span className="text-white font-bold">{factor.toFixed(2)}</span></label>
            <input type="range" min={1.1} max={1.6} step={0.01} value={factor} onChange={e => setFactor(+e.target.value)}
              className="w-full accent-indigo-500" />
          </div>
          <div className="bg-[#0f0f23] rounded-xl p-4 space-y-2">
            <Row label="Total Payback" value={`$${totalPayback.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} bold green />
            <Row label="Daily Payment" value={`$${dailyPayment.toFixed(0)}`} />
            <Row label="Weekly Payment" value={`$${weeklyPayment.toFixed(0)}`} />
            <div className="border-t border-gray-700 my-2" />
            <Row label="Buy Rate" value={buyRate.toFixed(2)} />
            <Row label="Commission" value={`${commission.toFixed(1)}pts = $${commissionDollars.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} yellow />
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold, green, yellow }: { label: string; value: string; bold?: boolean; green?: boolean; yellow?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-400">{label}</span>
      <span className={`${bold ? 'font-bold' : ''} ${green ? 'text-green-400' : yellow ? 'text-yellow-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}

// ─── Deal Calculator (inline, deal-level) ────────────────────────
function DealCalculator({ deal, onOfferSaved }: { deal: Deal; onOfferSaved: () => void }) {
  const existingAdvances: any[] = Array.isArray(deal.existing_advances) ? deal.existing_advances : [];
  const existingDaily = existingAdvances.reduce((s: number, a: any) => s + (parseFloat(a.daily_payment) || 0), 0);

  const monthlyRevenue = deal.monthly_revenue || 0;
  const [amount, setAmount] = useState(deal.amount_requested || 50000);
  const [factor, setFactor] = useState(1.30);
  const [term, setTerm] = useState(12);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const businessDays = term * 22;
  const totalPayback = amount * factor;
  const dailyPayment = totalPayback / businessDays;
  const weeklyPayment = dailyPayment * 5;
  const costOfCapital = totalPayback - amount;
  const monthlyPayment = dailyPayment * 22;
  const pctOfRev = monthlyRevenue > 0 ? (monthlyPayment / monthlyRevenue * 100) : 0;
  const aprApprox = (costOfCapital / amount) / (term / 12) * 100;
  const totalDaily = dailyPayment + existingDaily;
  const dailyRevLeft = (monthlyRevenue / 22) - totalDaily;

  const pctColor = pctOfRev > 20 ? 'text-red-400' : pctOfRev > 15 ? 'text-yellow-400' : 'text-green-400';

  const lockOffer = async () => {
    setSaving(true);
    try {
      await api(`/deals/${deal.id}/offer`, {
        method: 'PUT',
        body: JSON.stringify({
          lender_name: '',
          status: 'pending',
          offer_amount: amount,
          factor_rate: factor,
          term_months: term,
          payment_amount: Math.round(dailyPayment * 100) / 100,
          payment_frequency: 'daily',
          total_payback: Math.round(totalPayback * 100) / 100,
          notes: `Created via dashboard calculator. Existing daily: $${existingDaily.toFixed(2)}`,
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      onOfferSaved();
    } catch (e: any) { alert('Failed to save offer: ' + e.message); }
    setSaving(false);
  };

  return (
    <div className="bg-[#1a1a2e] border border-[#333] rounded-xl p-5">
      <h3 className="text-white font-bold text-lg mb-5 flex items-center gap-2">
        <Calculator size={18} className="text-indigo-400" /> Deal Calculator
      </h3>

      <div className="space-y-5">
        {/* Funding Amount */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm text-gray-400">Funding Amount</label>
            <span className="text-white font-bold text-sm">${amount.toLocaleString()}</span>
          </div>
          <input type="range" min={5000} max={500000} step={1000} value={amount}
            onChange={e => setAmount(+e.target.value)} className="w-full accent-indigo-500" />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5"><span>$5K</span><span>$500K</span></div>
        </div>

        {/* Factor Rate */}
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm text-gray-400">Factor Rate</label>
            <span className="text-white font-bold text-sm">{factor.toFixed(2)}</span>
          </div>
          <input type="range" min={1.15} max={1.50} step={0.01} value={factor}
            onChange={e => setFactor(+e.target.value)} className="w-full accent-indigo-500" />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5"><span>1.15</span><span>1.50</span></div>
        </div>

        {/* Term */}
        <div>
          <label className="text-sm text-gray-400 block mb-1">Term</label>
          <select value={term} onChange={e => setTerm(+e.target.value)}
            className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
            <option value={3}>3 months (66 business days)</option>
            <option value={6}>6 months (132 business days)</option>
            <option value={9}>9 months (198 business days)</option>
            <option value={12}>12 months (264 business days)</option>
            <option value={18}>18 months (396 business days)</option>
            <option value={24}>24 months (528 business days)</option>
          </select>
        </div>

        {/* Results */}
        <div className="bg-[#0f0f23] rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Total Payback</p>
              <p className="text-green-400 font-bold text-lg">${totalPayback.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Daily Payment</p>
              <p className="text-indigo-400 font-bold text-lg">${dailyPayment.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Cost of Capital</p>
              <p className="text-white font-bold">${costOfCapital.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">% of Monthly Rev</p>
              <p className={`font-bold ${pctColor}`}>{pctOfRev.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Weekly Payment</p>
              <p className="text-white font-bold">${weeklyPayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-gray-500 uppercase tracking-wider">Eff. APR</p>
              <p className="text-purple-400 font-bold">{aprApprox.toFixed(1)}%</p>
            </div>
          </div>

          {existingDaily > 0 && (
            <div className="border-t border-yellow-900/40 pt-3 mt-1">
              <p className="text-[10px] text-yellow-400 font-bold uppercase mb-2">⚡ Total Daily Obligation</p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-400">New payment:</span>
                  <span className="text-white">${dailyPayment.toFixed(2)}</span>
                </div>
                {existingAdvances.map((a: any, i: number) => (
                  <div key={i} className="flex justify-between">
                    <span className="text-gray-400">{a.lender}:</span>
                    <span className="text-yellow-400">${parseFloat(a.daily_payment || 0).toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t border-gray-700 pt-1 mt-1">
                  <span className="text-yellow-300">Total daily:</span>
                  <span className="text-yellow-300">${totalDaily.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-400">Daily rev left after payments:</span>
                  <span className={dailyRevLeft >= 0 ? 'text-green-400' : 'text-red-400'}>${dailyRevLeft.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lock Offer Button */}
        <button onClick={lockOffer} disabled={saving || saved}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            saved ? 'bg-green-700/50 text-green-300 border border-green-700' :
            'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white shadow-lg'
          }`}>
          {saving ? '⏳ Saving...' : saved ? '✅ Offer Saved!' : '🔒 Lock & Save Offer'}
        </button>
      </div>
    </div>
  );
}

// ─── Add Offer Modal ─────────────────────────────────────────────
function AddOfferModal({ dealId, onClose, onSaved }: { dealId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    lender_name: '', offer_amount: '', factor_rate: '', term_months: '',
    payment_amount: '', payment_frequency: 'daily', total_payback: '',
    buy_rate: '', sell_rate: '', commission_pct: '', commission_dollars: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api(`/deals/${dealId}/offer`, {
        method: 'PUT',
        body: JSON.stringify({
          ...form,
          status: 'approved',
          offer_amount: parseFloat(form.offer_amount) || 0,
          factor_rate: parseFloat(form.factor_rate) || 0,
          term_months: parseInt(form.term_months) || 0,
          payment_amount: parseFloat(form.payment_amount) || 0,
          total_payback: parseFloat(form.total_payback) || 0,
          buy_rate: parseFloat(form.buy_rate) || 0,
          sell_rate: parseFloat(form.sell_rate) || 0,
          commission_pct: parseFloat(form.commission_pct) || 0,
          commission_dollars: parseFloat(form.commission_dollars) || 0,
        }),
      });
      onSaved();
      onClose();
    } catch { alert('Failed to save offer'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-[#333] rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-white text-lg font-bold">Log New Offer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Lender Name *</label>
            <input value={form.lender_name} onChange={e => set('lender_name', e.target.value)}
              className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm" />
          </div>
          <Input label="Offer Amount" value={form.offer_amount} onChange={v => set('offer_amount', v)} prefix="$" />
          <Input label="Factor Rate" value={form.factor_rate} onChange={v => set('factor_rate', v)} />
          <Input label="Term (months)" value={form.term_months} onChange={v => set('term_months', v)} />
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Payment Frequency</label>
            <select value={form.payment_frequency} onChange={e => set('payment_frequency', e.target.value)}
              className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm">
              <option value="daily">Daily</option><option value="weekly">Weekly</option>
              <option value="bi-weekly">Bi-Weekly</option><option value="monthly">Monthly</option>
            </select>
          </div>
          <Input label="Payment Amount" value={form.payment_amount} onChange={v => set('payment_amount', v)} prefix="$" />
          <Input label="Total Payback" value={form.total_payback} onChange={v => set('total_payback', v)} prefix="$" />
          <Input label="Buy Rate" value={form.buy_rate} onChange={v => set('buy_rate', v)} />
          <Input label="Sell Rate" value={form.sell_rate} onChange={v => set('sell_rate', v)} />
          <Input label="Commission %" value={form.commission_pct} onChange={v => set('commission_pct', v)} suffix="pts" />
          <Input label="Commission $" value={form.commission_dollars} onChange={v => set('commission_dollars', v)} prefix="$" />
          <div className="col-span-2">
            <label className="text-xs text-gray-400 mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
              className="w-full bg-[#0f0f23] border border-gray-700 rounded-lg px-3 py-2 text-white text-sm resize-none" />
          </div>
        </div>
        <button onClick={save} disabled={saving || !form.lender_name}
          className="mt-5 w-full py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-bold">
          {saving ? 'Saving...' : 'Save Offer'}
        </button>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, prefix, suffix }: { label: string; value: string; onChange: (v: string) => void; prefix?: string; suffix?: string }) {
  return (
    <div>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <div className="relative">
        {prefix && <span className="absolute left-3 top-2 text-gray-500 text-sm">{prefix}</span>}
        <input value={value} onChange={e => onChange(e.target.value)}
          className={`w-full bg-[#0f0f23] border border-gray-700 rounded-lg ${prefix ? 'pl-7' : 'px-3'} ${suffix ? 'pr-10' : 'px-3'} py-2 text-white text-sm`} />
        {suffix && <span className="absolute right-3 top-2 text-gray-500 text-sm">{suffix}</span>}
      </div>
    </div>
  );
}

// ─── Pitch Report Modal ──────────────────────────────────────────
function PitchReportModal({ dealId, selectedOfferIds, onClose }: { dealId: string; selectedOfferIds: string[]; onClose: () => void }) {
  const [compiling, setCompiling] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const compile = async () => {
    setCompiling(true); setError('');
    try {
      const r = await api(`/deals/${dealId}/compile-pitch`, { method: 'POST', body: JSON.stringify({ offer_ids: selectedOfferIds }) });
      setResult(r);
    } catch (e: any) { setError(e.message); }
    setCompiling(false);
  };

  const sendToAgent = async () => {
    setSending(true);
    try { await api(`/deals/${dealId}/send-pitch`, { method: 'POST', body: JSON.stringify({ offer_ids: selectedOfferIds }) }); alert('Pitch report sent!'); } catch (e: any) { alert('Failed: ' + e.message); }
    setSending(false);
  };

  useEffect(() => { compile(); }, []);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-[#333] rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-bold flex items-center gap-2"><FileText size={20} className="text-indigo-400" /> Pitch Report</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        {compiling && <div className="text-center py-12"><div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-3" /><p className="text-gray-400">Compiling pitch report...</p></div>}
        {error && <p className="text-red-400 text-sm">{error}</p>}
        {result && (
          <>
            {result.strategy && (
              <div className="bg-[#0f0f23] rounded-xl p-4 mb-4">
                <p className="text-yellow-400 text-sm font-bold mb-1">🎯 Pitch Strategy</p>
                <p className="text-gray-200 text-sm">{result.strategy}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={sendToAgent} disabled={sending}
                className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl font-bold flex items-center justify-center gap-2">
                <Send size={16} /> {sending ? 'Sending...' : 'Send to Agent'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Send to Merchant Modal ──────────────────────────────────────
function SendToMerchantModal({ dealId, offer, deal, onClose }: { dealId: string; offer: Offer; deal: Deal; onClose: () => void }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await api(`/deals/${dealId}/send-offer-sms`, {
        method: 'POST',
        body: JSON.stringify({ offer_id: offer.id, merchant_phone: deal.phone, merchant_name: deal.business }),
      });
      setSent(true);
    } catch (e: any) { alert('Failed: ' + e.message); }
    setSending(false);
  };

  const payFreq = offer.payment_frequency || 'day';
  const previewSms = `Hey ${deal.business || 'there'}, great news — you're approved for $${Number(offer.offer_amount || 0).toLocaleString()} at $${Number(offer.payment_amount || 0).toLocaleString()}/${payFreq}. Review your offer and confirm here: https://agents.chccapitalgroup.com/offer/${offer.id}`;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-[#333] rounded-2xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-bold">📱 Send to Merchant</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
        </div>
        {!sent ? (
          <>
            <div className="bg-[#0f0f23] rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-500 mb-1">SMS Preview:</p>
              <p className="text-gray-200 text-sm leading-relaxed">{previewSms}</p>
            </div>
            <p className="text-gray-400 text-xs mb-4">Sending to: {deal.phone}</p>
            <button onClick={send} disabled={sending}
              className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-xl font-bold">
              {sending ? 'Sending...' : 'Send SMS to Merchant'}
            </button>
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-green-400 text-xl font-bold mb-2">✅ SMS Sent!</p>
            <p className="text-gray-400 text-sm">Offer acceptance link sent to {deal.phone}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Offer Card ──────────────────────────────────────────────────
function OfferCard({ offer, selected, onToggle, onCalc, onSendToMerchant }: {
  offer: Offer; selected: boolean; onToggle: () => void; onCalc: () => void; onSendToMerchant: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const statusColor: Record<string, string> = {
    approved: 'text-green-400 bg-green-900/30',
    pending: 'text-yellow-400 bg-yellow-900/30',
    declined: 'text-red-400 bg-red-900/30',
    countered: 'text-blue-400 bg-blue-900/30',
    accepted: 'text-emerald-400 bg-emerald-900/30',
  };

  return (
    <div className={`bg-[#1a1a2e] border ${selected ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-[#333]'} rounded-xl p-5 transition-all`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-white font-bold text-base">{offer.lender_name || 'Unknown Lender'}</h3>
          <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[offer.status] || 'text-gray-400 bg-gray-800'}`}>
            {offer.status?.toUpperCase()}
          </span>
        </div>
        <button onClick={onToggle}
          className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${selected ? 'bg-indigo-600 border-indigo-600' : 'border-gray-600 hover:border-indigo-400'}`}>
          {selected && <CheckSquare size={14} className="text-white" />}
        </button>
      </div>
      <div className="space-y-1.5 text-sm">
        <Row label="Amount" value={`$${Number(offer.offer_amount || 0).toLocaleString()}`} bold green />
        <Row label="Factor" value={String(offer.factor_rate || 'N/A')} />
        <Row label="Term" value={`${offer.term_months || 'N/A'}mo`} />
        <Row label="Payment" value={`$${Number(offer.payment_amount || 0).toLocaleString()}/${offer.payment_frequency || 'daily'}`} />
        <Row label="Total Payback" value={`$${Number(offer.total_payback || 0).toLocaleString()}`} />
      </div>
      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-700 space-y-1.5 text-sm">
          <Row label="Buy Rate" value={String(offer.buy_rate || 'N/A')} />
          <Row label="Sell Rate" value={String(offer.sell_rate || 'N/A')} />
          <Row label="Commission" value={`${offer.commission_pct ? `${offer.commission_pct}pts` : ''} ${offer.commission_dollars ? `= $${Number(offer.commission_dollars).toLocaleString()} 🤑` : ''}`} yellow />
          {offer.notes && <p className="text-gray-400 text-xs mt-2">{offer.notes}</p>}
        </div>
      )}
      <div className="flex items-center gap-2 mt-4">
        <button onClick={onCalc} className="flex-1 py-2 bg-[#0f0f23] hover:bg-[#1e1e3a] border border-gray-700 rounded-lg text-gray-300 text-xs font-medium flex items-center justify-center gap-1">
          <Calculator size={13} /> Calc
        </button>
        <button onClick={() => setExpanded(!expanded)} className="flex-1 py-2 bg-[#0f0f23] hover:bg-[#1e1e3a] border border-gray-700 rounded-lg text-gray-300 text-xs font-medium flex items-center justify-center gap-1">
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {expanded ? 'Less' : 'More'}
        </button>
        {offer.status === 'approved' && (
          <button onClick={onSendToMerchant} className="flex-1 py-2 bg-green-700/30 hover:bg-green-700/50 border border-green-700 rounded-lg text-green-400 text-xs font-medium flex items-center justify-center gap-1">
            <Send size={13} /> Send
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Existing Advances Display ───────────────────────────────────
function ExistingAdvances({ advances }: { advances: any[] }) {
  if (!advances || advances.length === 0) return null;
  return (
    <div className="mt-3 bg-red-900/10 border border-red-800/30 rounded-lg p-3">
      <p className="text-xs text-red-400 font-bold mb-2 flex items-center gap-1"><Shield size={12} /> EXISTING ADVANCES ({advances.length})</p>
      {advances.map((a, i) => (
        <div key={i} className="flex justify-between text-xs py-1">
          <span className="text-gray-300">{a.lender}</span>
          <span className="text-red-300">${Number(a.daily_payment || a.monthly_payment_total || 0).toLocaleString()}/{a.payment_frequency || 'day'}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main DealApprovalView ───────────────────────────────────────
export function DealsView() {
  const [deals, setDeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [dealDetail, setDealDetail] = useState<{ deal: Deal; offers: Offer[]; contact: Contact | null; documents: any[] } | null>(null);
  const [selectedOffers, setSelectedOffers] = useState<Set<string>>(new Set());
  const [selectedLenders, setSelectedLenders] = useState<Set<string>>(new Set());
  const [calcOffer, setCalcOffer] = useState<Offer | null>(null);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [showPitchReport, setShowPitchReport] = useState(false);
  const [sendToMerchantOffer, setSendToMerchantOffer] = useState<Offer | null>(null);
  const [refreshingMatches, setRefreshingMatches] = useState(false);

  const loadDeals = useCallback(async () => {
    try {
      const data = await api('/deals');
      setDeals(data.deals || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  const loadDeal = useCallback(async (dealId: string) => {
    try {
      const data = await api(`/deals/${dealId}`);
      setDealDetail(data);
      setSelectedOffers(new Set());
      // Pre-select top 5 lenders
      const matches: LenderMatch[] = data.deal?.lender_matches || [];
      setSelectedLenders(new Set(matches.slice(0, 5).map((m: LenderMatch) => m.lender_id)));
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadDeals(); }, [loadDeals]);

  // Check sessionStorage for openDealId
  useEffect(() => {
    const stored = sessionStorage.getItem('openDealId');
    if (stored) {
      setSelectedDealId(stored);
      loadDeal(stored);
      sessionStorage.removeItem('openDealId');
    }
  }, [loadDeal]);

  useEffect(() => {
    const checkHash = () => {
      const match = window.location.hash.match(/#\/deal\/([a-f0-9-]+)/);
      if (match) {
        setSelectedDealId(match[1]);
        loadDeal(match[1]);
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, [loadDeal]);

  useEffect(() => {
    if (selectedDealId && !dealDetail) loadDeal(selectedDealId);
  }, [selectedDealId, loadDeal]);

  const toggleOffer = (id: string) => {
    setSelectedOffers(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const toggleLender = (id: string) => {
    setSelectedLenders(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };

  const refreshMatches = async () => {
    if (!dealDetail) return;
    setRefreshingMatches(true);
    try {
      const r = await api(`/deals/${dealDetail.deal.id}/refresh-matches`, { method: 'POST' });
      setDealDetail(prev => prev ? { ...prev, deal: { ...prev.deal, lender_matches: r.lender_matches } } : prev);
      setSelectedLenders(new Set((r.lender_matches || []).slice(0, 5).map((m: LenderMatch) => m.lender_id)));
    } catch (e: any) { alert('Refresh failed: ' + e.message); }
    setRefreshingMatches(false);
  };

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-[var(--bg-elevated)] rounded w-40 animate-pulse" />
      {[...Array(4)].map((_, i) => <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-xl p-5 animate-pulse h-20" />)}
    </div>
  );

  // ─── Deal Detail View ─────────────────────────────────────────
  if (dealDetail) {
    const { deal, offers, contact, documents } = dealDetail;
    const approvedOffers = offers.filter(o => o.status === 'approved');
    const otherOffers = offers.filter(o => o.status !== 'approved');
    const lenderMatches: LenderMatch[] = deal.lender_matches || [];
    const existingAdvances: any[] = Array.isArray(deal.existing_advances) ? deal.existing_advances : [];

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => { setDealDetail(null); setSelectedDealId(null); window.location.hash = ''; }}
            className="text-gray-400 hover:text-white text-sm">← Back</button>
          <h2 className="text-2xl font-bold text-white">{deal.business || deal.phone}</h2>
          <span className={`text-xs px-2 py-1 rounded-full ${deal.status === 'funded' ? 'bg-green-900/40 text-green-400' : deal.status === 'accepted' ? 'bg-emerald-900/40 text-emerald-400' : deal.status === 'offers_received' ? 'bg-blue-900/40 text-blue-400' : 'bg-gray-800 text-gray-400'}`}>
            {deal.status?.toUpperCase().replace(/_/g, ' ')}
          </span>
        </div>

        {/* ─── MERCHANT PROFILE PANEL ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-[#1a1a2e] border border-[#333] rounded-xl p-5 sticky top-4">
              <h3 className="text-white font-bold mb-4 flex items-center gap-2"><CreditCard size={16} className="text-indigo-400" /> Merchant Profile</h3>
              <div className="space-y-3 text-sm">
                <Info label="Business" value={deal.business} />
                <Info label="Owner" value={contact?.name} />
                <Info label="Phone" value={deal.phone} />
                <Info label="Email" value={contact?.email} />
                <div className="border-t border-gray-800 my-2" />
                <Info label="Industry" value={deal.industry} />
                <Info label="State" value={deal.state} />
                <div className="border-t border-gray-800 my-2" />
                <div className="flex justify-between">
                  <span className="text-gray-400">Revenue</span>
                  <span className="text-green-400 font-bold">{deal.monthly_revenue ? `$${Number(deal.monthly_revenue).toLocaleString()}/mo` : '—'}</span>
                </div>
                <Info label="Credit" value={deal.credit_score} />
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Balance</span>
                  <span className="text-white">{deal.avg_daily_balance ? `$${Number(deal.avg_daily_balance).toLocaleString()}` : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Requested</span>
                  <span className="text-indigo-400 font-bold">{deal.amount_requested ? `$${Number(deal.amount_requested).toLocaleString()}` : '—'}</span>
                </div>
                <Info label="Position" value={deal.position} />
                <ExistingAdvances advances={existingAdvances} />
                {deal.notes && (
                  <div className="mt-3 bg-[#0f0f23] rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-gray-300 text-xs leading-relaxed">{deal.notes}</p>
                  </div>
                )}
                {deal.pitch_report_url && (
                  <a href={deal.pitch_report_url} target="_blank" rel="noreferrer"
                    className="block text-indigo-400 text-xs hover:underline mt-2">📄 View Pitch Report</a>
                )}
              </div>
            </div>
          </div>

          {/* ─── MAIN CONTENT ────────────────────────────────────── */}
          <div className="lg:col-span-3 space-y-6">

            {/* ─── LENDER MATCH SECTION (PROMINENT) ─────────────── */}
            {lenderMatches.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-white font-bold text-lg flex items-center gap-2">
                    <Star size={18} className="text-yellow-400" />
                    Lender Matches ({lenderMatches.length})
                    <span className="text-xs text-gray-500 font-normal ml-2">{selectedLenders.size} selected for submission</span>
                  </h3>
                  <button onClick={refreshMatches} disabled={refreshingMatches}
                    className="px-3 py-1.5 bg-[#0f0f23] hover:bg-[#1e1e3a] border border-gray-700 rounded-lg text-gray-400 text-xs flex items-center gap-1.5 disabled:opacity-50">
                    <RefreshCw size={12} className={refreshingMatches ? 'animate-spin' : ''} />
                    {refreshingMatches ? 'Refreshing...' : 'Re-run Match'}
                  </button>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                  {lenderMatches.map((m, i) => (
                    <LenderMatchCard
                      key={m.lender_id}
                      match={m}
                      deal={deal}
                      rank={m.rank || i + 1}
                      selected={selectedLenders.has(m.lender_id)}
                      onToggle={() => toggleLender(m.lender_id)}
                    />
                  ))}
                </div>
              
              {/* APPROVE & SEND TO LENDERS button */}
              {lenderMatches.length > 0 && selectedLenders.size > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border border-indigo-500/40 rounded-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-white font-bold text-sm">{selectedLenders.size} lender{selectedLenders.size > 1 ? 's' : ''} selected</p>
                      <p className="text-gray-400 text-xs mt-0.5">Watermarked packages will be sent to each selected lender</p>
                    </div>
                    <button
                      onClick={async () => {
                        if (!confirm(`Send watermarked file to ${selectedLenders.size} lenders? This will fire submission emails immediately.`)) return;
                        const BASE = window.location.hostname === 'closerai.apipay.cash' ? '/api/v1' : '/app/api/v1';
                        const notes = (document.getElementById('submission-notes') as HTMLTextAreaElement)?.value || '';
                        try {
                          const selectedList = lenderMatches
                            .filter(m => selectedLenders.has(m.lender_id))
                            .map(m => ({ lender_id: m.lender_id, lender_name: m.lender_name, contact_email: 'jclaude@chccapitalgroup.com', app_type: 'CHC' }));
                          const r = await fetch(`${BASE}/pipeline/submit-offer`, {
                            method: 'POST', headers: {'Content-Type': 'application/json'},
                            body: JSON.stringify({
                              phone: deal.phone, merchant_name: deal.contact?.name || deal.business,
                              business_name: deal.business, lenders: selectedList,
                              notes: notes || 'Pre-underwriting approval — submitted via CloserAI',
                              agent: 'Jacob Claude', amount: deal.amount_requested,
                              product: 'MCA', position: deal.position,
                              monthly_revenue: deal.monthly_revenue, credit_score: deal.credit_score,
                              industry: deal.industry, state: deal.state,
                            })
                          });
                          const result = await r.json();
                          alert(`✅ Sent to ${result.sent} lenders!${result.errors?.length ? ' Errors: ' + result.errors.join(', ') : ''}`);
                        } catch (e: any) { alert('Error: ' + e.message); }
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all shadow-lg shadow-indigo-900/40"
                    >
                      <Send size={16} /> ✅ Approve & Send to Lenders
                    </button>
                  </div>
                  <textarea id="submission-notes" placeholder="Submission notes (optional — added to every lender email)..."
                    className="w-full bg-black/30 border border-indigo-500/30 rounded-lg px-3 py-2 text-gray-300 text-xs resize-none focus:outline-none focus:border-indigo-400" rows={2} />
                </div>
              )}
              </div>
            )}

            {/* ─── OFFERS SECTION ─────────────────────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold text-lg flex items-center gap-2">
                  <DollarSign size={18} className="text-green-400" />
                  Offers ({offers.length})
                  {approvedOffers.length > 0 && (
                    <span className="text-xs bg-green-900/40 text-green-300 px-2 py-0.5 rounded-full">{approvedOffers.length} approved</span>
                  )}
                </h3>
                <button onClick={() => setShowAddOffer(true)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium flex items-center gap-1">
                  <Plus size={14} /> Log Offer
                </button>
              </div>
              
              {/* Stack mode toolbar — shows when offers are selected */}
              {selectedOffers.size > 0 && (
                <div className="mb-4 p-4 bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/40 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-bold text-sm">
                        {selectedOffers.size === 1 ? '1 offer selected' : `${selectedOffers.size} offers selected — Stack Mode`}
                      </p>
                      <p className="text-gray-400 text-xs mt-0.5">
                        {selectedOffers.size === 1
                          ? 'Select another to stack, or compile a single-offer pitch'
                          : 'Compiling a combined pitch with all selected offers'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedOffers(new Set())}
                        className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg text-xs"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => {
                          if (deal) {
                            sessionStorage.setItem('pitchDealId', deal.id);
                            sessionStorage.setItem('pitchOfferIds', JSON.stringify([...selectedOffers]));
                            window.dispatchEvent(new CustomEvent('navigate', { detail: 'pitch-review' }));
                          }
                        }}
                        className="px-4 py-1.5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-1.5"
                      >
                        <FileText size={14} />
                        {selectedOffers.size === 1 ? 'Compile Pitch' : `Stack & Compile (${selectedOffers.size})`}
                      </button>
                    </div>
                  </div>
                  {selectedOffers.size > 1 && (
                    <div className="mt-3 pt-3 border-t border-green-700/30 grid grid-cols-3 gap-3 text-xs">
                      <div>
                        <div className="text-gray-400">Combined Funding</div>
                        <div className="text-white font-bold text-sm">
                          ${offers.filter(o => selectedOffers.has(o.id)).reduce((sum, o) => sum + (o.offer_amount || 0), 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Total Commission</div>
                        <div className="text-green-400 font-bold text-sm">
                          ${offers.filter(o => selectedOffers.has(o.id)).reduce((sum, o) => sum + (o.commission_dollars || 0), 0).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400">Avg Factor</div>
                        <div className="text-white font-bold text-sm">
                          {(() => {
                            const sel = offers.filter(o => selectedOffers.has(o.id) && o.factor_rate);
                            return sel.length > 0 ? (sel.reduce((s, o) => s + (o.factor_rate || 0), 0) / sel.length).toFixed(2) + 'x' : '—';
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {approvedOffers.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {approvedOffers.map(o => (
                    <OfferCard key={o.id} offer={o}
                      selected={selectedOffers.has(o.id)}
                      onToggle={() => toggleOffer(o.id)}
                      onCalc={() => setCalcOffer(o)}
                      onSendToMerchant={() => setSendToMerchantOffer(o)}
                    />
                  ))}
                </div>
              )}

              {otherOffers.length > 0 && (
                <>
                  <h4 className="text-gray-400 text-sm mt-4 mb-2">Other</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherOffers.map(o => (
                      <OfferCard key={o.id} offer={o}
                        selected={selectedOffers.has(o.id)}
                        onToggle={() => toggleOffer(o.id)}
                        onCalc={() => setCalcOffer(o)}
                        onSendToMerchant={() => setSendToMerchantOffer(o)}
                      />
                    ))}
                  </div>
                </>
              )}

              {offers.length === 0 && (
                <div className="bg-[#1a1a2e] border border-[#333] rounded-xl p-12 text-center">
                  <DollarSign size={36} className="text-gray-500 mx-auto mb-3" />
                  <p className="text-gray-400">No offers yet. Click "Log Offer" to add one.</p>
                </div>
              )}

              {selectedOffers.size > 0 && (
                <button onClick={() => {
                    if (deal) {
                      sessionStorage.setItem('pitchDealId', deal.id);
                      sessionStorage.setItem('pitchOfferIds', JSON.stringify([...selectedOffers]));
                      window.dispatchEvent(new CustomEvent('navigate', { detail: 'pitch-review' }));
                    }
                  }}
                  className="mt-4 w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg">
                  <FileText size={20} /> Compile Pitch Report ({selectedOffers.size} offer{selectedOffers.size > 1 ? 's' : ''})
                </button>
              )}
            </div>

            {/* ─── DOCUMENTS SECTION ──────────────────────────────── */}
            {documents && documents.length > 0 && (
              <div>
                <h3 className="text-white font-bold text-lg mb-3 flex items-center gap-2">
                  <FileText size={18} className="text-blue-400" /> Documents ({documents.length})
                </h3>
                <div className="space-y-2">
                  {documents.map((doc: any) => (
                    <div key={doc.id} className="flex items-center justify-between bg-[#1a1a2e] border border-[#333] rounded-lg p-3">
                      <div>
                        <p className="text-white text-sm">{doc.filename || doc.s3_key?.split('/').pop()}</p>
                        <p className="text-gray-500 text-xs">{doc.doc_type} · {doc.file_size ? `${(doc.file_size / 1024).toFixed(0)}KB` : ''}</p>
                      </div>
                      {doc.presigned_url && (
                        <a href={doc.presigned_url} target="_blank" rel="noreferrer"
                          className="px-3 py-1.5 bg-blue-600/20 border border-blue-600/40 text-blue-400 rounded-lg text-xs hover:bg-blue-600/30">
                          View
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {calcOffer && <CalculatorModal offer={calcOffer} onClose={() => setCalcOffer(null)} />}
        {showAddOffer && <AddOfferModal dealId={deal.id} onClose={() => setShowAddOffer(false)} onSaved={() => loadDeal(deal.id)} />}
        {showPitchReport && <PitchReportModal dealId={deal.id} selectedOfferIds={[...selectedOffers]} onClose={() => setShowPitchReport(false)} />}
        {sendToMerchantOffer && <SendToMerchantModal dealId={deal.id} offer={sendToMerchantOffer} deal={deal} onClose={() => setSendToMerchantOffer(null)} />}
      </div>
    );
  }

  // ─── Deals List View ──────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Deal Engine</h2>
        <div className="flex items-center gap-3 text-sm">
          <Trophy size={16} className="text-green-400" />
          <span className="text-green-400 font-bold">{deals.filter((d: any) => d.status === 'funded' || d.status === 'accepted').length} closed</span>
          <span className="text-gray-500">|</span>
          <span className="text-blue-400">{deals.filter((d: any) => d.status === 'offers_received').length} with offers</span>
          <span className="text-gray-500">|</span>
          <span className="text-gray-400">{deals.length} total</span>
        </div>
      </div>

      {deals.length === 0 ? (
        <div className="bg-[#1a1a2e] border border-[#333] rounded-xl p-12 text-center">
          <DollarSign size={36} className="text-gray-500 mx-auto mb-3" />
          <p className="text-gray-400">No deals yet. Create one from a pipeline merchant.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deals.map((d: any) => (
            <button key={d.id} onClick={() => { setSelectedDealId(d.id); window.location.hash = `#/deal/${d.id}`; loadDeal(d.id); }}
              className="w-full bg-[#1a1a2e] border border-[#333] rounded-xl p-4 text-left hover:border-indigo-500/50 transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{d.business || d.phone}</p>
                  <p className="text-xs text-gray-500">
                    {d.phone} · {d.industry || ''} · {d.state || ''}
                    {d.monthly_revenue ? ` · $${Number(d.monthly_revenue).toLocaleString()}/mo` : ''}
                    {d.amount_requested ? ` · Req $${Number(d.amount_requested).toLocaleString()}` : ''}
                    {' · '}{d.offer_count || 0} offers · {d.approved_count || 0} approved
                  </p>
                </div>
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                    d.status === 'funded' || d.status === 'accepted' ? 'bg-green-900/40 text-green-400' :
                    d.status === 'offers_received' ? 'bg-blue-900/40 text-blue-400' :
                    d.status === 'approved' || d.status === 'approved_for_test' ? 'bg-indigo-900/40 text-indigo-400' :
                    'bg-gray-800 text-gray-400'
                  }`}>{d.status?.toUpperCase().replace(/_/g, ' ')}</span>
                  <p className="text-xs text-gray-600 mt-1">{d.updated_at ? new Date(d.updated_at).toLocaleDateString() : ''}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span className="text-white text-right">{value || '—'}</span>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { ArrowLeft, Phone, Mail, RefreshCw, Loader2, Check, ExternalLink, FileText, BarChart3, Calculator, ChevronDown, ChevronUp } from 'lucide-react';

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

/* ─── Types ─── */
interface PitchFrame {
  id: string;
  name: string;
  emoji: string;
  when_to_use: string;
  sms_text: string;
  email_subject: string;
  email_html: string;
  recommended: boolean;
}

interface DealDetail {
  deal: any;
  contact: any;
  offers: any[];
  documents: any[];
  underwriting?: {
    version: number;
    avg_monthly_revenue: number;
    revenue_by_month: Record<string, number>;
    red_flags: string[];
    qualification_notes: string;
    nsf_count: number;
    negative_days: number;
    position: string;
    status: string;
    max_recommended_funding: number;
    analyst: string;
    analysis_date: string;
  } | null;
  fintech_banks?: string[];
  decline_notes?: string[];
}

interface PitchData {
  frames: PitchFrame[];
  deal_id: string;
  business: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  monthly_revenue: number;
  credit_score: string;
  existing_advances: string;
  avg_daily_balance: number;
  notes: string;
  offers: any[];
  generated_at: string;
}

/* ─── Skeleton ─── */
function Skeleton({ w = '100%', h = '16px' }: { w?: string; h?: string }) {
  return <div className="animate-pulse rounded" style={{ width: w, height: h, background: 'rgba(255,255,255,0.06)' }} />;
}

function SkeletonCard() {
  return (
    <div className="rounded-lg p-4" style={{ background: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)' }}>
      <Skeleton h="14px" w="60%" />
      <div className="mt-3 space-y-2">
        <Skeleton h="12px" w="90%" />
        <Skeleton h="12px" w="75%" />
        <Skeleton h="12px" w="80%" />
      </div>
    </div>
  );
}

/* ─── Inline Deal Calculator ─── */
function DealCalculatorInline({ deal, existingAdv, offers, onOfferSaved }: { deal: any; existingAdv: any[]; offers: any[]; onOfferSaved: () => void }) {
  const existingDaily = existingAdv.reduce((s: number, a: any) => s + (parseFloat(a.daily_payment) || 0), 0);

  // Cap slider at offer amount * 1.5, floor at $5K
  const bestOffer = offers[0];
  const offerMax = bestOffer?.offer_amount ? Math.round(bestOffer.offer_amount * 1.5) : 500000;
  const sliderMax = Math.min(offerMax, 500000);
  const sliderMin = 5000;
  const [open, setOpen] = useState(true);
  const [amount, setAmount] = useState(deal.amount_requested || 50000);
  const [factor, setFactor] = useState(1.30);
  const [payFreq, setPayFreq] = useState<'daily' | 'weekly'>('daily');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedOfferId, setSavedOfferId] = useState<string | null>(null);

  const monthlyRevenue = deal.monthly_revenue || 0;
  // Term: stored in business days internally, displayed as days or weeks
  const [termDays, setTermDays] = useState(264); // default 12 months

  const termMin = 66;   // 3 months
  const termMax = 528;  // 24 months
  const termDisplay = payFreq === 'daily'
    ? `${termDays} days`
    : `${Math.round(termDays / 5)} weeks`;

  const businessDays = termDays;
  const totalPayback = amount * factor;
  const dailyPayment = totalPayback / businessDays;
  const weeklyPayment = dailyPayment * 5;
  const costOfCapital = totalPayback - amount;
  const monthlyPayment = dailyPayment * 22;
  const pctOfRev = monthlyRevenue > 0 ? (monthlyPayment / monthlyRevenue * 100) : 0;
  const totalDaily = dailyPayment + existingDaily;
  const dailyRevLeft = (monthlyRevenue / 22) - totalDaily;
  const pctColor = pctOfRev > 20 ? '#ef4444' : pctOfRev > 15 ? '#eab308' : '#86efac';

  const lock = async () => {
    setSaving(true);
    const BASE = window.location.hostname === 'closerai.apipay.cash' ? '/api/v1' : '/app/api/v1';
    try {
      const res = await fetch(`${BASE}/deals/${deal.id}/offer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lender_name: '',
          status: 'pending',
          offer_amount: amount,
          factor_rate: factor,
          term_months: Math.round(termDays / 22),
          payment_amount: Math.round((payFreq === 'daily' ? dailyPayment : weeklyPayment) * 100) / 100,
          payment_frequency: payFreq,
          total_payback: Math.round(totalPayback * 100) / 100,
          notes: `Created via pitch review calculator. Existing daily: $${existingDaily.toFixed(2)}`,
        }),
      });
      const data = await res.json();
      const offerId = data.id;
      setSavedOfferId(offerId || null);
      setSaved(true);
      onOfferSaved();
      setTimeout(() => setSaved(false), 8000);
    } catch (e: any) { alert('Failed: ' + e.message); }
    setSaving(false);
  };

  const sliderStyle: React.CSSProperties = { width: '100%', accentColor: '#635bff' };
  const labelStyle: React.CSSProperties = { fontSize: 11, color: '#666680', display: 'flex', justifyContent: 'space-between', marginBottom: 4 };
  const valStyle: React.CSSProperties = { color: '#fff', fontWeight: 700 };

  return (
    <div style={{ marginTop: 14, borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 10 }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, color: '#635bff', fontFamily: 'inherit' }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Calculator size={13} /> Calculator
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Funding Amount */}
          <div>
            <div style={labelStyle}><span>Funding Amount</span><span style={valStyle}>${amount.toLocaleString()}</span></div>
            <input type="range" min={sliderMin} max={sliderMax} step={1000} value={Math.min(amount, sliderMax)} onChange={e => setAmount(+e.target.value)} style={sliderStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#444460', marginTop: 2 }}>
              <span>$5K</span>
              <span style={{ color: '#635bff' }}>${(sliderMax/1000).toFixed(0)}K max{bestOffer?.offer_amount ? ` (offer ×1.5)` : ''}</span>
            </div>
          </div>
          {/* Factor Rate */}
          <div>
            <div style={labelStyle}><span>Factor Rate</span><span style={valStyle}>{factor.toFixed(2)}</span></div>
            <input type="range" min={1.15} max={1.50} step={0.01} value={factor} onChange={e => setFactor(+e.target.value)} style={sliderStyle} />
          </div>
          {/* Term */}
          <div>
            <div style={labelStyle}><span>Term</span><span style={valStyle}>{termDisplay}</span></div>
            <input type="range" min={termMin} max={termMax} step={payFreq === 'daily' ? 22 : 5} value={termDays}
              onChange={e => setTermDays(+e.target.value)} style={sliderStyle} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#444460', marginTop: 2 }}>
              <span>{payFreq === 'daily' ? '66d' : '13wk'}</span>
              <span>{payFreq === 'daily' ? '528d' : '104wk'}</span>
            </div>
          </div>

          {/* Results */}
          <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: 10 }}>
            {/* Payment toggle + big payment display */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: '#555570', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#818cf8' }}>
                  ${(payFreq === 'daily' ? dailyPayment : weeklyPayment).toLocaleString(undefined, { maximumFractionDigits: 2, minimumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: 10, color: '#555570' }}>per {payFreq === 'daily' ? 'day' : 'week'}</div>
              </div>
              <div style={{ display: 'flex', borderRadius: 6, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                {(['daily', 'weekly'] as const).map(f => (
                  <button key={f} onClick={() => setPayFreq(f)}
                    style={{
                      padding: '5px 10px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                      fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
                      background: payFreq === f ? '#635bff' : 'rgba(255,255,255,0.03)',
                      color: payFreq === f ? '#fff' : '#666680',
                    }}>{f}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                { lbl: 'Total Payback', val: `$${totalPayback.toLocaleString(undefined,{maximumFractionDigits:0})}`, color: '#86efac' },
                { lbl: 'Cost of Capital', val: `$${costOfCapital.toLocaleString(undefined,{maximumFractionDigits:0})}`, color: '#fff' },
                { lbl: '% of Monthly Rev', val: monthlyRevenue ? `${pctOfRev.toFixed(1)}%` : '—', color: pctColor },
                { lbl: 'APR (est)', val: `${((costOfCapital/amount)/(termDays/264)*100).toFixed(1)}%`, color: '#c084fc' },
              ].map((r, i) => (
                <div key={i} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#555570', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{r.lbl}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Obligation */}
          {existingDaily > 0 && (
            <div style={{ background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.15)', borderRadius: 8, padding: 10, fontSize: 12 }}>
              <div style={{ color: '#eab308', fontWeight: 700, fontSize: 10, textTransform: 'uppercase', marginBottom: 6 }}>⚡ Total Daily Obligation</div>
              {existingAdv.map((a: any, i: number) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: '#fde68a', marginBottom: 2 }}>
                  <span>{a.lender}</span><span>${parseFloat(a.daily_payment||0).toFixed(2)}</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d1d5db', marginBottom: 2 }}>
                <span>New payment</span><span>${dailyPayment.toFixed(2)}</span>
              </div>
              <div style={{ borderTop: '1px solid rgba(234,179,8,0.2)', paddingTop: 6, display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
                <span style={{ color: '#fbbf24' }}>Total daily</span><span style={{ color: '#fbbf24' }}>${totalDaily.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
                <span style={{ color: '#6b7280' }}>Rev left/day</span>
                <span style={{ color: dailyRevLeft >= 0 ? '#86efac' : '#f87171' }}>${dailyRevLeft.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Lock button */}
          <button onClick={lock} disabled={saving || saved}
            style={{
              width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
              background: saved ? 'rgba(34,197,94,0.15)' : '#16a34a',
              color: saved ? '#86efac' : '#fff',
              opacity: saving ? 0.6 : 1,
            }}>
            {saving ? '⏳ Saving...' : saved ? '✅ Offer Saved!' : '🔒 Lock & Save Offer'}
          </button>

          {/* Preview + Send links after save */}
          {saved && savedOfferId && (
            <div style={{ background: 'rgba(99,91,255,0.08)', border: '1px solid rgba(99,91,255,0.2)', borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 10, color: '#818cf8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Offer Ready</div>
              <a
                href={`/offer/${savedOfferId}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'block', width: '100%', padding: '8px 0', borderRadius: 6,
                  background: 'rgba(99,91,255,0.2)', border: '1px solid rgba(99,91,255,0.3)',
                  color: '#a5b4fc', fontSize: 12, fontWeight: 700, textAlign: 'center',
                  textDecoration: 'none', marginBottom: 6,
                }}>
                👁 Preview Customer Page
              </a>
              <div style={{ fontSize: 10, color: '#555570', textAlign: 'center', wordBreak: 'break-all' }}>
                /offer/{savedOfferId.slice(0, 8)}...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Main Component ─── */
export function PitchReviewView() {
  const [dealDetail, setDealDetail] = useState<DealDetail | null>(null);
  const [pitchData, setPitchData] = useState<PitchData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pitchLoading, setPitchLoading] = useState(true);
  const [error, setError] = useState('');

  // Pitch frame interaction state
  const [activeFrame, setActiveFrame] = useState<string | null>(null);
  const [editedSms, setEditedSms] = useState<Record<string, string>>({});
  const [sendStatus, setSendStatus] = useState<Record<string, { sms?: boolean; email?: boolean; sending?: string }>>({});

  // Action state
  const [presellSending, setPresellSending] = useState(false);
  const [presellSent, setPresellSent] = useState(false);
  const [approvalSending, setApprovalSending] = useState(false);
  const [approvalSent, setApprovalSent] = useState(false);
  const [approvalUrl, setApprovalUrl] = useState('');

  const dealId = sessionStorage.getItem('pitchDealId') || '';
  const offerIds: string[] = (() => {
    try { return JSON.parse(sessionStorage.getItem('pitchOfferIds') || '[]'); } catch { return []; }
  })();

  const goBack = () => window.dispatchEvent(new CustomEvent('navigate', { detail: 'deals' }));

  // Fetch deal detail + pitch frames in parallel
  useEffect(() => {
    if (!dealId) { setError('No deal selected'); setLoading(false); setPitchLoading(false); return; }

    api<DealDetail>(`/deals/${dealId}`)
      .then(d => { setDealDetail(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });

    api<PitchData>(`/deals/${dealId}/pitch-frames`, {
      method: 'POST',
      body: JSON.stringify({ offer_ids: offerIds }),
    })
      .then(d => { setPitchData(d); setPitchLoading(false); })
      .catch(e => { setError(e.message); setPitchLoading(false); });
  }, [dealId]);

  // Derived data
  const deal = dealDetail?.deal || {};
  const contact = dealDetail?.contact || {};
  const offers = dealDetail?.offers?.filter((o: any) => offerIds.includes(o.id)) || [];
  const bestOffer = offers[0] || {};
  const documents = dealDetail?.documents || [];
  const frames = pitchData?.frames || [];
  const uw = dealDetail?.underwriting;
  const fintechBanks = dealDetail?.fintech_banks || [];
  const declineNotes = dealDetail?.decline_notes || [];

  // Parse existing advances
  let existingAdv: any[] = [];
  try {
    existingAdv = Array.isArray(deal.existing_advances) ? deal.existing_advances :
      JSON.parse(deal.existing_advances || '[]');
  } catch {}

  const merchantName = (contact.name || pitchData?.contact_name || deal.business || 'MERCHANT').toUpperCase();
  const businessName = deal.business || pitchData?.business || '';
  const phone = deal.phone || pitchData?.contact_phone || contact.phone || '';
  const email = contact.email || pitchData?.contact_email || '';
  const monthlyRev = uw?.avg_monthly_revenue || pitchData?.monthly_revenue || 0;
  const avgDailyBalance = pitchData?.avg_daily_balance || deal.avg_daily_balance || 0;
  const creditScore = deal.credit_score || contact.credit_score || '';

  // Revenue by month — sort chronologically
  const revByMonth: Record<string, number> = uw?.revenue_by_month || {};
  const MONTH_ORDER = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const sortedRevMonths = Object.entries(revByMonth).sort(([a], [b]) => {
    const getMonthNum = (s: string) => { const m = MONTH_ORDER.findIndex(mo => s.includes(mo)); const y = s.match(/\d{4}/)?.[0] || '2025'; return parseInt(y) * 12 + (m >= 0 ? m : 0); };
    return getMonthNum(a) - getMonthNum(b);
  });
  const revValues = sortedRevMonths.map(([, v]) => v);
  const revMax = Math.max(...revValues, 1);
  const revMin = Math.min(...revValues, 0);
  const revTrend = revValues.length >= 2 ? revValues[revValues.length-1] - revValues[0] : 0;

  // Industry risk classification
  const HIGH_RISK_INDUSTRIES = ['trucking','transport','cannabis','cbd','crypto','gambling','betting','adult','firearms','gun','pawn','restaurant','bar','nightclub','salon','nail','beauty','auto','car wash','roofing','construction','contractor','staffing','temp agency','credit repair'];
  const industry = (deal.industry || '').toLowerCase();
  const isHighRisk = HIGH_RISK_INDUSTRIES.some(r => industry.includes(r));
  const industryLenderPct = isHighRisk ? 35 : 90; // % of lenders who WILL touch it

  // Fintech bank lender impact (65% won't touch Found/GoBank/Mercury)
  const fintechLenderBlock = fintechBanks.length > 0 ? 65 : 0;

  // Major red flags
  const majorRedFlags: string[] = [];
  if (declineNotes.length > 0) majorRedFlags.push(...declineNotes.filter(n => n.length > 5).map(n => `⚠️ ${n}`));
  if (uw?.nsf_count && uw.nsf_count > 0) majorRedFlags.push(`${uw.nsf_count} NSF(s) on file`);
  if (uw?.negative_days && uw.negative_days > 0) majorRedFlags.push(`${uw.negative_days} negative day(s)`);
  if (fintechBanks.length > 0) majorRedFlags.push(`Online bank only (${fintechBanks.join(', ')}) — ~${fintechLenderBlock}% of lenders won't fund`);
  if (isHighRisk) majorRedFlags.push(`High-risk industry: ${deal.industry} — only ~${industryLenderPct}% of lenders eligible`);
  if (uw?.red_flags) majorRedFlags.push(...(uw.red_flags as string[]).filter((f: string) => !majorRedFlags.some(r => r.includes(f))));

  const offerAmount = bestOffer.offer_amount || 0;
  const factorRate = bestOffer.factor_rate || 0;
  const paymentAmount = bestOffer.payment_amount || 0;
  const termDays = bestOffer.term_length || bestOffer.term_months ? (bestOffer.term_months * 30) : 0;
  const commission = bestOffer.commission_dollars || 0;

  // Signal badges from analysis
  const signals: { color: string; label: string; detail: string }[] = [];
  if (existingAdv.length > 0) {
    const totalDaily = existingAdv.reduce((s: number, a: any) => s + (a.daily_payment || 0), 0);
    const pct = monthlyRev ? Math.round((totalDaily * 22) / monthlyRev * 100) : 0;
    signals.push({ color: '#dc2626', label: existingAdv.map((a: any) => a.lender).join(', ').toUpperCase() + ' ACTIVE', detail: `$${totalDaily.toFixed(0)}/day — ${pct}% rev` });
  }
  if (pitchData?.notes?.toLowerCase().includes('dip') || pitchData?.notes?.toLowerCase().includes('decline')) {
    signals.push({ color: '#ca8a04', label: 'REVENUE DIP', detail: 'Check recent months' });
  }
  if (existingAdv.length <= 1) {
    signals.push({ color: '#16a34a', label: existingAdv.length === 0 ? 'CLEAN — NO STACKING' : '1st POSITION', detail: existingAdv.length === 0 ? 'No existing advances' : 'Single position' });
  }

  // Quick links: application + 3 most recent statements
  const appDoc = documents.find((d: any) => d.doc_type === 'application' || d.s3_key?.toLowerCase().includes('app'));
  const statementDocs = documents
    .filter((d: any) => d.doc_type === 'bank_statement' || d.s3_key?.toLowerCase().includes('statement'))
    .slice(0, 3);
  const quickDocs = [appDoc, ...statementDocs].filter(Boolean);

  // Send pitch SMS
  const sendPitchSms = async (frame: PitchFrame) => {
    setSendStatus(prev => ({ ...prev, [frame.id]: { ...prev[frame.id], sending: 'sms' } }));
    try {
      await api(`/deals/${dealId}/send-pitch-frame`, {
        method: 'POST',
        body: JSON.stringify({
          frame_id: frame.id,
          channel: 'sms',
          merchant_phone: phone,
          merchant_email: email,
          sms_text: editedSms[frame.id] ?? frame.sms_text,
          email_subject: frame.email_subject,
          email_html: frame.email_html,
          offer_ids: offerIds,
        }),
      });
      setSendStatus(prev => ({ ...prev, [frame.id]: { ...prev[frame.id], sending: undefined, sms: true } }));
      setTimeout(() => setSendStatus(prev => ({ ...prev, [frame.id]: { ...prev[frame.id], sms: false } })), 30000);
    } catch (e: any) {
      setSendStatus(prev => ({ ...prev, [frame.id]: { ...prev[frame.id], sending: undefined } }));
      alert('SMS failed: ' + e.message);
    }
  };

  const sendPitchEmail = async (frame: PitchFrame) => {
    setSendStatus(prev => ({ ...prev, [frame.id]: { ...prev[frame.id], sending: 'email' } }));
    try {
      await api(`/deals/${dealId}/send-pitch-frame`, {
        method: 'POST',
        body: JSON.stringify({
          frame_id: frame.id,
          channel: 'email',
          merchant_phone: phone,
          merchant_email: email,
          sms_text: editedSms[frame.id] ?? frame.sms_text,
          email_subject: frame.email_subject,
          email_html: frame.email_html,
          offer_ids: offerIds,
        }),
      });
      setSendStatus(prev => ({ ...prev, [frame.id]: { ...prev[frame.id], sending: undefined, email: true } }));
    } catch (e: any) {
      setSendStatus(prev => ({ ...prev, [frame.id]: { ...prev[frame.id], sending: undefined } }));
      alert('Email failed: ' + e.message);
    }
  };

  // Send approval link
  const sendApproval = async () => {
    if (!bestOffer.id) return;
    setApprovalSending(true);
    try {
      const result = await api(`/deals/${dealId}/send-offer-sms`, {
        method: 'POST',
        body: JSON.stringify({
          offer_id: bestOffer.id,
          merchant_phone: phone,
          merchant_name: (contact.name || pitchData?.contact_name || '').split(' ')[0] || 'there',
        }),
      });
      setApprovalSent(true);
      setApprovalUrl(result.acceptance_url || '');
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
    setApprovalSending(false);
  };

  // Send pre-sell packet (re-use pitch frame with presell type)
  const sendPresell = async () => {
    setPresellSending(true);
    try {
      await api(`/deals/${dealId}/send-pitch-frame`, {
        method: 'POST',
        body: JSON.stringify({
          frame_id: 'presell',
          channel: 'email',
          merchant_phone: phone,
          merchant_email: email,
          sms_text: '',
          email_subject: `Your Funding Offer — ${businessName}`,
          email_html: `<html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1e293b">
<h2 style="color:#0b3d91">Your Funding Offer — ${businessName}</h2>
<p>Hi ${(contact.name || '').split(' ')[0] || 'there'},</p>
<p>Great news — we have an approved offer for <strong>${businessName}</strong>:</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
<tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Approved Amount</td><td style="padding:8px;font-weight:700;font-size:18px;color:#0b3d91">${offerAmount.toLocaleString()}</td></tr>
<tr><td style="padding:8px;color:#64748b">Factor Rate</td><td style="padding:8px;font-weight:600">${factorRate}x</td></tr>
<tr style="background:#f8fafc"><td style="padding:8px;color:#64748b">Daily Payment</td><td style="padding:8px;font-weight:600">${paymentAmount.toLocaleString()}/day</td></tr>
<tr><td style="padding:8px;color:#64748b">Term</td><td style="padding:8px;font-weight:600">${(deal as any)?.selected_offer?.term_months ? Math.round((deal as any).selected_offer.term_months * 30) + ' days' : '150 days'}</td></tr>
</table>
<p style="background:#eff6ff;border-left:4px solid #0b3d91;padding:12px;font-size:13px">
<strong>This is your Bronze Tier offer.</strong> Make payments on time and we automatically upgrade you to Silver (revolving lines of credit, equipment financing, better rates) in as little as 90-150 days.
</p>
<p style="font-size:13px">Here's your full funding roadmap — where you start, and where we take you:</p>
<img src="https://chc-lendingtree-logs.s3.us-east-1.amazonaws.com/assets/funding_roadmap.jpg" alt="CHC Capital Funding Roadmap" style="width:100%;border-radius:8px;margin:12px 0">
<p>To move forward, reply to this email or call us at 786-280-4399. We can have funds in your account within 24 hours.</p>
<p>— Jacob Claude<br><strong>Head of Processing | CHC Capital Group</strong><br>jclaude@chccapitalgroup.com · 786-280-4399</p>
</body></html>`,
          offer_ids: offerIds,
        }),
      });
      setPresellSent(true);
    } catch (e: any) {
      alert('Failed: ' + e.message);
    }
    setPresellSending(false);
  };

  const refreshPitches = () => {
    setPitchLoading(true);
    api<PitchData>(`/deals/${dealId}/pitch-frames`, {
      method: 'POST',
      body: JSON.stringify({ offer_ids: offerIds }),
    })
      .then(d => { setPitchData(d); setPitchLoading(false); setActiveFrame(null); })
      .catch(e => { alert(e.message); setPitchLoading(false); });
  };

  /* ─── LOADING STATE ─── */
  if (loading) {
    return (
      <div style={{ background: '#0a0a0f', minHeight: '100vh', padding: '20px', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Skeleton h="28px" w="400px" />
          <div className="mt-2"><Skeleton h="18px" w="350px" /></div>
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            <SkeletonCard /><SkeletonCard /><SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  if (error && !dealDetail) {
    return (
      <div style={{ background: '#0a0a0f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div className="text-center">
          <p style={{ color: '#f87171', fontSize: 18, marginBottom: 16 }}>{error}</p>
          <button onClick={goBack} style={{ padding: '8px 16px', background: '#1f2937', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' }}>
            ← Back to Deals
          </button>
        </div>
      </div>
    );
  }

  const firstName = (contact.name || pitchData?.contact_name || '').split(' ')[0] || 'Merchant';

  return (
    <div style={{ background: '#0a0a0f', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#fff', paddingBottom: 60 }}>

      {/* ═══════════════════ TOP BANNER ═══════════════════ */}
      <div style={{ background: '#0f0f16', borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '14px 20px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          {/* Line 1: Merchant identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '0.5px', color: '#fff' }}>
              {merchantName}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span style={{ color: '#a0a0b8', fontSize: 14, fontWeight: 500 }}>{businessName}</span>
            <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
            <span style={{ color: '#a0a0b8', fontSize: 14 }}>{phone}</span>
            {phone && (
              <a href={`tel:${phone}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'rgba(99,91,255,0.15)', color: '#635bff', textDecoration: 'none', fontSize: 14 }} title="Call">
                📞
              </a>
            )}
            {email && (
              <a href={`mailto:${email}`} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 6, background: 'rgba(99,91,255,0.15)', color: '#635bff', textDecoration: 'none', fontSize: 14 }} title="Email">
                ✉️
              </a>
            )}
          </div>

          {/* Line 2: Offer terms */}
          <div style={{ fontSize: 13, color: '#8888a8', marginTop: 4, fontWeight: 500 }}>
            <span style={{ color: '#635bff', fontWeight: 700 }}>${offerAmount.toLocaleString()}</span>
            {' @ '}{factorRate}x · {termDays || '—'} days · ${paymentAmount.toLocaleString()}/day · <span style={{ color: '#eab308', fontWeight: 700 }}>COMM: ${commission.toLocaleString()}</span>
          </div>

          {/* Signal badges */}
          {signals.length > 0 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
              {signals.map((s, i) => (
                <span key={i} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 20,
                  background: s.color + '18', border: `1px solid ${s.color}40`,
                  fontSize: 11, fontWeight: 700, letterSpacing: '0.3px',
                  color: s.color === '#dc2626' ? '#fca5a5' : s.color === '#ca8a04' ? '#fde047' : '#86efac',
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                  {s.label} <span style={{ fontWeight: 400, opacity: 0.8 }}>({s.detail})</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ THREE COLUMNS ═══════════════════ */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="dossier-grid">
          
          {/* ─── COLUMN 1: THE NUMBERS ─── */}
          <div style={{ background: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 14 }}>
            
            {/* Core Numbers */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#635bff', letterSpacing: '1px', marginBottom: 10, textTransform: 'uppercase' }}>The Numbers</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {[
                  { k: 'Avg Rev', v: monthlyRev ? `$${monthlyRev.toLocaleString()}/mo` : '—' },
                  { k: 'ADB', v: avgDailyBalance ? `$${avgDailyBalance.toLocaleString()}${avgDailyBalance < 5000 ? ' ⚠️ thin' : ''}` : '—' },
                  { k: 'NSF', v: uw?.nsf_count ? `${uw.nsf_count} ⚠️` : '0 ✓', good: !uw?.nsf_count },
                  { k: 'Neg Days', v: uw?.negative_days ? `${uw.negative_days} ⚠️` : '0 ✓', good: !uw?.negative_days },
                  { k: 'Position', v: existingAdv.length > 0 ? `${existingAdv.length} active — ${existingAdv.map((a: any) => a.lender).join(', ')}` : 'Clean ✓', good: existingAdv.length === 0 },
                  { k: 'Ask → Got', v: `$${(deal.amount_requested || 0).toLocaleString()} → $${offerAmount.toLocaleString()}` },
                  { k: 'Credit', v: creditScore ? `${creditScore}${parseInt(creditScore) < 600 ? ' ⚠️' : ' ✓'}` : '—', good: parseInt(creditScore) >= 600 },
                ].map((row, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
                    <span style={{ color: '#555570', fontWeight: 600, minWidth: 60 }}>{row.k}</span>
                    <span style={{ color: (row as any).good ? '#86efac' : '#e4e4f0', fontWeight: 500, textAlign: 'right', fontSize: 11 }}>{row.v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Month over Month */}
            {sortedRevMonths.length > 0 && (
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#555570', letterSpacing: '1px', marginBottom: 8, textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Revenue MoM</span>
                  <span style={{ color: revTrend >= 0 ? '#86efac' : '#f87171' }}>{revTrend >= 0 ? '▲' : '▼'} {revTrend >= 0 ? '+' : ''}${Math.abs(revTrend).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {sortedRevMonths.map(([month, rev], i) => {
                    const pct = Math.round((rev / revMax) * 100);
                    const isLow = rev < monthlyRev * 0.6;
                    const label = month.replace(/\s+\d{4}/, '').slice(0, 3).toUpperCase();
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 9, color: '#444460', minWidth: 28, textAlign: 'right' }}>{label}</span>
                        <div style={{ flex: 1, height: 10, background: 'rgba(255,255,255,0.04)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: isLow ? '#ef4444' : '#635bff', borderRadius: 3, transition: 'width 0.3s' }} />
                        </div>
                        <span style={{ fontSize: 9, color: isLow ? '#f87171' : '#a0a0b8', minWidth: 46, textAlign: 'right' }}>${(rev/1000).toFixed(0)}K</span>
                      </div>
                    );
                  })}
                </div>
                {uw?.qualification_notes && (
                  <div style={{ marginTop: 8, fontSize: 10, color: '#666680', lineHeight: 1.4, fontStyle: 'italic' }}>
                    {uw.qualification_notes}
                  </div>
                )}
              </div>
            )}

            {/* Industry + Lender Eligibility */}
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#555570', letterSpacing: '1px', marginBottom: 8, textTransform: 'uppercase' }}>Industry & Eligibility</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#555570' }}>Industry</span>
                  <span style={{ color: isHighRisk ? '#fca5a5' : '#86efac', fontWeight: 600 }}>{deal.industry || '—'} {isHighRisk ? '⚠️ HIGH RISK' : '✓'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: '#555570' }}>Lenders eligible</span>
                  <span style={{ color: industryLenderPct < 60 ? '#f87171' : '#86efac', fontWeight: 700 }}>~{industryLenderPct}%</span>
                </div>
                {fintechBanks.length > 0 && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#555570' }}>Bank type</span>
                      <span style={{ color: '#fbbf24', fontWeight: 600 }}>{fintechBanks.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(', ')} (online)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                      <span style={{ color: '#555570' }}>Won't fund online bank</span>
                      <span style={{ color: '#f87171', fontWeight: 700 }}>~{fintechLenderBlock}%</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Major Red Flags */}
            {majorRedFlags.length > 0 && (
              <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: 8, padding: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#f87171', letterSpacing: '1px', marginBottom: 8, textTransform: 'uppercase' }}>⛔ Major Red Flags</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {majorRedFlags.map((f, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#fca5a5', lineHeight: 1.4, paddingLeft: 8, borderLeft: '2px solid rgba(220,38,38,0.4)' }}>{f}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Inline Calculator */}
            <DealCalculatorInline deal={deal} existingAdv={existingAdv} offers={offers} onOfferSaved={() => {}} />
          </div>

          {/* ─── COLUMN 2: THE PITCH ─── */}
          <div style={{ background: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#635bff', letterSpacing: '1px', marginBottom: 12, textTransform: 'uppercase' }}>
              The Pitch
            </div>

            {pitchLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} h="36px" />)}
                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <Loader2 size={16} className="animate-spin" style={{ color: '#635bff', display: 'inline-block' }} />
                  <span style={{ fontSize: 11, color: '#555570', marginLeft: 6 }}>Haiku generating…</span>
                </div>
              </div>
            ) : frames.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 20, color: '#555570', fontSize: 13 }}>
                No frames generated yet
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {frames.map((frame) => {
                  const isActive = activeFrame === frame.id;
                  const status = sendStatus[frame.id] || {};
                  return (
                    <div key={frame.id}>
                      {/* Pill */}
                      <button
                        onClick={() => setActiveFrame(isActive ? null : frame.id)}
                        style={{
                          width: '100%', textAlign: 'left', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 12px', borderRadius: 8,
                          background: isActive ? 'rgba(99,91,255,0.15)' : frame.recommended ? 'rgba(99,91,255,0.08)' : 'rgba(255,255,255,0.02)',
                          border: isActive ? '1px solid rgba(99,91,255,0.4)' : frame.recommended ? '1px solid rgba(99,91,255,0.2)' : '1px solid rgba(255,255,255,0.04)',
                          color: '#fff', fontSize: 13, fontWeight: 600,
                          transition: 'all 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{frame.emoji}</span>
                        <span style={{ flex: 1 }}>{frame.name}</span>
                        {frame.recommended && <span style={{ fontSize: 9, color: '#86efac', fontWeight: 700, letterSpacing: '0.5px' }}>REC</span>}
                        {status.sms && <Check size={12} style={{ color: '#86efac' }} />}
                      </button>

                      {/* Expanded: SMS text + send buttons */}
                      {isActive && (
                        <div style={{ padding: '10px 12px', marginTop: 4, background: 'rgba(0,0,0,0.3)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                          <textarea
                            value={editedSms[frame.id] ?? frame.sms_text}
                            onChange={(e) => setEditedSms(prev => ({ ...prev, [frame.id]: e.target.value }))}
                            maxLength={300}
                            rows={3}
                            style={{
                              width: '100%', background: 'rgba(255,255,255,0.04)', color: '#e4e4f0',
                              border: '1px solid rgba(255,255,255,0.08)', borderRadius: 6,
                              padding: '8px 10px', fontSize: 12, lineHeight: 1.4,
                              resize: 'vertical', outline: 'none', fontFamily: 'inherit',
                            }}
                          />
                          <div style={{ fontSize: 10, color: '#555570', marginTop: 2, marginBottom: 8 }}>
                            {(editedSms[frame.id] ?? frame.sms_text).length} chars
                          </div>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              onClick={() => sendPitchSms(frame)}
                              disabled={!!status.sending || status.sms === true}
                              style={{
                                flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                                background: status.sms ? 'rgba(34,197,94,0.15)' : '#635bff',
                                color: status.sms ? '#86efac' : '#fff',
                                opacity: status.sending ? 0.6 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              }}
                            >
                              {status.sending === 'sms' ? <><Loader2 size={12} className="animate-spin" /> Sending…</> :
                               status.sms ? <><Check size={12} /> ✓ Sent</> :
                               <><Phone size={12} /> 📱 SEND SMS</>}
                            </button>
                            <button
                              onClick={() => sendPitchEmail(frame)}
                              disabled={!!status.sending || status.email === true}
                              style={{
                                flex: 1, padding: '8px 0', borderRadius: 6, border: 'none', cursor: 'pointer',
                                fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                                background: status.email ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
                                color: status.email ? '#86efac' : '#a0a0b8',
                                opacity: status.sending ? 0.6 : 1,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              }}
                            >
                              {status.sending === 'email' ? <><Loader2 size={12} className="animate-spin" /> Sending…</> :
                               status.email ? <><Check size={12} /> ✓ Sent</> :
                               <><Mail size={12} /> 📧 SEND EMAIL</>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ─── COLUMN 3: CLOSE ACTIONS ─── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            
            {/* Pre-sell Packet */}
            <div
              style={{
                background: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16,
                cursor: presellSent ? 'default' : 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => !presellSent && ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,91,255,0.3)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)')}
            >
              <div style={{ fontSize: 16, marginBottom: 6 }}>📋</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>PRE-SELL PACKET</div>
              <div style={{ fontSize: 12, color: '#666680', marginBottom: 12 }}>Send docs + terms to {firstName}'s email</div>
              <button
                onClick={sendPresell}
                disabled={presellSending || presellSent || !email}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                  background: presellSent ? 'rgba(34,197,94,0.15)' : '#635bff',
                  color: presellSent ? '#86efac' : '#fff',
                  opacity: presellSending ? 0.6 : !email ? 0.3 : 1,
                }}
              >
                {presellSending ? 'Sending…' : presellSent ? '✓ Packet Sent' : 'SEND NOW →'}
              </button>
            </div>

            {/* Approve Offer */}
            <div
              style={{
                background: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16,
                cursor: approvalSent ? 'default' : 'pointer', transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => !approvalSent && ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(34,197,94,0.3)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.06)')}
            >
              <div style={{ fontSize: 16, marginBottom: 6 }}>✅</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>APPROVE OFFER</div>
              <div style={{ fontSize: 12, color: '#666680', marginBottom: 12 }}>{firstName} accepts ${offerAmount.toLocaleString()}</div>
              <button
                onClick={sendApproval}
                disabled={approvalSending || approvalSent || !bestOffer.id}
                style={{
                  width: '100%', padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                  background: approvalSent ? 'rgba(34,197,94,0.15)' : '#16a34a',
                  color: approvalSent ? '#86efac' : '#fff',
                  opacity: approvalSending ? 0.6 : !bestOffer.id ? 0.3 : 1,
                }}
              >
                {approvalSending ? 'Sending…' : approvalSent ? '✓ Link Sent' : 'SEND APPROVAL LINK →'}
              </button>
              {approvalUrl && (
                <div style={{ fontSize: 10, color: '#555570', marginTop: 6, wordBreak: 'break-all' }}>
                  {approvalUrl}
                </div>
              )}
            </div>

            {/* Quick Links */}
            <div style={{ background: '#0f0f16', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 16, marginBottom: 6 }}>🔗</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 10 }}>QUICK LINKS</div>
              {quickDocs.length === 0 ? (
                <div style={{ fontSize: 12, color: '#555570' }}>No documents available</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {quickDocs.map((doc: any, i: number) => (
                    <a
                      key={i}
                      href={doc.presigned_url || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        padding: '8px 10px', borderRadius: 6,
                        background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
                        color: '#a0a0b8', fontSize: 12, textDecoration: 'none',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(99,91,255,0.08)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    >
                      {doc.doc_type === 'application' || doc.s3_key?.includes('app')
                        ? <FileText size={14} style={{ color: '#635bff' }} />
                        : <BarChart3 size={14} style={{ color: '#635bff' }} />}
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {doc.display_name || doc.s3_key?.split('/').pop() || `Document ${i + 1}`}
                      </span>
                      <ExternalLink size={10} style={{ color: '#555570' }} />
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════ BOTTOM BAR (sticky) ═══════════════════ */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, height: 48,
        background: '#0f0f16', borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px', zIndex: 50,
      }}>
        <button
          onClick={goBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: '#666680', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={14} /> Back
        </button>

        <div style={{ fontSize: 12, color: '#555570', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#a0a0b8', fontWeight: 700 }}>{merchantName}</span>
          <span>·</span>
          <span style={{ color: '#635bff' }}>${offerAmount >= 1000 ? `${Math.round(offerAmount / 1000)}K` : offerAmount.toLocaleString()}</span>
          <span>·</span>
          <span style={{ color: '#eab308' }}>${commission >= 1000 ? `${(commission / 1000).toFixed(commission % 1000 === 0 ? 0 : 1)}K` : commission.toLocaleString()} COMM</span>
          <span>·</span>
          <span>{termDays || '—'} days</span>
        </div>

        <button
          onClick={refreshPitches}
          disabled={pitchLoading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', color: '#635bff', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            opacity: pitchLoading ? 0.5 : 1,
          }}
        >
          <RefreshCw size={14} className={pitchLoading ? 'animate-spin' : ''} /> Refresh Pitches
        </button>
      </div>

      {/* ─── Responsive CSS ─── */}
      <style>{`
        @media (max-width: 1024px) {
          .dossier-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}

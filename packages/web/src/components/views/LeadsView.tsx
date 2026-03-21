import { useEffect, useState, useCallback } from 'react';
import { Zap, TrendingUp, Clock, XCircle, RefreshCw, Phone, MessageSquare } from 'lucide-react';

interface LeadMerchant {
  phone: string; name: string; business: string;
  score: number; sends: number;
  replies: Array<{ ts: string; cat: string; text: string; agent_reply: string }>;
  categories: string[];
  states: Array<{ ts: string; state: string; notes: string }>;
  last_reply: string; last_send: string;
  docs_received: boolean; hyper: boolean; funded: boolean;
}

interface LeadSummary {
  urgent: number; warm: number; cold: number; no_reply: number; dead: number; total: number;
}

interface LeadsData {
  summary: LeadSummary;
  segments: {
    urgent: LeadMerchant[]; warm: LeadMerchant[];
    cold: LeadMerchant[]; dead: LeadMerchant[];
  };
  _generated_at: string;
  _source: string;
}

const BASE = '/app/api/v1';

async function fetchLeads(): Promise<LeadsData> {
  const res = await fetch(`${BASE}/leads`);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function refreshLeads(): Promise<{ ok: boolean; summary: LeadSummary }> {
  const res = await fetch(`${BASE}/leads/refresh`, { method: 'POST' });
  return res.json();
}

function timeSince(ts: string): string {
  if (!ts) return '—';
  try {
    const d = new Date(ts);
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  } catch { return ts.slice(0, 10); }
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 200 ? 'bg-red-500' : score >= 100 ? 'bg-orange-500' : score >= 60 ? 'bg-yellow-500' : 'bg-blue-500';
  return <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-white ${color}`}>{score}</span>;
}

function MerchantCard({ m, tier }: { m: LeadMerchant; tier: string }) {
  const [expanded, setExpanded] = useState(false);
  const lastReply = m.replies[m.replies.length - 1];
  const tierColors: Record<string, string> = {
    urgent: 'border-red-700/40 bg-red-900/10',
    warm: 'border-yellow-700/40 bg-yellow-900/5',
    cold: 'border-gray-700/40 bg-gray-900/10',
    dead: 'border-gray-800 bg-gray-900/5 opacity-60',
  };

  return (
    <div className={`border rounded-xl p-3 cursor-pointer transition ${tierColors[tier] || ''}`}
      onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <ScoreBadge score={m.score} />
            {m.hyper && <span className="text-xs bg-yellow-900/60 text-yellow-300 px-1.5 py-0.5 rounded font-bold animate-pulse">⚡</span>}
            {m.docs_received && <span className="text-xs bg-green-900/40 text-green-300 px-1.5 py-0.5 rounded">📄 Docs</span>}
            <span className="font-semibold text-white text-sm truncate">
              {m.business || m.name || m.phone}
            </span>
          </div>
          {(m.business && m.name) && <div className="text-xs text-gray-500 mt-0.5">{m.name}</div>}
          <div className="text-xs text-gray-500 mt-1">{m.phone}</div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-xs text-gray-500">{timeSince(m.last_reply || m.last_send)}</div>
          <div className="text-xs text-gray-600 mt-1">{m.sends} sends · {m.replies.length} replies</div>
        </div>
      </div>

      {lastReply && (
        <div className="mt-2 text-xs text-gray-300 bg-gray-800/50 rounded p-2 line-clamp-2">
          "{lastReply.text}"
        </div>
      )}

      {expanded && (
        <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
          {/* Full reply history */}
          <div className="text-xs text-gray-500 font-semibold">Reply history ({m.replies.length})</div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {m.replies.map((r, i) => (
              <div key={i} className="text-xs">
                <span className="text-gray-500">{timeSince(r.ts)}</span>
                <span className={`ml-2 px-1 rounded ${r.cat === 'interested' || r.cat === 'INTERESTED' ? 'bg-green-900/40 text-green-300' : 'bg-gray-800 text-gray-400'}`}>{r.cat || '?'}</span>
                <div className="text-gray-300 mt-0.5 ml-1">Merchant: "{r.text}"</div>
                {r.agent_reply && <div className="text-blue-400 ml-1">Agent: "{r.agent_reply}"</div>}
              </div>
            ))}
          </div>
          {/* States */}
          {m.states.length > 0 && (
            <div>
              <div className="text-xs text-gray-500 font-semibold">States</div>
              {m.states.map((s, i) => (
                <div key={i} className="text-xs text-gray-400">{s.state} {s.notes ? `— ${s.notes.slice(0, 60)}` : ''}</div>
              ))}
            </div>
          )}
          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <a href={`tel:${m.phone}`} className="flex items-center gap-1 text-xs bg-blue-900/30 text-blue-300 px-2 py-1 rounded hover:bg-blue-900/50">
              <Phone size={10} /> Call
            </a>
            <a href={`sms:${m.phone}`} className="flex items-center gap-1 text-xs bg-green-900/30 text-green-300 px-2 py-1 rounded hover:bg-green-900/50">
              <MessageSquare size={10} /> SMS
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

const SEGMENT_TABS = [
  { key: 'urgent', label: '🔥 Urgent', color: 'text-red-400 border-red-500' },
  { key: 'warm', label: '🟡 Warm', color: 'text-yellow-400 border-yellow-500' },
  { key: 'cold', label: '❄️ Cold', color: 'text-blue-400 border-blue-500' },
  { key: 'dead', label: '💀 Dead', color: 'text-gray-500 border-gray-600' },
];

export function LeadsView() {
  const [data, setData] = useState<LeadsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('urgent');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true);
        await refreshLeads();
      }
      const d = await fetchLeads();
      setData(d);
      setLastRefresh(new Date());
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Poll summary every 2 min — cheap (cache hit)
    const interval = setInterval(() => load(), 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const summary = data?.summary;
  const currentLeads = data?.segments?.[activeTab as keyof typeof data.segments] ?? [];

  return (
    <div className="w-full max-w-4xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <TrendingUp size={24} /> Lead Priority Queue
        </h2>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Clock size={10} /> {timeSince(lastRefresh.toISOString())}
            </span>
          )}
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1 text-xs bg-gray-800 text-gray-300 px-3 py-1.5 rounded hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-900/30 border border-red-800/50 rounded text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Summary bar */}
      {summary && (
        <div className="grid grid-cols-5 gap-2 mb-6">
          {[
            { key: 'urgent', label: 'Urgent', val: summary.urgent, color: 'text-red-300', bg: 'bg-red-900/20 border-red-800/30' },
            { key: 'warm', label: 'Warm', val: summary.warm, color: 'text-yellow-300', bg: 'bg-yellow-900/20 border-yellow-800/30' },
            { key: 'cold', label: 'Cold', val: summary.cold, color: 'text-blue-300', bg: 'bg-blue-900/20 border-blue-800/30' },
            { key: 'no_reply', label: 'No Reply', val: summary.no_reply, color: 'text-gray-400', bg: 'bg-gray-900/20 border-gray-800' },
            { key: 'dead', label: 'Dead', val: summary.dead, color: 'text-gray-600', bg: 'bg-gray-900/10 border-gray-800' },
          ].map((s) => (
            <div key={s.key} className={`border rounded-xl p-3 text-center ${s.bg}`}>
              <div className={`text-xl font-bold ${s.color}`}>{s.val.toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Segment tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-4 overflow-x-auto">
        {SEGMENT_TABS.map((tab) => {
          const count = summary?.[tab.key as keyof LeadSummary] ?? 0;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap flex items-center gap-2 transition-colors ${
                activeTab === tab.key ? tab.color : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {tab.label}
              <span className="text-xs bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-full">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Lead cards */}
      {loading ? (
        <div className="space-y-3">
          {[0,1,2,3,4].map(i => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-800 rounded w-48 mb-2" />
              <div className="h-3 bg-gray-800 rounded w-64" />
            </div>
          ))}
        </div>
      ) : currentLeads.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <XCircle size={36} className="mx-auto mb-3 text-gray-700" />
          <p>No leads in this segment</p>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-3">
            Showing {currentLeads.length} leads · sorted by close probability score
          </div>
          {currentLeads.map((m) => (
            <MerchantCard key={m.phone} m={m} tier={activeTab} />
          ))}
        </div>
      )}
    </div>
  );
}

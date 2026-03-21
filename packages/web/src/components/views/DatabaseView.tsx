import { useEffect, useState, useMemo } from 'react';
import { fetchContacts } from '../../api';
import { Database, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Contact } from '../../types';

export function DatabaseView() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const pageSize = 25;

  useEffect(() => {
    fetchContacts({ limit: 500 }).then(d => setContacts(d.contacts || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return contacts;
    const q = query.toLowerCase();
    return contacts.filter(c =>
      c.name?.toLowerCase().includes(q) ||
      c.companyName?.toLowerCase().includes(q) ||
      c.phone?.includes(q) ||
      c.email?.toLowerCase().includes(q)
    );
  }, [contacts, query]);

  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);

  const exportCsv = () => {
    const headers = ['Name', 'Business', 'Phone', 'Email', 'Tags', 'Tier', 'SMS Count', 'Last Activity'];
    const rows = filtered.map(c => [
      c.name, c.companyName, c.phone, c.email,
      (c.tags || []).join('; '), c.tier || '', c.smsSentCount || 0, c.lastActivity || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `contacts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold text-white">Database</h2>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input value={query} onChange={e => { setQuery(e.target.value); setPage(0); }}
              placeholder="Search contacts..."
              className="bg-gray-900 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white text-sm placeholder-gray-600 focus:border-indigo-500 focus:outline-none w-60" />
          </div>
          <button onClick={exportCsv} className="px-3 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm flex items-center gap-1.5">
            <Download size={14} /> CSV
          </button>
        </div>
      </div>

      <span className="text-sm text-gray-500">{filtered.length} contacts</span>

      {loading ? (
        <div className="animate-pulse space-y-1">{[...Array(10)].map((_, i) => <div key={i} className="h-10 bg-gray-900 rounded" />)}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs border-b border-gray-800">
                <th className="pb-2 pr-4">Name</th>
                <th className="pb-2 pr-4">Business</th>
                <th className="pb-2 pr-4">Phone</th>
                <th className="pb-2 pr-4">Tier</th>
                <th className="pb-2 pr-4">SMS</th>
                <th className="pb-2">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((c) => (
                <tr key={c.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                  <td className="py-2 pr-4 text-white">{c.name || '—'}</td>
                  <td className="py-2 pr-4 text-gray-400 truncate max-w-[200px]">{c.companyName || '—'}</td>
                  <td className="py-2 pr-4 text-gray-400 font-mono text-xs">{c.phone}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      c.tier === 'hot' ? 'bg-red-900/50 text-red-300' :
                      c.tier === 'warm' ? 'bg-yellow-900/50 text-yellow-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>{c.tier || 'cold'}</span>
                  </td>
                  <td className="py-2 pr-4 text-gray-400">{c.smsSentCount || 0}</td>
                  <td className="py-2 text-gray-500 text-xs">{c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-4">
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
            className="p-2 bg-gray-800 rounded-lg disabled:opacity-30"><ChevronLeft size={16} className="text-gray-400" /></button>
          <span className="text-sm text-gray-500">Page {page + 1} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
            className="p-2 bg-gray-800 rounded-lg disabled:opacity-30"><ChevronRight size={16} className="text-gray-400" /></button>
        </div>
      )}
    </div>
  );
}

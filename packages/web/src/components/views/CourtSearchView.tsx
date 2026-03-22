import { useState } from 'react';
import { fetchCourtSearch } from '../../api';
import { Search, Scale, Loader2 } from 'lucide-react';

export function CourtSearchView() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchCourtSearch(query.trim());
      setResults(data);
      if (data.error) setError(data.error);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold text-white">Court Search</h2>

      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Search business name, owner, EIN..."
            className="w-full bg-[var(--bg-card)] border border-[var(--border)] rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-[var(--text-subtle)] focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <button onClick={doSearch} disabled={loading || !query.trim()}
          className="px-6 py-3 bg-[var(--accent)] hover:opacity-90 disabled:bg-[var(--bg-elevated)] disabled:text-[var(--text-subtle)] text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />}
          Search
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      {results && !results.error && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5">
          <h3 className="text-sm text-[var(--text-muted)] mb-3">Results for "{results.query}"</h3>
          {Array.isArray(results.results) ? (
            results.results.length === 0 ? (
              <p className="text-[var(--text-muted)] text-sm text-center py-4">No records found</p>
            ) : (
              <div className="space-y-3">
                {results.results.map((r: any, i: number) => (
                  <div key={i} className="bg-[var(--bg-elevated)]/60 rounded-xl p-3">
                    <pre className="text-[var(--text-secondary)] text-xs whitespace-pre-wrap">{typeof r === 'string' ? r : JSON.stringify(r, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )
          ) : (
            <pre className="text-[var(--text-secondary)] text-xs whitespace-pre-wrap">{typeof results.results === 'string' ? results.results : JSON.stringify(results.results, null, 2)}</pre>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-12 text-center">
          <Scale size={36} className="text-[var(--text-subtle)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">Search public court records for liens, judgments, and bankruptcies</p>
        </div>
      )}
    </div>
  );
}

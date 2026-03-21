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
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="Search business name, owner, EIN..."
            className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
          />
        </div>
        <button onClick={doSearch} disabled={loading || !query.trim()}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 text-white rounded-xl text-sm font-medium transition-colors flex items-center gap-2">
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Scale size={16} />}
          Search
        </button>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-800/50 rounded-xl text-red-300 text-sm">{error}</div>
      )}

      {results && !results.error && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-sm text-gray-400 mb-3">Results for "{results.query}"</h3>
          {Array.isArray(results.results) ? (
            results.results.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No records found</p>
            ) : (
              <div className="space-y-3">
                {results.results.map((r: any, i: number) => (
                  <div key={i} className="bg-gray-800/60 rounded-xl p-3">
                    <pre className="text-gray-300 text-xs whitespace-pre-wrap">{typeof r === 'string' ? r : JSON.stringify(r, null, 2)}</pre>
                  </div>
                ))}
              </div>
            )
          ) : (
            <pre className="text-gray-300 text-xs whitespace-pre-wrap">{typeof results.results === 'string' ? results.results : JSON.stringify(results.results, null, 2)}</pre>
          )}
        </div>
      )}

      {!results && !loading && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Scale size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Search public court records for liens, judgments, and bankruptcies</p>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { fetchDeals } from '../../api';
import { DollarSign, Trophy } from 'lucide-react';

export function DealsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeals().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-800 rounded w-40 animate-pulse" />
      {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-20" />)}
    </div>
  );

  const deals = data?.deals || [];
  const lambdaStats = data?.lambdaStats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Deals</h2>
        <div className="flex items-center gap-2 text-sm">
          <Trophy size={16} className="text-green-400" />
          <span className="text-green-400 font-bold">{deals.length} funded</span>
        </div>
      </div>

      {lambdaStats && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <h3 className="text-sm text-gray-500 mb-2">Lambda Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(lambdaStats).filter(([k]) => typeof lambdaStats[k] === 'number').map(([k, v]) => (
              <div key={k} className="bg-gray-800/60 rounded-xl p-3">
                <p className="text-xs text-gray-500">{k.replace(/_/g, ' ')}</p>
                <p className="text-white font-bold">{String(v)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {deals.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <DollarSign size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No funded deals yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {deals.map((d: any, i: number) => (
            <div key={i} className="bg-gray-900 border border-green-900/50 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">{d.business || d.phone}</p>
                  <p className="text-xs text-gray-500">{d.phone} {d.agent ? `· ${d.agent}` : ''}</p>
                </div>
                <div className="text-right">
                  <span className="text-green-400 font-bold text-sm">FUNDED</span>
                  <p className="text-xs text-gray-600">{d.ts ? new Date(d.ts).toLocaleDateString() : d.last_action_at ? new Date(d.last_action_at).toLocaleDateString() : ''}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
import { fetchDocuments } from '../../api';
import { FileText, Download, FolderOpen } from 'lucide-react';

export function DocumentsView() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDocuments().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-800 rounded w-40 animate-pulse" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-24" />)}
      </div>
    </div>
  );

  const s3Docs = data?.s3Documents || [];
  const docsEvents = data?.docsEvents || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Documents</h2>
        <span className="text-sm text-gray-500">{s3Docs.length} files · {docsEvents.length} events</span>
      </div>

      {/* Docs received events */}
      {docsEvents.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Documents Received</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {docsEvents.map((ev: any, i: number) => (
              <div key={i} className="bg-gray-900 border border-purple-900/50 rounded-2xl p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-900/40 flex items-center justify-center">
                    <FileText size={18} className="text-purple-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{ev.business || ev.phone}</p>
                    <p className="text-xs text-gray-500">{ev.agent} · {ev.ts ? new Date(ev.ts).toLocaleString() : ''}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* S3 files */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Bank Statements (S3)</h3>
        {s3Docs.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
            <FolderOpen size={36} className="text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">No bank statements found in S3</p>
          </div>
        ) : (
          <div className="space-y-2">
            {s3Docs.map((f: any, i: number) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText size={16} className="text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-gray-300 text-sm truncate">{f.key}</p>
                    <p className="text-gray-600 text-xs">{f.date} · {(f.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                <Download size={14} className="text-gray-600 flex-shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

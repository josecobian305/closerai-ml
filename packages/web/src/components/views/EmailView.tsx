import { useEffect, useState } from 'react';
import { fetchEmailInbox } from '../../api';
import { Mail, Paperclip, AlertTriangle } from 'lucide-react';

export function EmailView() {
  const [emails, setEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchEmailInbox()
      .then(d => { setEmails(d.emails || []); if (d.error) setError(d.error); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Email Inbox</h2>
      {error && (
        <div className="p-3 bg-yellow-900/30 border border-yellow-800/50 rounded-xl text-yellow-300 text-sm flex items-center gap-2">
          <AlertTriangle size={16} /> {error}
        </div>
      )}
      {loading ? (
        <div className="space-y-2">{[...Array(6)].map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 animate-pulse h-16" />)}</div>
      ) : emails.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <Mail size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No emails found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {emails.map((e: any, i: number) => (
            <div key={i} className={`bg-gray-900 border rounded-2xl p-4 ${e.isStatement ? 'border-yellow-700/60' : 'border-gray-800'}`}>
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm ${e.isStatement ? 'bg-yellow-900/60 text-yellow-300' : 'bg-gray-800 text-gray-400'}`}>
                  {e.isStatement ? <Paperclip size={18} /> : <Mail size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-white font-medium text-sm truncate">{e.subject || '(no subject)'}</p>
                    {e.isStatement && <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-900/50 text-yellow-300 whitespace-nowrap">Statement</span>}
                  </div>
                  <p className="text-gray-400 text-xs truncate mt-0.5">
                    {e.from?.name || e.from?.addr || 'Unknown sender'}
                  </p>
                  <p className="text-gray-600 text-xs mt-1">{e.date ? new Date(e.date).toLocaleString() : ''}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

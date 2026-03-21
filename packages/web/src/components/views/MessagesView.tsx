import { useEffect, useState } from 'react';
import { fetchInbox, fetchMessages } from '../../api';
import { MessageSquare, ArrowLeft, User } from 'lucide-react';

export function MessagesView() {
  const [replies, setReplies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [thread, setThread] = useState<any[]>([]);
  const [threadLoading, setThreadLoading] = useState(false);

  useEffect(() => {
    fetchInbox().then(d => setReplies(d.replies || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  const openThread = async (phone: string) => {
    setSelectedPhone(phone);
    setThreadLoading(true);
    try {
      const data = await fetchMessages(phone);
      setThread(data.messages || []);
    } catch { setThread([]); }
    setThreadLoading(false);
  };

  if (selectedPhone) {
    return (
      <div className="space-y-4">
        <button onClick={() => setSelectedPhone(null)} className="flex items-center gap-2 text-gray-400 hover:text-white text-sm">
          <ArrowLeft size={16} /> Back to inbox
        </button>
        <h2 className="text-xl font-bold text-white">{selectedPhone}</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {threadLoading ? (
            <div className="animate-pulse space-y-2">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-800 rounded-xl" />)}</div>
          ) : thread.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No messages found</p>
          ) : thread.map((m, i) => (
            <div key={i} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                m.direction === 'outbound' ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300'
              }`}>
                <p>{m.text}</p>
                <p className="text-xs opacity-50 mt-1">{m.ts ? new Date(m.ts).toLocaleString() : ''}{m.agent ? ` · ${m.agent}` : ''}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white">Messages Inbox</h2>
      {loading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 animate-pulse h-20" />)}</div>
      ) : replies.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center">
          <MessageSquare size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No inbound replies yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {replies.map((r, i) => (
            <button key={i} onClick={() => openThread(r.phone)} className="w-full text-left bg-gray-900 border border-gray-800 rounded-2xl p-4 hover:border-gray-700 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                  <User size={18} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-white font-medium text-sm">{r.name || r.phone}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.classification === 'warm' ? 'bg-yellow-900/50 text-yellow-300' :
                      r.classification === 'hot' ? 'bg-red-900/50 text-red-300' :
                      'bg-gray-800 text-gray-400'
                    }`}>{r.classification || 'unknown'}</span>
                  </div>
                  <p className="text-gray-400 text-xs truncate mt-0.5">{r.inbound}</p>
                  <p className="text-gray-600 text-xs mt-1">{r.agent} · {r.ts ? new Date(r.ts).toLocaleString() : ''}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

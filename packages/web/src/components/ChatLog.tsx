import type { Message } from '../types';

interface ChatLogProps {
  messages: Message[];
  loading: boolean;
  error: string | null;
}

/**
 * Formats an ISO timestamp to a human-readable time string.
 */
function formatTime(ts: string): string {
  try {
    return new Date(ts).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return ts;
  }
}

/**
 * Returns the badge color class for a reply category.
 */
function categoryClass(category?: string): string {
  switch (category) {
    case 'hot':
    case 'interested': return 'bg-green-900 text-green-300';
    case 'warm': return 'bg-yellow-900 text-yellow-300';
    case 'cold':
    case 'not_interested': return 'bg-gray-700 text-gray-400';
    case 'already_funded': return 'bg-blue-900 text-blue-300';
    case 'wrong_number': return 'bg-red-900 text-red-300';
    default: return 'bg-gray-800 text-gray-400';
  }
}

/**
 * Chat bubble log showing real SMS outbound + inbound messages.
 */
export function ChatLog({ messages, loading, error }: ChatLogProps) {
  if (loading) {
    return (
      <div className="space-y-3 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
            <div className="w-48 h-12 bg-gray-800 rounded-2xl animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-red-400 text-sm">
        Failed to load messages: {error}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <span className="text-4xl block mb-2">💬</span>
        No messages found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4 overflow-y-auto max-h-96">
      {messages.map((msg, i) => {
        const isOutbound = msg.direction === 'outbound';
        return (
          <div key={i} className={`flex flex-col ${isOutbound ? 'items-end' : 'items-start'}`}>
            <div
              className={`
                max-w-xs md:max-w-sm px-4 py-3 rounded-2xl text-sm leading-relaxed
                ${isOutbound
                  ? 'bg-indigo-600 text-white rounded-br-md'
                  : 'bg-gray-800 text-gray-100 rounded-bl-md'}
              `}
            >
              {msg.text}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              <span>{formatTime(msg.ts)}</span>
              {isOutbound && <span className="text-gray-600">·</span>}
              {isOutbound && <span>{msg.agent}</span>}
              {!isOutbound && msg.category && (
                <span className={`inline-flex px-1.5 py-0.5 rounded text-xs ${categoryClass(msg.category)}`}>
                  {msg.category}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

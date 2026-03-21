import { Phone, MessageSquare } from 'lucide-react';
import type { Contact } from '../types';

interface ContactCardProps {
  contact: Contact;
  onClick: (contact: Contact) => void;
  onCall: (contact: Contact) => void;
}

const GRADIENTS = [
  'from-indigo-500 to-indigo-700',
  'from-purple-500 to-indigo-600',
  'from-blue-500 to-cyan-600',
  'from-green-500 to-teal-600',
  'from-orange-500 to-red-600',
  'from-pink-500 to-rose-600',
];

function gradientForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) & 0xffffffff;
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
}

function tierBadge(tier?: string): { cls: string; label: string } {
  switch (tier) {
    case 'hot': return { cls: 'badge-hot', label: '🔥 Hot Lead' };
    case 'warm': return { cls: 'badge-warm', label: '🌤 Warm' };
    case 'cold': return { cls: 'badge-cold', label: '❄️ Cold' };
    case 'funded': return { cls: 'badge-funded', label: '💰 Funded' };
    default:
      if (tier?.toLowerCase().includes('doc')) return { cls: 'badge-docs', label: '✅ Sent Docs' };
      return { cls: 'badge-default', label: tier ?? 'Lead' };
  }
}

function tagBadge(tags: string[]): { cls: string; label: string } | null {
  if (!tags?.length) return null;
  const docsTag = tags.find((t) => t.toLowerCase().includes('doc'));
  if (docsTag) return { cls: 'badge-docs', label: '✅ Sent Docs' };
  const fundedTag = tags.find((t) => t.toLowerCase().includes('fund'));
  if (fundedTag) return { cls: 'badge-funded', label: '💰 Funded' };
  return null;
}

export function ContactCard({ contact, onClick, onCall }: ContactCardProps) {
  const initials = [contact.firstName?.[0], contact.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || contact.name?.[0]?.toUpperCase() || '?';

  const gradient = gradientForName(contact.name || contact.id || '');
  const badge = contact.tier ? tierBadge(contact.tier) : tagBadge(contact.tags);

  const timeAgo = contact.lastSmsTs
    ? new Date(contact.lastSmsTs).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCall(contact);
  };

  const handleText = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClick(contact);
  };

  return (
    <div className="card flex flex-col gap-3" onClick={() => onClick(contact)}>
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-base shadow-md`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white text-sm truncate leading-tight">
            {contact.name || '—'}
          </div>
          <div className="text-xs text-gray-400 truncate mt-0.5">
            {contact.companyName || contact.phone}
          </div>
        </div>
        {badge && (
          <span className={`${badge.cls} flex-shrink-0 text-xs`}>{badge.label}</span>
        )}
      </div>

      {/* Last message */}
      {contact.lastSmsPreview && (
        <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {contact.lastSmsPreview}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-600">
        <span>{contact.smsSentCount > 0 ? `${contact.smsSentCount} msgs` : 'No messages'}</span>
        {timeAgo && <span>{timeAgo}</span>}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={handleCall}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 text-white text-sm font-semibold transition-colors duration-150"
        >
          <Phone size={15} />
          Call
        </button>
        <button
          onClick={handleText}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-indigo-700 hover:bg-indigo-600 text-white text-sm font-semibold transition-colors duration-150"
        >
          <MessageSquare size={15} />
          Text
        </button>
      </div>
    </div>
  );
}

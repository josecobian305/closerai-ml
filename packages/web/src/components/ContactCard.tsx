import { Phone, MessageSquare } from 'lucide-react';
import type { Contact } from '../types';

interface ContactCardProps {
  contact: Contact;
  onClick: (contact: Contact) => void;
  onCall: (contact: Contact) => void;
  compact?: boolean;
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

export function ContactCard({ contact, onClick, onCall, compact }: ContactCardProps) {
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

  if (compact) {
    return (
      <div
        className="flex items-center gap-2 p-2 rounded-xl cursor-pointer transition-colors duration-150"
        style={{
          backgroundColor: 'var(--color-surface, #111827)',
          border: '1px solid var(--color-border, #1f2937)',
        }}
        onClick={() => onClick(contact)}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent, #6366f1)'; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border, #1f2937)'; }}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs shadow-md`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-xs truncate leading-tight" style={{ color: 'var(--color-text, #e2e8f0)' }}>
            {contact.name || '—'}
          </div>
          {badge && (
            <span className={`${badge.cls} text-xs`}>{badge.label}</span>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handleCall}
            className="p-1 rounded-lg bg-green-700 hover:bg-green-600 text-white transition-colors"
          >
            <Phone size={11} />
          </button>
          <button
            onClick={handleText}
            className="p-1 rounded-lg bg-indigo-700 hover:bg-indigo-600 text-white transition-colors"
          >
            <MessageSquare size={11} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-3 p-4 rounded-2xl cursor-pointer transition-colors duration-150"
      style={{
        backgroundColor: 'var(--color-surface, #111827)',
        border: '1px solid var(--color-border, #1f2937)',
      }}
      onClick={() => onClick(contact)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-accent, #6366f1)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--color-border, #1f2937)'; }}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-base shadow-md`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm truncate leading-tight" style={{ color: 'var(--color-text, #e2e8f0)' }}>
            {contact.name || '—'}
          </div>
          <div className="text-xs truncate mt-0.5" style={{ color: 'var(--color-muted, #6b7280)' }}>
            {contact.companyName || contact.phone}
          </div>
        </div>
        {badge && (
          <span className={`${badge.cls} flex-shrink-0 text-xs`}>{badge.label}</span>
        )}
      </div>

      {/* Last message */}
      {contact.lastSmsPreview && (
        <p className="text-xs line-clamp-2 leading-relaxed" style={{ color: 'var(--color-muted, #6b7280)' }}>
          {contact.lastSmsPreview}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs" style={{ color: 'var(--color-muted, #6b7280)' }}>
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

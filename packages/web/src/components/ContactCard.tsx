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
        className="stripe-card flex items-center gap-2 cursor-pointer"
        style={{ padding: '8px 12px' }}
        onClick={() => onClick(contact)}
      >
        <div className={`flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-xs`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }} className="truncate">
            {contact.name || '—'}
          </div>
          {badge && <span className={`${badge.cls}`} style={{ fontSize: '10px' }}>{badge.label}</span>}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button
            onClick={handleCall}
            style={{
              padding: '4px',
              borderRadius: '4px',
              background: 'rgba(34,197,94,0.12)',
              color: '#22c55e',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Phone size={11} />
          </button>
          <button
            onClick={handleText}
            style={{
              padding: '4px',
              borderRadius: '4px',
              background: 'rgba(99,91,255,0.12)',
              color: '#635bff',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <MessageSquare size={11} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="stripe-card flex flex-col gap-3 cursor-pointer"
      onClick={() => onClick(contact)}
    >
      {/* Top row */}
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-sm`}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }} className="truncate">
            {contact.name || '—'}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-subtle)', marginTop: '2px' }} className="truncate">
            {contact.companyName || contact.phone}
          </div>
        </div>
        {badge && <span className={`${badge.cls} flex-shrink-0`}>{badge.label}</span>}
      </div>

      {/* Last message */}
      {contact.lastSmsPreview && (
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5' }} className="line-clamp-2">
          {contact.lastSmsPreview}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between" style={{ fontSize: '11px', color: 'var(--text-subtle)' }}>
        <span>{contact.smsSentCount > 0 ? `${contact.smsSentCount} msgs` : 'No messages'}</span>
        {timeAgo && <span>{timeAgo}</span>}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={handleCall}
          className="flex-1 flex items-center justify-center gap-1.5"
          style={{
            padding: '8px',
            borderRadius: '6px',
            background: 'rgba(34,197,94,0.1)',
            border: '1px solid rgba(34,197,94,0.2)',
            color: '#22c55e',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <Phone size={13} /> Call
        </button>
        <button
          onClick={handleText}
          className="flex-1 flex items-center justify-center gap-1.5"
          style={{
            padding: '8px',
            borderRadius: '6px',
            background: 'rgba(99,91,255,0.1)',
            border: '1px solid rgba(99,91,255,0.2)',
            color: '#635bff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          <MessageSquare size={13} /> Text
        </button>
      </div>
    </div>
  );
}

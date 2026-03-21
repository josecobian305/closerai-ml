import type { Contact } from '../types';

interface ContactCardProps {
  contact: Contact;
  onClick: (contact: Contact) => void;
}

/**
 * Returns the appropriate badge class for a contact tier.
 */
function tierBadgeClass(tier?: string): string {
  switch (tier) {
    case 'hot': return 'badge-hot';
    case 'warm': return 'badge-warm';
    case 'cold': return 'badge-cold';
    default: return 'badge-default';
  }
}

/**
 * Returns display label for a tier.
 */
function tierLabel(tier?: string): string {
  switch (tier) {
    case 'hot': return '🔥 Hot';
    case 'warm': return '🌤 Warm';
    case 'cold': return '❄️ Cold';
    default: return tier ?? 'Unknown';
  }
}

/**
 * Single contact card for the CRM grid.
 */
export function ContactCard({ contact, onClick }: ContactCardProps) {
  const initials = [contact.firstName?.[0], contact.lastName?.[0]]
    .filter(Boolean)
    .join('')
    .toUpperCase() || '?';

  const timeAgo = contact.lastSmsTs
    ? new Date(contact.lastSmsTs).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="card" onClick={() => onClick(contact)}>
      {/* Top row: avatar + name + badge */}
      <div className="flex items-start gap-3 mb-3">
        <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-700 flex items-center justify-center text-white font-bold text-lg">
          {initials}
        </div>

        <div className="min-w-0 flex-1">
          <div className="font-semibold text-white text-base truncate">{contact.name || '—'}</div>
          <div className="text-sm text-gray-400 truncate">{contact.companyName || contact.phone}</div>
        </div>

        {contact.tier && (
          <span className={tierBadgeClass(contact.tier)}>{tierLabel(contact.tier)}</span>
        )}
      </div>

      {/* Last message preview */}
      {contact.lastSmsPreview && (
        <p className="text-sm text-gray-400 line-clamp-2 mb-2">
          {contact.lastSmsPreview}
        </p>
      )}

      {/* Footer: SMS count + date */}
      <div className="flex items-center justify-between text-xs text-gray-500 mt-1">
        <span>{contact.smsSentCount > 0 ? `${contact.smsSentCount} messages` : 'No messages'}</span>
        {timeAgo && <span>{timeAgo}</span>}
      </div>
    </div>
  );
}

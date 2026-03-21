import type { Contact } from '../types';
import { ContactCard } from './ContactCard';

interface ContactGridProps {
  contacts: Contact[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelectContact: (contact: Contact) => void;
}

/**
 * Responsive grid of contact cards with load-more pagination.
 */
export function ContactGrid({
  contacts,
  loading,
  hasMore,
  onLoadMore,
  onSelectContact,
}: ContactGridProps) {
  if (!loading && contacts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <span className="text-5xl mb-4">🔍</span>
        <p className="text-lg font-medium">No contacts found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onClick={onSelectContact}
          />
        ))}

        {/* Skeleton cards while loading */}
        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gray-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-700 rounded w-3/4" />
                  <div className="h-3 bg-gray-700 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-700 rounded mb-2" />
              <div className="h-3 bg-gray-700 rounded w-2/3" />
            </div>
          ))}
      </div>

      {/* Load more button */}
      {hasMore && !loading && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            className="btn-primary px-8"
          >
            Load More Contacts
          </button>
        </div>
      )}
    </div>
  );
}

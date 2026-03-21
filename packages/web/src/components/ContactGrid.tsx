import type { Contact } from '../types';
import { ContactCard } from './ContactCard';
import { Upload } from 'lucide-react';

interface ContactGridProps {
  contacts: Contact[];
  loading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onSelectContact: (contact: Contact) => void;
  onCallContact: (contact: Contact) => void;
  isAdmin?: boolean;
}

export function ContactGrid({
  contacts,
  loading,
  hasMore,
  onLoadMore,
  onSelectContact,
  onCallContact,
  isAdmin,
}: ContactGridProps) {
  if (!loading && contacts.length === 0) {
    // Tenant empty state: prompt to upload leads
    if (!isAdmin) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
            <Upload size={36} className="text-indigo-400" />
          </div>
          <p className="text-xl font-semibold text-gray-300 mb-2">Upload Your Leads</p>
          <p className="text-sm text-gray-500 max-w-xs text-center mb-6">
            Import a CSV file or connect your lead source to get started. Your agent is ready to go!
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors">
              Upload CSV
            </button>
            <button className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium rounded-xl text-sm transition-colors">
              Connect Lead Source
            </button>
          </div>
        </div>
      );
    }

    // Admin empty state (filters may be too restrictive)
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <span className="text-5xl mb-4">🔍</span>
        <p className="text-lg font-medium text-gray-400">No contacts found</p>
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
            onCall={onCallContact}
          />
        ))}

        {loading &&
          Array.from({ length: 8 }).map((_, i) => (
            <div key={`skeleton-${i}`} className="bg-gray-900 border border-gray-800 rounded-2xl p-4 animate-pulse">
              <div className="flex gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-gray-800" />
                <div className="flex-1 space-y-2 mt-1">
                  <div className="h-3.5 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-800 rounded mb-2" />
              <div className="h-3 bg-gray-800 rounded w-2/3 mb-4" />
              <div className="flex gap-2">
                <div className="h-9 bg-gray-800 rounded-xl flex-1" />
                <div className="h-9 bg-gray-800 rounded-xl flex-1" />
              </div>
            </div>
          ))}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center mt-8">
          <button onClick={onLoadMore} className="btn-ghost px-8">
            Load More Contacts
          </button>
        </div>
      )}
    </div>
  );
}

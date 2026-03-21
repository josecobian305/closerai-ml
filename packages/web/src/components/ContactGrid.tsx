import type { Contact } from '../types';
import { ContactCard } from './ContactCard';
import { Upload } from 'lucide-react';
import { usePreferences } from '../context/PreferencesContext';

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
  const { preferences } = usePreferences();
  const { compactMode } = preferences;

  if (!loading && contacts.length === 0) {
    if (!isAdmin) {
      return (
        <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--color-muted, #6b7280)' }}>
          <div className="w-20 h-20 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-5">
            <Upload size={36} className="text-indigo-400" />
          </div>
          <p className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text, #e2e8f0)' }}>Upload Your Leads</p>
          <p className="text-sm max-w-xs text-center mb-6" style={{ color: 'var(--color-muted, #6b7280)' }}>
            Import a CSV file or connect your lead source to get started. Your agent is ready to go!
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-colors">
              Upload CSV
            </button>
            <button
              className="px-5 py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--color-border, #1f2937)', color: 'var(--color-muted, #6b7280)' }}
            >
              Connect Lead Source
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-20" style={{ color: 'var(--color-muted, #6b7280)' }}>
        <span className="text-5xl mb-4">🔍</span>
        <p className="text-lg font-medium" style={{ color: 'var(--color-muted, #9ca3af)' }}>No contacts found</p>
        <p className="text-sm mt-1">Try adjusting your search or filters</p>
      </div>
    );
  }

  // Compact mode: tighter grid with smaller cards
  const gridClass = compactMode
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4';

  return (
    <div>
      <div className={gridClass}>
        {contacts.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onClick={onSelectContact}
            onCall={onCallContact}
            compact={compactMode}
          />
        ))}

        {loading &&
          Array.from({ length: compactMode ? 10 : 8 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className={`rounded-2xl animate-pulse ${compactMode ? 'p-3' : 'p-4'}`}
              style={{ backgroundColor: 'var(--color-surface, #111827)', border: '1px solid var(--color-border, #1f2937)' }}
            >
              {!compactMode && (
                <>
                  <div className="flex gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
                    <div className="flex-1 space-y-2 mt-1">
                      <div className="h-3.5 rounded w-3/4" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
                      <div className="h-3 rounded w-1/2" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
                    </div>
                  </div>
                  <div className="h-3 rounded mb-2" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
                  <div className="h-3 rounded w-2/3 mb-4" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
                  <div className="flex gap-2">
                    <div className="h-9 rounded-xl flex-1" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
                    <div className="h-9 rounded-xl flex-1" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
                  </div>
                </>
              )}
              {compactMode && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
                    <div className="flex-1">
                      <div className="h-3 rounded w-3/4" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
                    </div>
                  </div>
                  <div className="h-2 rounded w-full" style={{ backgroundColor: 'var(--color-border, #1f2937)' }} />
                </>
              )}
            </div>
          ))}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center mt-8">
          <button
            onClick={onLoadMore}
            className="px-8 py-2.5 rounded-xl text-sm font-medium transition-colors"
            style={{
              backgroundColor: 'var(--color-surface, #111827)',
              color: 'var(--color-muted, #6b7280)',
              border: '1px solid var(--color-border, #1f2937)',
            }}
          >
            Load More Contacts
          </button>
        </div>
      )}
    </div>
  );
}

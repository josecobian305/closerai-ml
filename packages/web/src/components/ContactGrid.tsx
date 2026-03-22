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
        <div className="flex flex-col items-center justify-center py-20">
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '12px',
            background: 'rgba(99,91,255,0.08)',
            border: '1px solid rgba(99,91,255,0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
          }}>
            <Upload size={28} style={{ color: '#635bff' }} />
          </div>
          <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Upload Your Leads
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '320px', textAlign: 'center', marginBottom: '24px' }}>
            Import a CSV file or connect your lead source to get started. Your agent is ready to go!
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button className="stripe-btn-primary">Upload CSV</button>
            <button className="stripe-btn-ghost">Connect Lead Source</button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center py-20">
        <span style={{ fontSize: '40px', marginBottom: '12px' }}>🔍</span>
        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-muted)' }}>No contacts found</p>
        <p style={{ fontSize: '13px', color: 'var(--text-subtle)', marginTop: '4px' }}>Try adjusting your search or filters</p>
      </div>
    );
  }

  const gridClass = compactMode
    ? 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2'
    : 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3';

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
              className="stripe-card animate-pulse"
              style={{ padding: compactMode ? '12px' : '20px' }}
            >
              {!compactMode && (
                <>
                  <div className="flex gap-3 mb-3">
                    <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--bg-elevated)' }} />
                    <div className="flex-1 space-y-2 mt-1">
                      <div style={{ height: '12px', width: '75%', background: 'var(--bg-elevated)', borderRadius: '4px' }} />
                      <div style={{ height: '10px', width: '50%', background: 'var(--bg-elevated)', borderRadius: '4px' }} />
                    </div>
                  </div>
                  <div style={{ height: '10px', width: '100%', background: 'var(--bg-elevated)', borderRadius: '4px', marginBottom: '8px' }} />
                  <div className="flex gap-2">
                    <div className="flex-1" style={{ height: '32px', background: 'var(--bg-elevated)', borderRadius: '6px' }} />
                    <div className="flex-1" style={{ height: '32px', background: 'var(--bg-elevated)', borderRadius: '6px' }} />
                  </div>
                </>
              )}
              {compactMode && (
                <div className="flex items-center gap-2">
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg-elevated)', flexShrink: 0 }} />
                  <div className="flex-1">
                    <div style={{ height: '10px', width: '75%', background: 'var(--bg-elevated)', borderRadius: '4px' }} />
                  </div>
                </div>
              )}
            </div>
          ))}
      </div>

      {hasMore && !loading && (
        <div className="flex justify-center mt-8">
          <button onClick={onLoadMore} className="stripe-btn-ghost">
            Load More Contacts
          </button>
        </div>
      )}
    </div>
  );
}

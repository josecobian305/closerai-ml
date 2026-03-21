import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { StatsRow } from './components/StatsRow';
import { FilterBar } from './components/FilterBar';
import { ContactGrid } from './components/ContactGrid';
import { ContactDetail } from './components/ContactDetail';
import { useContacts } from './hooks/useContacts';
import { fetchStats } from './api';
import type { Contact, DashboardStats } from './types';

/**
 * Root application component.
 */
function App() {
  const { contacts, loading, error, total, hasMore, loadMore, setFilter, filter } = useContacts();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, []);

  return (
    <Layout>
      <StatsRow stats={stats} loading={statsLoading} />

      <FilterBar
        filter={filter}
        onFilterChange={setFilter}
        total={total}
        loading={loading}
      />

      {error && (
        <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-xl text-red-300 text-sm">
          Error loading contacts: {error}
        </div>
      )}

      <ContactGrid
        contacts={contacts}
        loading={loading}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onSelectContact={setSelectedContact}
      />

      <ContactDetail
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
      />
    </Layout>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { StatsRow } from './components/StatsRow';
import { FilterBar } from './components/FilterBar';
import { ContactGrid } from './components/ContactGrid';
import { ContactDetail } from './components/ContactDetail';
import { FloatingSoftphone } from './components/Softphone';
import { AgentChat } from './components/AgentChat';
import {
  AgentsView, DashboardView, MessagesView, SmsCampaignsView, EmailView,
  PipelineView, DealsView, DocumentsView, CourtSearchView, ReportsView,
  PaymentsView, DatabaseView, NotificationsView, SettingsView,
} from './components/Views';
import { useContacts } from './hooks/useContacts';
import { fetchStats } from './api';
import type { Contact, DashboardStats, NavSection } from './types';

function App() {
  const { contacts, loading, error, total, hasMore, loadMore, setFilter, filter } = useContacts();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<NavSection>('contacts');
  const [agentChatOpen, setAgentChatOpen] = useState(false);
  const [softphone, setSoftphone] = useState<{ phone: string; name: string } | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch(console.error)
      .finally(() => setStatsLoading(false));
  }, []);

  const handleCall = (contact: Contact) => {
    setSoftphone({ phone: contact.phone, name: contact.firstName || contact.name });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <>
            <StatsRow stats={stats} loading={statsLoading} />
            <DashboardView />
          </>
        );
      case 'contacts':
        return (
          <>
            <StatsRow stats={stats} loading={statsLoading} />
            <FilterBar filter={filter} onFilterChange={setFilter} total={total} loading={loading} />
            {error && (
              <div className="mb-4 p-4 bg-red-900/40 border border-red-800/60 rounded-xl text-red-300 text-sm">
                Error loading contacts: {error}
              </div>
            )}
            <ContactGrid
              contacts={contacts}
              loading={loading}
              hasMore={hasMore}
              onLoadMore={loadMore}
              onSelectContact={setSelectedContact}
              onCallContact={handleCall}
            />
          </>
        );
      case 'messages': return <MessagesView />;
      case 'sms-campaigns': return <SmsCampaignsView />;
      case 'email': return <EmailView />;
      case 'pipeline': return <PipelineView />;
      case 'deals': return <DealsView />;
      case 'documents': return <DocumentsView />;
      case 'court-search': return <CourtSearchView />;
      case 'ai-agents': return <AgentsView />;
      case 'reports': return <ReportsView />;
      case 'payments': return <PaymentsView />;
      case 'database': return <DatabaseView />;
      case 'notifications': return <NotificationsView />;
      case 'settings': return <SettingsView />;
      default: return null;
    }
  };

  return (
    <Layout
      activeSection={activeSection}
      onNavigate={setActiveSection}
      onToggleAgentChat={() => setAgentChatOpen((o) => !o)}
      agentChatOpen={agentChatOpen}
    >
      {renderSection()}

      {/* Contact Detail Slide-over */}
      <ContactDetail
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
        onCall={handleCall}
      />

      {/* Floating Softphone */}
      {softphone && (
        <FloatingSoftphone
          phone={softphone.phone}
          name={softphone.name}
          onClose={() => setSoftphone(null)}
        />
      )}

      {/* Discord-style Agent Chat */}
      <AgentChat
        open={agentChatOpen}
        onClose={() => setAgentChatOpen(false)}
      />
    </Layout>
  );
}

export default App;

import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { StatsRow } from './components/StatsRow';
import { FilterBar } from './components/FilterBar';
import { ContactGrid } from './components/ContactGrid';
import { ContactDetail } from './components/ContactDetail';
import { FloatingSoftphone } from './components/Softphone';
import { AgentChat } from './components/AgentChat';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import {
  AgentsView, DashboardView, MessagesView, SmsCampaignsView, EmailView,
  PipelineView, DealsView, DocumentsView, CourtSearchView, ReportsView,
  PaymentsView, DatabaseView, NotificationsView, SettingsView,
} from './components/Views';
import { useContacts } from './hooks/useContacts';
import { fetchStats } from './api';
import type { Contact, DashboardStats, NavSection } from './types';

function AppInner() {
  const { user, loading: authLoading, login, isAdmin } = useAuth();
  const { contacts, loading, error, total, hasMore, loadMore, setFilter, filter } = useContacts();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<NavSection>('contacts');
  const [agentChatOpen, setAgentChatOpen] = useState(false);
  const [softphone, setSoftphone] = useState<{ phone: string; name: string } | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  useEffect(() => {
    const checkRoute = () => {
      const hash = window.location.hash;
      const search = new URLSearchParams(window.location.search);
      const isReg =
        hash === '#/register' ||
        hash === '#register' ||
        search.get('page') === 'register' ||
        window.location.pathname.endsWith('/register');
      setShowRegister(isReg);
    };
    checkRoute();
    window.addEventListener('hashchange', checkRoute);
    window.addEventListener('popstate', checkRoute);
    return () => {
      window.removeEventListener('hashchange', checkRoute);
      window.removeEventListener('popstate', checkRoute);
    };
  }, []);

  // Intercept register completion — save token and redirect to dashboard
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'REGISTRATION_COMPLETE' && e.data?.token) {
        login(e.data.token).then(() => {
          window.location.hash = '';
          setShowRegister(false);
        });
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [login]);

  useEffect(() => {
    if (!user || showRegister) return;
    // Only load GHL stats for CHC admin; tenant stats come from workspace
    if (isAdmin) {
      fetchStats()
        .then(setStats)
        .catch(console.error)
        .finally(() => setStatsLoading(false));
    } else {
      // For tenants, show zero-state stats initially
      setStats({
        totalContacts: 0,
        smsSentToday: 0,
        smsSentTotal: 0,
        repliesTotal: 0,
        docsReceived: 0,
        replyRate: 0,
        repliesByCategory: {},
        agentStats: [],
        asOf: new Date().toISOString(),
      });
      setStatsLoading(false);
    }
  }, [user, showRegister, isAdmin]);

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 animate-pulse">
            C
          </div>
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Show register page
  if (showRegister) {
    return <Register />;
  }

  // Not authenticated → show login or register
  if (!user) {
    if (showLogin) {
      return (
        <Login
          onShowRegister={() => {
            setShowLogin(false);
            setShowRegister(true);
            window.location.hash = '#register';
          }}
        />
      );
    }
    // Default to login; "Get started" goes to register
    return (
      <Login
        onShowRegister={() => {
          setShowRegister(true);
          window.location.hash = '#register';
        }}
      />
    );
  }

  const handleCall = (contact: Contact) => {
    setSoftphone({ phone: contact.phone, name: contact.firstName || contact.name });
  };

  // Build layout order based on user's preference
  const layoutPref = user.layout || 'overview_first';

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <>
            <StatsRow stats={stats} loading={statsLoading} isAdmin={isAdmin} />
            <DashboardView />
          </>
        );
      case 'contacts':
        return (
          <>
            <StatsRow stats={stats} loading={statsLoading} isAdmin={isAdmin} />
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
              isAdmin={isAdmin}
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

  // Resolve initial section based on layout preference
  const getDefaultSection = (): NavSection => {
    switch (layoutPref) {
      case 'contacts_first': return 'contacts';
      case 'messages_first': return 'messages';
      case 'pipeline_first': return 'pipeline';
      case 'overview_first':
      default: return 'contacts';
    }
  };

  return (
    <Layout
      activeSection={activeSection}
      onNavigate={setActiveSection}
      onToggleAgentChat={() => setAgentChatOpen((o) => !o)}
      agentChatOpen={agentChatOpen}
      user={user}
      capabilities={user.capabilities}
    >
      {renderSection()}

      <ContactDetail
        contact={selectedContact}
        onClose={() => setSelectedContact(null)}
        onCall={handleCall}
      />

      {softphone && (
        <FloatingSoftphone
          phone={softphone.phone}
          name={softphone.name}
          onClose={() => setSoftphone(null)}
        />
      )}

      <AgentChat
        open={agentChatOpen}
        onClose={() => setAgentChatOpen(false)}
        agentName={user.agent.name}
        agentTitle={user.agent.title}
      />
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;

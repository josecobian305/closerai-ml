import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';
import { Layout } from './components/Layout';
import { StatsRow } from './components/StatsRow';
import { FilterBar } from './components/FilterBar';
import { ContactGrid } from './components/ContactGrid';
import { ContactDetail } from './components/ContactDetail';
import { FloatingSoftphone } from './components/Softphone';
import { AgentChat } from './components/AgentChat';
import { Register } from './pages/Register';
import { Login } from './pages/Login';
import { RecordProcess } from './pages/RecordProcess';
import { OnboardingRouter } from './pages/onboarding/OnboardingRouter';
import { AgentsView, DashboardView, MessagesView, SmsCampaignsView, EmailView,
  PipelineView, DealsView, DocumentsView, CourtSearchView, ReportsView,
  PaymentsView, DatabaseView, NotificationsView, SettingsView, LeadsView,
  ReviewQueueView, UnderwritingView, SemiAutoView, OffersView, PitchReviewView,
} from './components/Views';
import { IntegrationsPage } from './components/IntegrationsPage';
import { useContacts } from './hooks/useContacts';
import { fetchStats } from './api';
import type { Contact, DashboardStats, NavSection } from './types';

function AppInner() {
  const { user, loading: authLoading, login, isAdmin } = useAuth();
  const { preferences, updatePreferences } = usePreferences();
  const { contacts, loading, error, total, hasMore, loadMore, setFilter, filter } = useContacts();
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<NavSection>('contacts');
  const [agentChatOpen, setAgentChatOpen] = useState(false);
  const [softphone, setSoftphone] = useState<{ phone: string; name: string } | null>(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Listen for custom navigation events (e.g. from PitchReviewView)
  useEffect(() => {
    const handler = (e: Event) => {
      const section = (e as CustomEvent).detail as NavSection;
      if (section) setActiveSection(section);
    };
    window.addEventListener('navigate', handler);
    return () => window.removeEventListener('navigate', handler);
  }, []);

  useEffect(() => {
    const checkRoute = () => {
      // Check for deal param (?deal=ID) from Maria email link
      const searchParams = new URLSearchParams(window.location.search);
      const dealId = searchParams.get('deal');
      if (dealId) {
        setActiveSection('deals');
        // Store deal ID for DealsView to auto-open
        sessionStorage.setItem('openDealId', dealId);
        return;
      }

      const hash = window.location.hash;
      const search = new URLSearchParams(window.location.search);
      const isReg =
        hash === '#/register' ||
        hash === '#register' ||
        search.get('page') === 'register' ||
        window.location.pathname.endsWith('/register');
      setShowRegister(isReg);
      const isOnboard =
        hash === '#/onboarding' ||
        hash === '#onboarding' ||
        search.get('page') === 'onboarding' ||
        window.location.pathname.endsWith('/onboarding');
      setShowOnboarding(isOnboard);
      if (hash === '#record-your-process') {
        setActiveSection('record-process');
      }
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
    if (isAdmin) {
      fetchStats()
        .then(setStats)
        .catch(console.error)
        .finally(() => setStatsLoading(false));
    } else {
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

  // Apply defaultFilter preference on load
  useEffect(() => {
    if (preferences.defaultFilter && preferences.defaultFilter !== 'all') {
      setFilter(preferences.defaultFilter);
    }
  }, [preferences.defaultFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-[10px] bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4 animate-pulse">
            C
          </div>
          <p className="text-[var(--text-muted)] text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Both #register and #onboarding now use the streamlined onboarding flow
  if (showOnboarding || showRegister) {
    return (
      <OnboardingRouter
        onComplete={() => {
          setShowOnboarding(false);
          setShowRegister(false);
          window.location.hash = '';
        }}
      />
    );
  }

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

  const renderContacts = () => (
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

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardLayout();
      case 'contacts':
        return renderContactsLayout();
      case 'messages': return <MessagesView />;
      case 'leads': return <LeadsView />;
      case 'sms-campaigns': return <SmsCampaignsView />;
      case 'email': return <EmailView />;
      case 'pipeline': return <PipelineView onNavigate={setActiveSection} />;
      case 'deals': return <DealsView />;
      case 'offers': return <OffersView />;
      case 'documents': return <DocumentsView />;
      case 'court-search': return <CourtSearchView />;
      case 'ai-agents': return <AgentsView />;
      case 'reports': return <ReportsView />;
      case 'payments': return <PaymentsView />;
      case 'database': return <DatabaseView />;
      case 'notifications': return <NotificationsView />;
      case 'settings': return <SettingsView />;
      case 'integrations': return <IntegrationsPage />;
      case 'review-queue': return <ReviewQueueView />;
      case 'underwriting': return <UnderwritingView />;
      case 'semi-auto': return <SemiAutoView />;
      case 'pitch-review': return <PitchReviewView />;
      case 'record-process': return <RecordProcess />;
      default: return null;
    }
  };

  /** Render dashboard section respecting layout preference */
  const renderDashboardLayout = () => {
    switch (preferences.layout) {
      case 'contacts_first':
        return (
          <>
            {/* Compact stats bar at top */}
            <StatsRow stats={stats} loading={statsLoading} isAdmin={isAdmin} compact />
            {/* Contacts grid takes full width */}
            <FilterBar filter={filter} onFilterChange={setFilter} total={total} loading={loading} />
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
      case 'messages_first':
        return (
          <>
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Primary: messages/inbox */}
              <div className="flex-1">
                <MessagesView />
              </div>
              {/* Sidebar: compact contacts */}
              <div className="lg:w-80">
                <StatsRow stats={stats} loading={statsLoading} isAdmin={isAdmin} compact />
                <FilterBar filter={filter} onFilterChange={setFilter} total={total} loading={loading} />
                <ContactGrid
                  contacts={contacts.slice(0, 10)}
                  loading={loading}
                  hasMore={false}
                  onLoadMore={loadMore}
                  onSelectContact={setSelectedContact}
                  onCallContact={handleCall}
                  isAdmin={isAdmin}
                />
              </div>
            </div>
          </>
        );
      case 'pipeline_first':
        return (
          <>
            <StatsRow stats={stats} loading={statsLoading} isAdmin={isAdmin} compact />
            <PipelineView onNavigate={setActiveSection} />
          </>
        );
      case 'overview_first':
      default:
        return (
          <>
            <StatsRow stats={stats} loading={statsLoading} isAdmin={isAdmin} />
            <DashboardView />
          </>
        );
    }
  };

  /** Render contacts section — layout affects how stats are displayed */
  const renderContactsLayout = () => {
    if (preferences.layout === 'contacts_first') {
      return (
        <>
          <StatsRow stats={stats} loading={statsLoading} isAdmin={isAdmin} compact />
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
    }
    return renderContacts();
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
        onNavigate={(page, filter) => {
          setActiveSection(page as NavSection);
          setAgentChatOpen(false);
        }}
        onRefreshStats={() => {
          setActiveSection((prev) => prev);
        }}
        onUpdatePreferences={updatePreferences}
      />
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <AppInner />
      </PreferencesProvider>
    </AuthProvider>
  );
}

export default App;

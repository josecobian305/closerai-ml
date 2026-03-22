import React, { useState } from 'react';
import {
  LayoutDashboard, Users, MessageSquare, Mail, GitBranch,
  Briefcase, FileText, Bot, BarChart3, CreditCard,
  Database, Bell, Settings, Menu, X, ChevronRight,
  Megaphone, Scale, MessageCircle, LogOut, Plug, TrendingUp, ClipboardCheck, Shield,
  Package, Rocket
} from 'lucide-react';
import type { NavSection, UserConfig } from '../types';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  capability?: string;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
      { id: 'notifications', label: 'Notifications', icon: <Bell size={18} />, badge: '3' },
    ],
  },
  {
    title: 'CRM',
    items: [
      { id: 'contacts', label: 'Contacts', icon: <Users size={18} /> },
      { id: 'leads', label: 'Lead Priority', icon: <TrendingUp size={18} /> },
      { id: 'messages', label: 'Messages', icon: <MessageSquare size={18} />, capability: 'sms' },
      { id: 'sms-campaigns', label: 'SMS Campaigns', icon: <Megaphone size={18} />, capability: 'sms' },
      { id: 'email', label: 'Email', icon: <Mail size={18} />, capability: 'email' },
      { id: 'pipeline', label: 'Pipeline', icon: <GitBranch size={18} /> },
      { id: 'underwriting', label: 'Underwriting', icon: <ClipboardCheck size={18} /> },
      { id: 'review-queue', label: 'Review Queue', icon: <FileText size={18} /> },
      { id: 'deals', label: 'Deals', icon: <Briefcase size={18} /> },
      { id: 'offers', label: 'Offers', icon: <Package size={18} /> },
      { id: 'documents', label: 'Documents', icon: <FileText size={18} />, capability: 'docCollection' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { id: 'court-search', label: 'Court Search', icon: <Scale size={18} />, capability: 'courtSearch' },
      { id: 'ai-agents', label: 'AI Agents', icon: <Bot size={18} /> },
      { id: 'semi-auto', label: 'Semi-Auto', icon: <Shield size={18} /> },
      { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
      { id: 'payments', label: 'Payments', icon: <CreditCard size={18} /> },
      { id: 'database', label: 'Database', icon: <Database size={18} /> },
    ],
  },
  {
    title: 'System',
    items: [
      { id: 'record-process', label: 'Record Process', icon: <Rocket size={18} /> },
      { id: 'integrations', label: 'Integrations', icon: <Plug size={18} /> },
      { id: 'settings', label: 'Settings', icon: <Settings size={18} /> },
    ],
  },
];

interface LayoutProps {
  children: React.ReactNode;
  activeSection: NavSection;
  onNavigate: (s: NavSection) => void;
  onToggleAgentChat: () => void;
  agentChatOpen: boolean;
  agentUnread?: number;
  user?: UserConfig;
  capabilities?: Record<string, boolean>;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function Layout({
  children,
  activeSection,
  onNavigate,
  onToggleAgentChat,
  agentChatOpen,
  agentUnread = 0,
  user,
  capabilities = {},
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuth();
  const { preferences } = usePreferences();
  const { sidebarCollapsed } = preferences;

  const handleNav = (id: NavSection) => {
    onNavigate(id);
    setSidebarOpen(false);
  };

  const sectionLabel = NAV_GROUPS
    .flatMap((g) => g.items)
    .find((i) => i.id === activeSection)?.label ?? 'Dashboard';

  const isItemEnabled = (item: NavItem): boolean => {
    if (!item.capability) return true;
    if (Object.keys(capabilities).length === 0) return true;
    return capabilities[item.capability] !== false;
  };

  const ownerName = user?.owner?.name || 'Admin';
  const agentName = user?.agent?.name || 'Agent';
  const initials = getInitials(ownerName);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--bg-base)' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 md:hidden"
          style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex
        `}
        style={{
          backgroundColor: 'var(--bg-sidebar, #08080f)',
          borderRight: '1px solid var(--border)',
          width: sidebarCollapsed ? '64px' : '220px',
          minWidth: sidebarCollapsed ? '64px' : '220px',
        }}
      >
        {/* Logo area */}
        <div
          className="flex items-center gap-3 py-5"
          style={{
            borderBottom: '1px solid var(--border)',
            paddingLeft: sidebarCollapsed ? '16px' : '20px',
            paddingRight: sidebarCollapsed ? '16px' : '20px',
          }}
        >
          <div
            className="flex-shrink-0 flex items-center justify-center"
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #635bff, #4f46e5)',
            }}
          >
            <span style={{ color: 'white', fontWeight: 700, fontSize: '14px' }}>C</span>
          </div>
          {!sidebarCollapsed && (
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: '15px', letterSpacing: '-0.02em' }}>
              CloserAI
            </span>
          )}
          {!sidebarCollapsed && (
            <button
              className="ml-auto md:hidden p-1"
              style={{ color: 'var(--text-muted)' }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Agent status */}
        {user && !sidebarCollapsed && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-2">
              <div
                className="flex-shrink-0 flex items-center justify-center"
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                  color: 'white',
                  fontSize: '10px',
                  fontWeight: 700,
                }}
              >
                {getInitials(agentName)}
              </div>
              <div className="min-w-0 flex-1">
                <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }} className="truncate">{agentName}</p>
                <p style={{ fontSize: '10px', color: 'var(--success)', margin: 0 }}>Active</p>
              </div>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} className="animate-pulse flex-shrink-0" />
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3" style={{ paddingLeft: sidebarCollapsed ? '8px' : '12px', paddingRight: sidebarCollapsed ? '8px' : '12px' }}>
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(isItemEnabled);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title} style={{ marginBottom: '16px' }}>
                {!sidebarCollapsed && (
                  <p style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: 'var(--text-subtle)',
                    padding: '0 8px',
                    marginBottom: '4px',
                  }}>
                    {group.title}
                  </p>
                )}
                {visibleItems.map((item) => {
                  const active = item.id === activeSection;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      title={sidebarCollapsed ? item.label : undefined}
                      className={`w-full flex items-center gap-2.5 mb-0.5 ${sidebarCollapsed ? 'justify-center' : ''}`}
                      style={{
                        padding: sidebarCollapsed ? '8px' : '7px 8px',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: active ? 600 : 500,
                        color: active ? '#a5b4fc' : 'var(--text-muted)',
                        background: active ? 'rgba(99,91,255,0.08)' : 'transparent',
                        borderLeft: active ? '2px solid #635bff' : '2px solid transparent',
                        border: 'none',
                        cursor: 'pointer',
                        textAlign: 'left',
                        width: '100%',
                        position: 'relative',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.background = 'transparent';
                          (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                        }
                      }}
                    >
                      {active && (
                        <div style={{
                          position: 'absolute',
                          left: 0,
                          top: '20%',
                          bottom: '20%',
                          width: '2px',
                          backgroundColor: '#635bff',
                          borderRadius: '0 2px 2px 0',
                        }} />
                      )}
                      <span style={{ color: active ? '#635bff' : 'inherit', flexShrink: 0 }}>
                        {item.icon}
                      </span>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.badge && (
                            <span style={{
                              background: 'rgba(99,91,255,0.15)',
                              color: '#a5b4fc',
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '100px',
                              minWidth: '18px',
                              textAlign: 'center',
                            }}>
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Agent Chat toggle */}
        <div style={{ padding: '8px 12px', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={onToggleAgentChat}
            title={sidebarCollapsed ? 'Agent Chat' : undefined}
            className={`w-full flex items-center gap-2.5 ${sidebarCollapsed ? 'justify-center' : ''}`}
            style={{
              padding: '8px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              color: agentChatOpen ? 'white' : 'var(--text-muted)',
              background: agentChatOpen ? 'linear-gradient(135deg, #635bff, #4f46e5)' : 'transparent',
              border: agentChatOpen ? 'none' : '1px solid var(--border)',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <MessageCircle size={16} />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-left">Agent Chat</span>
                {agentUnread > 0 && (
                  <span style={{
                    background: '#ef4444',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '100px',
                    minWidth: '18px',
                    textAlign: 'center',
                  }}>
                    {agentUnread}
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* User card */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)' }}>
          {sidebarCollapsed ? (
            <div className="flex justify-center">
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #635bff, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '12px',
              }}>
                {initials || 'U'}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #635bff, #4f46e5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '12px',
                flexShrink: 0,
              }}>
                {initials || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', margin: 0 }} className="truncate">{ownerName}</p>
                <p style={{ fontSize: '11px', color: 'var(--text-subtle)', margin: 0 }} className="truncate">{user?.owner?.email || ''}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                style={{
                  color: 'var(--text-subtle)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = 'var(--text-subtle)'; }}
              >
                <LogOut size={14} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar — minimal, just mobile menu + title */}
        <header
          className="flex items-center gap-3 px-5 py-3 flex-shrink-0 md:py-4 md:px-6"
          style={{
            backgroundColor: 'var(--bg-base)',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <button
            className="md:hidden p-1.5"
            style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>

          <h1 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
            {sectionLabel}
          </h1>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5" style={{
              padding: '4px 10px',
              borderRadius: '100px',
              background: 'rgba(34,197,94,0.08)',
              border: '1px solid rgba(34,197,94,0.15)',
            }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--success)' }} className="animate-pulse" />
              <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>
                {user?.agent?.name || 'Agent'} Active
              </span>
            </div>

            <button
              onClick={onToggleAgentChat}
              className="relative md:hidden"
              style={{
                padding: '6px',
                borderRadius: '6px',
                color: agentChatOpen ? 'white' : 'var(--text-muted)',
                background: agentChatOpen ? 'var(--accent)' : 'transparent',
                border: 'none',
                cursor: 'pointer',
              }}
              title="Agent Chat"
            >
              <MessageCircle size={18} />
              {agentUnread > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-2px',
                  right: '-2px',
                  width: '14px',
                  height: '14px',
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '9px',
                  fontWeight: 700,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {agentUnread}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ backgroundColor: 'var(--bg-base)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

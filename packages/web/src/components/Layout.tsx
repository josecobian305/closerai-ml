import React, { useState } from 'react';
import {
  LayoutDashboard, Users, MessageSquare, Mail, GitBranch,
  Briefcase, FileText, Bot, BarChart3, CreditCard,
  Database, Bell, Settings, Menu, X, ChevronRight,
  Megaphone, Scale, MessageCircle, LogOut, Plug, TrendingUp
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
      { id: 'deals', label: 'Deals', icon: <Briefcase size={18} /> },
      { id: 'documents', label: 'Documents', icon: <FileText size={18} />, capability: 'docCollection' },
    ],
  },
  {
    title: 'Tools',
    items: [
      { id: 'court-search', label: 'Court Search', icon: <Scale size={18} />, capability: 'courtSearch' },
      { id: 'ai-agents', label: 'AI Agents', icon: <Bot size={18} /> },
      { id: 'reports', label: 'Reports', icon: <BarChart3 size={18} /> },
      { id: 'payments', label: 'Payments', icon: <CreditCard size={18} /> },
      { id: 'database', label: 'Database', icon: <Database size={18} /> },
    ],
  },
  {
    title: 'System',
    items: [
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

// Map accent color hex → approximate Tailwind-compatible inline style
function accentStyle(color: string) {
  return { backgroundColor: color };
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

  const { sidebarCollapsed, accentColor, theme } = preferences;

  // Determine theme-aware background classes
  const isDark = theme !== 'light';
  const bgClass = isDark ? '' : '';

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

  const businessName = user?.businessName || 'CloserAI';
  const ownerName = user?.owner?.name || 'Admin';
  const agentName = user?.agent?.name || 'Agent';
  const initials = getInitials(ownerName);

  // Sidebar width based on collapse preference
  const sidebarWidth = sidebarCollapsed ? 'w-16' : 'w-64';
  const sidebarWidthMd = sidebarCollapsed ? 'md:w-16' : 'md:w-64';

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--color-bg, #0b0f1a)', color: 'var(--color-text, #e2e8f0)' }}
    >
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/70 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex flex-col border-r
          transform transition-all duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex
          ${sidebarWidthMd}
        `}
        style={{
          backgroundColor: 'var(--color-surface, #111827)',
          borderColor: 'var(--color-border, #1f2937)',
          width: sidebarCollapsed ? '4rem' : undefined,
        }}
      >
        {/* Logo / Business name */}
        <div
          className="flex items-center gap-3 px-3 py-4 border-b"
          style={{ borderColor: 'var(--color-border, #1f2937)' }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0"
            style={accentStyle(accentColor)}
          >
            {businessName.charAt(0).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <span className="text-base font-bold tracking-tight truncate" style={{ color: 'var(--color-text, #e2e8f0)' }} title={businessName}>
              {businessName}
            </span>
          )}
          {!sidebarCollapsed && (
            <button
              className="ml-auto md:hidden p-1.5 rounded-lg"
              style={{ color: 'var(--color-muted, #6b7280)' }}
              onClick={() => setSidebarOpen(false)}
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Agent status badge */}
        {user && !sidebarCollapsed && (
          <div
            className="px-4 py-2.5 border-b"
            style={{ borderColor: 'var(--color-border, #1f2937)' }}
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {getInitials(agentName)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--color-text, #e2e8f0)' }}>{agentName}</p>
                <p className="text-xs text-green-400">{user.agent.title || 'AI Sales Agent'}</p>
              </div>
              <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
            </div>
          </div>
        )}
        {user && sidebarCollapsed && (
          <div className="flex justify-center py-2 border-b" style={{ borderColor: 'var(--color-border, #1f2937)' }}>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold">
              {getInitials(agentName)}
            </div>
          </div>
        )}

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter(isItemEnabled);
            if (visibleItems.length === 0) return null;
            return (
              <div key={group.title}>
                {!sidebarCollapsed && (
                  <p
                    className="px-3 py-1 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--color-muted, #6b7280)' }}
                  >
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
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5
                        transition-all duration-150
                        ${sidebarCollapsed ? 'justify-center' : ''}
                      `}
                      style={active ? {
                        backgroundColor: accentColor + '30',
                        color: accentColor,
                      } : {
                        color: 'var(--color-muted, #6b7280)',
                      }}
                      onMouseEnter={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-border, #1f2937)';
                          (e.currentTarget as HTMLElement).style.color = 'var(--color-text, #e2e8f0)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!active) {
                          (e.currentTarget as HTMLElement).style.backgroundColor = '';
                          (e.currentTarget as HTMLElement).style.color = 'var(--color-muted, #6b7280)';
                        }
                      }}
                    >
                      <span style={active ? { color: accentColor } : { color: 'var(--color-muted, #6b7280)' }}>
                        {item.icon}
                      </span>
                      {!sidebarCollapsed && (
                        <>
                          <span className="flex-1 text-left">{item.label}</span>
                          {item.badge && (
                            <span className="text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center" style={accentStyle(accentColor)}>
                              {item.badge}
                            </span>
                          )}
                          {active && <ChevronRight size={14} style={{ color: accentColor, opacity: 0.7 }} />}
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Agent Chat toggle in sidebar */}
        <div className="px-3 py-3 border-t" style={{ borderColor: 'var(--color-border, #1f2937)' }}>
          <button
            onClick={onToggleAgentChat}
            title={sidebarCollapsed ? 'Agent Chat' : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            style={agentChatOpen
              ? { backgroundColor: accentColor, color: '#fff' }
              : { backgroundColor: 'var(--color-border, #1f2937)', color: 'var(--color-muted, #6b7280)' }
            }
          >
            <MessageCircle size={18} />
            {!sidebarCollapsed && (
              <>
                <span className="flex-1 text-left">Agent Chat</span>
                {agentUnread > 0 && (
                  <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                    {agentUnread}
                  </span>
                )}
              </>
            )}
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-t" style={{ borderColor: 'var(--color-border, #1f2937)' }}>
          {sidebarCollapsed ? (
            <div className="flex justify-center">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                {initials || 'U'}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {initials || 'U'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text, #e2e8f0)' }}>{ownerName}</p>
                <p className="text-xs truncate" style={{ color: 'var(--color-muted, #6b7280)' }}>{user?.owner?.email || ''}</p>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                className="p-1.5 rounded-lg transition-colors flex-shrink-0"
                style={{ color: 'var(--color-muted, #6b7280)' }}
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="flex items-center gap-3 px-4 md:px-6 py-3.5 border-b flex-shrink-0"
          style={{
            backgroundColor: 'var(--color-surface, #111827)',
            borderColor: 'var(--color-border, #1f2937)',
          }}
        >
          <button
            className="md:hidden p-2 rounded-lg"
            style={{ color: 'var(--color-muted, #6b7280)' }}
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <h1 className="text-lg md:text-xl font-bold" style={{ color: 'var(--color-text, #e2e8f0)' }}>
            {sectionLabel}
          </h1>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 rounded-full border border-green-800/50">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">
                {user?.agent?.name || 'Agent'} Active
              </span>
            </div>

            <button
              onClick={onToggleAgentChat}
              className="relative p-2 rounded-lg transition-colors duration-150"
              style={agentChatOpen
                ? { backgroundColor: accentColor, color: '#fff' }
                : { color: 'var(--color-muted, #6b7280)' }
              }
              title="Agent Chat"
            >
              <MessageCircle size={20} />
              {agentUnread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {agentUnread}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main
          className="flex-1 overflow-y-auto p-4 md:p-6"
          style={{ backgroundColor: 'var(--color-bg, #0b0f1a)' }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

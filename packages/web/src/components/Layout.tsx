import React, { useState } from 'react';
import {
  LayoutDashboard, Users, MessageSquare, Mail, GitBranch,
  Briefcase, FileText, Bot, BarChart3, CreditCard,
  Database, Bell, Settings, Menu, X, ChevronRight,
  Megaphone, Scale, MessageCircle, LogOut
} from 'lucide-react';
import type { NavSection, UserConfig } from '../types';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  id: NavSection;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  capability?: string; // maps to capabilities key
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

  const handleNav = (id: NavSection) => {
    onNavigate(id);
    setSidebarOpen(false);
  };

  const sectionLabel = NAV_GROUPS
    .flatMap((g) => g.items)
    .find((i) => i.id === activeSection)?.label ?? 'Dashboard';

  // Filter nav items based on enabled capabilities
  const isItemEnabled = (item: NavItem): boolean => {
    if (!item.capability) return true;
    // If capabilities object is empty (admin or not set), show everything
    if (Object.keys(capabilities).length === 0) return true;
    return capabilities[item.capability] !== false;
  };

  const businessName = user?.businessName || 'CloserAI';
  const ownerName = user?.owner?.name || 'Admin';
  const agentName = user?.agent?.name || 'Agent';
  const initials = getInitials(ownerName);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
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
          fixed inset-y-0 left-0 z-30 w-64 flex flex-col bg-gray-900 border-r border-gray-800
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex
        `}
      >
        {/* Logo / Business name */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-lg flex-shrink-0">
            {businessName.charAt(0).toUpperCase()}
          </div>
          <span className="text-base font-bold text-white tracking-tight truncate" title={businessName}>
            {businessName}
          </span>
          <button
            className="ml-auto md:hidden p-1.5 rounded-lg text-gray-400 hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        {/* Agent status badge */}
        {user && (
          <div className="px-4 py-2.5 border-b border-gray-800/60 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {getInitials(agentName)}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{agentName}</p>
                <p className="text-xs text-green-400">{user.agent.title || 'AI Sales Agent'}</p>
              </div>
              <div className="ml-auto w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
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
                <p className="px-3 py-1 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  {group.title}
                </p>
                {visibleItems.map((item) => {
                  const active = item.id === activeSection;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium mb-0.5
                        transition-all duration-150
                        ${active
                          ? 'bg-indigo-600/90 text-white shadow-md shadow-indigo-900/40'
                          : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                      `}
                    >
                      <span className={active ? 'text-white' : 'text-gray-500'}>{item.icon}</span>
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.badge && (
                        <span className="bg-indigo-500/80 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                          {item.badge}
                        </span>
                      )}
                      {active && <ChevronRight size={14} className="text-indigo-300 opacity-70" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* Agent Chat toggle in sidebar */}
        <div className="px-3 py-3 border-t border-gray-800">
          <button
            onClick={onToggleAgentChat}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              agentChatOpen ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            <MessageCircle size={18} />
            <span className="flex-1 text-left">Agent Chat</span>
            {agentUnread > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                {agentUnread}
              </span>
            )}
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initials || 'U'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{ownerName}</p>
              <p className="text-xs text-gray-500 truncate">{user?.owner?.email || ''}</p>
            </div>
            <button
              onClick={logout}
              title="Sign out"
              className="p-1.5 rounded-lg text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-3 px-4 md:px-6 py-3.5 border-b border-gray-800 bg-gray-950 flex-shrink-0">
          <button
            className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={22} />
          </button>

          <h1 className="text-lg md:text-xl font-bold text-white">{sectionLabel}</h1>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 rounded-full border border-green-800/50">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs text-green-400 font-medium">
                {user?.agent?.name || 'Agent'} Active
              </span>
            </div>

            <button
              onClick={onToggleAgentChat}
              className={`relative p-2 rounded-lg transition-colors duration-150 ${
                agentChatOpen ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

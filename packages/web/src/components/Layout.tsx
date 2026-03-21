import React, { useState } from 'react';

/** Navigation item */
interface NavItem {
  label: string;
  icon: string;
  active?: boolean;
  onClick?: () => void;
}

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', icon: '📊' },
  { label: 'Contacts', icon: '👥', active: true },
  { label: 'Jacob', icon: '🤖' },
  { label: 'Angie', icon: '🤖' },
  { label: 'SMS Logs', icon: '💬' },
  { label: 'Stats', icon: '📈' },
  { label: 'Settings', icon: '⚙️' },
];

/**
 * Main app layout: sidebar + mobile hamburger topbar.
 */
export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-gray-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
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
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg">
            C
          </div>
          <span className="text-xl font-bold text-white">CloserAI</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-base font-medium mb-1
                transition-colors duration-150
                ${item.active
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
              `}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-800 text-xs text-gray-500">
          CHC Capital · CloserAI v1.0
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex items-center gap-4 px-4 md:px-6 py-4 border-b border-gray-800 bg-gray-950">
          {/* Hamburger (mobile) */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Open menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <h1 className="text-xl md:text-2xl font-bold text-white">Contacts</h1>

          <div className="ml-auto flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="hidden sm:inline text-sm text-gray-400">Live</span>
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

import { useEffect, useState } from 'react';
import { Bot, Activity, Circle } from 'lucide-react';
import { fetchAgents } from '../api';
import type { AgentStatus } from '../types';

export function AgentsView() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents()
      .then((r) => setAgents(r.agents ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl">
      <h2 className="text-2xl font-bold text-white mb-6">AI Agents</h2>
      {loading ? (
        <div className="space-y-4">
          {[0, 1].map((i) => (
            <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse">
              <div className="h-5 bg-gray-800 rounded w-32 mb-3" />
              <div className="h-3 bg-gray-800 rounded w-48" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">
          <Bot size={36} className="text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">No agents configured</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => (
            <div key={agent.name} className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg ${
                  agent.name === 'jacob' ? 'bg-green-900/60 text-green-300' : 'bg-purple-900/60 text-purple-300'
                }`}>
                  {agent.displayName?.[0] ?? agent.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{agent.displayName || agent.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Circle size={8} className={agent.active ? 'text-green-400 fill-green-400' : 'text-gray-600 fill-gray-600'} />
                    <span className={`text-xs ${agent.active ? 'text-green-400' : 'text-gray-500'}`}>
                      {agent.active ? 'Active' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/60 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Sends Log Size</p>
                  <p className="text-white text-sm font-medium">{(agent.stats.sendsFileSize / 1024).toFixed(1)} KB</p>
                </div>
                <div className="bg-gray-800/60 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Events Log Size</p>
                  <p className="text-white text-sm font-medium">{(agent.stats.eventsFileSize / 1024).toFixed(1)} KB</p>
                </div>
                {agent.stats.lastModified && (
                  <div className="bg-gray-800/60 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Activity size={12} /> Last Active</p>
                    <p className="text-white text-sm">{new Date(agent.stats.lastModified).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceholderView({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <span className="text-6xl mb-4">{icon}</span>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-gray-500 max-w-sm">{description}</p>
      <div className="mt-6 px-4 py-2 bg-gray-800 rounded-full text-xs text-gray-600 border border-gray-700">
        Coming soon
      </div>
    </div>
  );
}

export function DashboardView() {
  return (
    <PlaceholderView icon="📊" title="Dashboard" description="High-level overview of your CRM metrics, recent activity, and pipeline health." />
  );
}

export function MessagesView() {
  return (
    <PlaceholderView icon="💬" title="Messages" description="Unified inbox for all inbound SMS and email replies across contacts." />
  );
}

export function SmsCampaignsView() {
  return (
    <PlaceholderView icon="📣" title="SMS Campaigns" description="Create, schedule, and manage bulk SMS outreach campaigns." />
  );
}

export function EmailView() {
  return (
    <PlaceholderView icon="📧" title="Email" description="Send and track email campaigns. Sync with your email provider." />
  );
}

export function PipelineView() {
  return (
    <PlaceholderView icon="🔀" title="Pipeline" description="Kanban-style deal pipeline. Drag and drop contacts through stages." />
  );
}

export function DealsView() {
  return (
    <PlaceholderView icon="💼" title="Deals" description="Track active and closed funding deals. View deal values and statuses." />
  );
}

export function DocumentsView() {
  return (
    <PlaceholderView icon="📄" title="Documents" description="All received bank statements and business documents in one place." />
  );
}

export function CourtSearchView() {
  return (
    <PlaceholderView icon="⚖️" title="Court Search" description="Search public court records for liens, judgments, and bankruptcies." />
  );
}

export function ReportsView() {
  return (
    <PlaceholderView icon="📈" title="Reports" description="Detailed analytics: reply rates, conversion funnels, agent performance." />
  );
}

export function PaymentsView() {
  return (
    <PlaceholderView icon="💳" title="Payments" description="Track payment collections, merchant funding status, and remittances." />
  );
}

export function DatabaseView() {
  return (
    <PlaceholderView icon="🗄️" title="Database" description="Browse and query the raw contact and transaction database." />
  );
}

export function NotificationsView() {
  return (
    <PlaceholderView icon="🔔" title="Notifications" description="Alerts for new replies, hot leads, document submissions, and agent events." />
  );
}

export function SettingsView() {
  return (
    <PlaceholderView icon="⚙️" title="Settings" description="Configure agents, API keys, notification preferences, and user accounts." />
  );
}

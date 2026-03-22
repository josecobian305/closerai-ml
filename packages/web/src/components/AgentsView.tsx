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
            <div key={i} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5 animate-pulse">
              <div className="h-5 bg-[var(--bg-elevated)] rounded w-32 mb-3" />
              <div className="h-3 bg-[var(--bg-elevated)] rounded w-48" />
            </div>
          ))}
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-8 text-center">
          <Bot size={36} className="text-[var(--text-subtle)] mx-auto mb-3" />
          <p className="text-[var(--text-muted)]">No agents configured</p>
        </div>
      ) : (
        <div className="space-y-4">
          {agents.map((agent) => (
            <div key={agent.name} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-lg ${
                  agent.name === 'jacob' ? 'bg-green-900/60 text-green-300' : 'bg-purple-900/60 text-purple-300'
                }`}>
                  {agent.displayName?.[0] ?? agent.name[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-white font-semibold">{agent.displayName || agent.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Circle size={8} className={agent.active ? 'text-green-400 fill-green-400' : 'text-[var(--text-subtle)] fill-gray-600'} />
                    <span className={`text-xs ${agent.active ? 'text-green-400' : 'text-[var(--text-muted)]'}`}>
                      {agent.active ? 'Active' : 'Offline'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[var(--bg-elevated)]/60 rounded-xl p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Sends Log Size</p>
                  <p className="text-white text-sm font-medium">{(agent.stats.sendsFileSize / 1024).toFixed(1)} KB</p>
                </div>
                <div className="bg-[var(--bg-elevated)]/60 rounded-xl p-3">
                  <p className="text-xs text-[var(--text-muted)] mb-1">Events Log Size</p>
                  <p className="text-white text-sm font-medium">{(agent.stats.eventsFileSize / 1024).toFixed(1)} KB</p>
                </div>
                {agent.stats.lastModified && (
                  <div className="bg-[var(--bg-elevated)]/60 rounded-xl p-3 col-span-2">
                    <p className="text-xs text-[var(--text-muted)] mb-1 flex items-center gap-1"><Activity size={12} /> Last Active</p>
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

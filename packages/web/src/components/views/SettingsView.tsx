import React, { useEffect, useState } from 'react';
import { fetchSettings, saveSettings } from '../../api';
import { Settings, Save, Loader2 } from 'lucide-react';

export function SettingsView() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeTab, React_useState] = useState<'general'|'llc'>('general');
  const setActiveTab = React_useState[1];

  useEffect(() => {
    fetchSettings().then(setSettings).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try { await saveSettings(settings); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 size={24} className="animate-spin text-[var(--text-muted)]" />
    </div>
  );

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Settings size={24} /> Settings
        </h2>
        {activeTab === 'general' && (
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-all">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[var(--border)] mb-6">
        {([['general','⚙️ General'],['llc','🏢 LLC Profiles & 10DLC']] as const).map(([tab, label]) => (
          <button key={tab} onClick={() => setActiveTab(tab as any)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab === tab ? 'text-white border-[var(--accent)]' : 'text-[var(--text-muted)] border-transparent hover:text-[var(--text-secondary)]'}`}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'llc' ? (
        <LLCProfilesSection />
      ) : (
        <div className="space-y-6">
          {/* Agent Config */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">Agent Configuration</h3>
            <div className="space-y-3">
              {(['jacob','angie'] as const).map(agent => (
                <div key={agent} className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)] text-sm capitalize">{agent} Agent</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" checked={settings[agent + '_enabled'] !== false}
                      onChange={e => setSettings((s: any) => ({ ...s, [agent + '_enabled']: e.target.checked }))}
                      className="sr-only peer" />
                    <div className="w-9 h-5 bg-gray-700 peer-checked:bg-[var(--accent)] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Voice Note Chance */}
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5">
            <h3 className="text-sm font-semibold text-[var(--text-muted)] mb-3">Voice Note Probability</h3>
            <div className="flex items-center gap-3">
              <input type="range" min="0" max="100" value={Math.round((settings.voice_note_chance || 0) * 100)}
                onChange={e => setSettings((s: any) => ({ ...s, voice_note_chance: parseInt(e.target.value) / 100 }))}
                className="flex-1" />
              <span className="text-white text-sm font-bold w-12 text-right">{Math.round((settings.voice_note_chance || 0) * 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}



// ─── LLC Profiles Section (exported separately for easy import) ─────────────
export function LLCProfilesSection() {
  const BASE = window.location.hostname === 'closerai.apipay.cash' ? '/api/v1' : '/app/api/v1';
  const [profiles, setProfiles] = React.useState<any[]>([]);
  const [editing, setEditing] = React.useState<string | null>(null);
  const [form, setForm] = React.useState<any>({});
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    fetch(`${BASE}/underwriting/llc-profiles`).then(r => r.json()).then(d => setProfiles(d.profiles || [])).catch(() => {});
  }, []);

  const startEdit = (p: any) => { setEditing(p.id); setForm({ ...p }); };
  const startNew = () => { setEditing('new'); setForm({ id: '', name: '', legal_name: '', email: '', phone: '', website: '', watermark_color: '#0b3d91', ten_dlc: { brand_id: '', sms_number: '', status: 'pending' }, active: true }); };

  const save = async () => {
    setSaving(true);
    const id = editing === 'new' ? form.id || form.name.toLowerCase().replace(/\s+/g, '_') : editing!;
    await fetch(`${BASE}/underwriting/llc-profiles/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, id })
    });
    const d = await fetch(`${BASE}/underwriting/llc-profiles`).then(r => r.json());
    setProfiles(d.profiles || []);
    setEditing(null);
    setSaving(false);
  };

  const uploadLogo = async (id: string, file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const b64 = (e.target?.result as string).split(',')[1];
      await fetch(`${BASE}/underwriting/llc-profiles/${id}/logo`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo_data: b64, filename: file.name, content_type: file.type })
      });
      const d = await fetch(`${BASE}/underwriting/llc-profiles`).then(r => r.json());
      setProfiles(d.profiles || []);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg">LLC Profiles</h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">Manage your companies, 10DLC registrations, and branding for lender emails</p>
        </div>
        <button onClick={startNew} className="px-4 py-2 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg text-sm font-semibold">+ Add LLC</button>
      </div>

      {profiles.map(p => (
        <div key={p.id} className="bg-[var(--bg-card)] border border-[var(--border)] rounded-[10px] p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              {p.logo_url ? (
                <img src={p.logo_url} alt={p.name} className="w-10 h-10 rounded-lg object-contain bg-gray-800 p-1" />
              ) : (
                <div style={{ background: p.watermark_color || '#0b3d91' }} className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                  {(p.name || '?')[0]}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">{p.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.active ? 'bg-green-900/40 text-green-400' : 'bg-gray-800 text-gray-500'}`}>
                    {p.active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <p className="text-[var(--text-muted)] text-xs mt-0.5">{p.email} · {p.phone}</p>
              </div>
            </div>
            <button onClick={() => startEdit(p)} className="text-xs text-[var(--accent)] hover:underline">Edit</button>
          </div>

          {/* 10DLC Info */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
              <div className="text-xs text-[var(--text-muted)] mb-1 font-semibold uppercase tracking-wide">10DLC Brand ID</div>
              <div className="text-white font-mono text-sm">{p.ten_dlc?.brand_id || '—'}</div>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
              <div className="text-xs text-[var(--text-muted)] mb-1 font-semibold uppercase tracking-wide">SMS Number</div>
              <div className="text-white font-mono text-sm">{p.ten_dlc?.sms_number || '—'}</div>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
              <div className="text-xs text-[var(--text-muted)] mb-1 font-semibold uppercase tracking-wide">Campaign ID</div>
              <div className="text-white font-mono text-sm">{p.ten_dlc?.campaign_id || '—'}</div>
            </div>
            <div className="bg-[var(--bg-elevated)] rounded-lg p-3">
              <div className="text-xs text-[var(--text-muted)] mb-1 font-semibold uppercase tracking-wide">Status</div>
              <div className={`text-sm font-semibold ${p.ten_dlc?.status === 'registered' ? 'text-green-400' : 'text-yellow-400'}`}>
                {p.ten_dlc?.status || 'pending'}
              </div>
            </div>
          </div>

          {/* Logo upload */}
          <label className="cursor-pointer">
            <span className="text-xs text-[var(--accent)] hover:underline">Upload Logo</span>
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadLogo(p.id, e.target.files[0])} />
          </label>
          <span className="text-xs text-[var(--text-muted)] ml-2">· Used on watermarked PDFs + lender emails</span>
        </div>
      ))}

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl max-w-lg w-full p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">{editing === 'new' ? 'Add LLC' : 'Edit LLC'}</h3>
            
            {[
              ['id', 'ID (no spaces, e.g. "chc" or "wotr")'],
              ['name', 'Display Name'],
              ['legal_name', 'Legal Name'],
              ['ein', 'EIN'],
              ['email', 'From Email'],
              ['phone', 'Phone'],
              ['website', 'Website'],
              ['watermark_color', 'Watermark Color (hex)'],
            ].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-[var(--text-muted)] font-semibold block mb-1">{label}</label>
                <input
                  value={form[key] || ''}
                  onChange={e => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            ))}
            
            <div className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wide mt-4">10DLC Registration</div>
            {[['brand_id', 'Brand ID'], ['campaign_id', 'Campaign ID'], ['sms_number', 'SMS Number']].map(([key, label]) => (
              <div key={key}>
                <label className="text-xs text-[var(--text-muted)] font-semibold block mb-1">{label}</label>
                <input
                  value={form.ten_dlc?.[key] || ''}
                  onChange={e => setForm((f: any) => ({ ...f, ten_dlc: { ...(f.ten_dlc||{}), [key]: e.target.value } }))}
                  className="w-full bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-[var(--accent)]"
                />
              </div>
            ))}

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEditing(null)} className="flex-1 py-2 bg-[var(--bg-elevated)] text-[var(--text-muted)] rounded-lg text-sm">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2 bg-[var(--accent)] hover:opacity-90 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

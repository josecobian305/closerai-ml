import { useEffect, useState } from 'react';
import { fetchSettings, saveSettings } from '../../api';
import { Settings, Save, Loader2 } from 'lucide-react';

export function SettingsView() {
  const [settings, setSettings] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetchSettings().then(d => setSettings(d.settings || {})).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  const toggle = (key: string) => setSettings((s: any) => ({ ...s, [key]: !s[key] }));
  const setNum = (key: string, val: string) => setSettings((s: any) => ({ ...s, [key]: parseInt(val) || 0 }));

  if (loading) return (
    <div className="space-y-4 max-w-2xl">
      <div className="h-8 bg-gray-800 rounded w-40 animate-pulse" />
      {[...Array(4)].map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 animate-pulse h-20" />)}
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Settings</h2>
        <button onClick={handleSave} disabled={saving}
          className={`px-4 py-2 rounded-xl text-sm flex items-center gap-2 ${saved ? 'bg-green-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      {/* Toggles */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-400">Agent Configuration</h3>
        {[
          { key: 'auto_reply_enabled', label: 'Auto Reply', desc: 'Let agents auto-reply to inbound messages' },
          { key: 'voice_notes_enabled', label: 'Voice Notes', desc: 'Enable voice note messages' },
          { key: 'call_bridge_enabled', label: 'Call Bridge', desc: 'Auto-dial warm leads' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <button onClick={() => toggle(key)} className={`w-12 h-6 rounded-full transition-colors ${settings[key] ? 'bg-indigo-600' : 'bg-gray-700'}`}>
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${settings[key] ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
          </div>
        ))}
      </div>

      {/* Number inputs */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-sm font-semibold text-gray-400">Limits</h3>
        {[
          { key: 'max_daily_touches_per_merchant', label: 'Max Daily Touches', desc: 'Per merchant per day' },
          { key: 'call_bridge_delay_seconds', label: 'Call Bridge Delay (s)', desc: 'Seconds before auto-dialing' },
        ].map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-white text-sm font-medium">{label}</p>
              <p className="text-xs text-gray-500">{desc}</p>
            </div>
            <input type="number" value={settings[key] || 0} onChange={e => setNum(key, e.target.value)}
              className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm text-center" />
          </div>
        ))}
      </div>

      {/* Voice Note Chance */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Voice Note Probability</h3>
        <div className="flex items-center gap-3">
          <input type="range" min="0" max="100" value={Math.round((settings.voice_note_chance || 0) * 100)}
            onChange={e => setSettings((s: any) => ({ ...s, voice_note_chance: parseInt(e.target.value) / 100 }))}
            className="flex-1" />
          <span className="text-white text-sm font-bold w-12 text-right">{Math.round((settings.voice_note_chance || 0) * 100)}%</span>
        </div>
      </div>

      {/* Call Bridge Triggers */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Call Bridge Triggers</h3>
        <div className="flex flex-wrap gap-2">
          {(settings.call_bridge_triggers || []).map((t: string, i: number) => (
            <span key={i} className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-xs">{t}</span>
          ))}
          {(!settings.call_bridge_triggers || settings.call_bridge_triggers.length === 0) && (
            <p className="text-gray-600 text-xs">No triggers configured</p>
          )}
        </div>
      </div>
    </div>
  );
}

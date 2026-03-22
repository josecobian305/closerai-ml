import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, MessageSquare, Video, Mail, Phone, X, Tag } from 'lucide-react';
import type { StepProps, UploadedAsset } from './OnboardingRouter';

const TAGS = ['objection_handling', 'opener', 'follow_up', 'closing', 'pitch'] as const;

const CATEGORIES = [
  { key: 'scripts', label: 'Sales Scripts', icon: <FileText size={24} />, accept: '.pdf,.docx,.txt,.doc', desc: 'PDF, DOCX, TXT' },
  { key: 'messages', label: 'Message Templates', icon: <MessageSquare size={24} />, accept: '.txt,.csv,.json', desc: 'TXT, CSV, or paste below' },
  { key: 'recordings', label: 'Call Recordings', icon: <Video size={24} />, accept: '.mp4,.mp3,.m4a,.wav,.webm', desc: 'MP4, MP3, M4A' },
  { key: 'emails', label: 'Email Sequences', icon: <Mail size={24} />, accept: '.txt,.html,.eml,.csv', desc: 'TXT, HTML, EML' },
  { key: 'sms', label: 'SMS Sequences', icon: <Phone size={24} />, accept: '.txt,.csv,.json', desc: 'TXT, CSV, JSON' },
];

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.04)', border: '2px dashed rgba(255,255,255,0.1)',
  borderRadius: 12, padding: 24, textAlign: 'center', cursor: 'pointer',
  transition: 'all 0.15s',
};

export function Step02TrainingAssets({ data, onUpdate, onNext }: StepProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [tagging, setTagging] = useState<string | null>(null); // asset id being tagged
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const addAssets = useCallback((files: FileList, category: string) => {
    const newAssets: UploadedAsset[] = Array.from(files).map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: f.name,
      type: category,
      tag: 'pitch',
      size: f.size,
    }));
    onUpdate({ assets: [...data.assets, ...newAssets] });
  }, [data.assets, onUpdate]);

  const removeAsset = (id: string) => {
    onUpdate({ assets: data.assets.filter(a => a.id !== id) });
  };

  const setTag = (id: string, tag: string) => {
    onUpdate({ assets: data.assets.map(a => a.id === id ? { ...a, tag } : a) });
    setTagging(null);
  };

  const formatSize = (b: number) => b < 1024 ? `${b}B` : b < 1048576 ? `${(b / 1024).toFixed(1)}KB` : `${(b / 1048576).toFixed(1)}MB`;

  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: '#635bff', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
        📁 UPLOAD TRAINING ASSETS
      </div>
      <div style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 700, lineHeight: 1.2, marginBottom: 12, letterSpacing: -0.5 }}>
        Upload anything that captures how you sell
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 32, lineHeight: 1.6 }}>
        Scripts, recordings, templates — these become the training data for your AI agents. You can always add more later.
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 24 }}>
        {CATEGORIES.map(cat => (
          <div
            key={cat.key}
            style={{
              ...cardStyle,
              borderColor: dragOver === cat.key ? '#635bff' : 'rgba(255,255,255,0.1)',
              background: dragOver === cat.key ? 'rgba(99,91,255,0.08)' : 'rgba(255,255,255,0.04)',
            }}
            onClick={() => fileRefs.current[cat.key]?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(cat.key); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={e => { e.preventDefault(); setDragOver(null); addAssets(e.dataTransfer.files, cat.key); }}
          >
            <input
              ref={el => { fileRefs.current[cat.key] = el; }}
              type="file" accept={cat.accept} multiple hidden
              onChange={e => { if (e.target.files) addAssets(e.target.files, cat.key); }}
            />
            <div style={{ marginBottom: 8, color: '#635bff' }}>{cat.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{cat.label}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{cat.desc}</div>
          </div>
        ))}
      </div>

      {/* Uploaded assets list */}
      {data.assets.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
            {data.assets.length} file{data.assets.length > 1 ? 's' : ''} uploaded
          </div>
          {data.assets.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: 'rgba(255,255,255,0.04)', borderRadius: 8, marginBottom: 6,
            }}>
              <FileText size={16} style={{ color: '#635bff', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{a.type} · {formatSize(a.size)}</div>
              </div>
              <button
                onClick={() => setTagging(tagging === a.id ? null : a.id)}
                style={{
                  background: 'rgba(99,91,255,0.15)', border: 'none', borderRadius: 4,
                  color: '#635bff', fontSize: 11, padding: '4px 8px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <Tag size={10} /> {a.tag}
              </button>
              <button onClick={() => removeAsset(a.id)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
              {tagging === a.id && (
                <div style={{
                  position: 'absolute', right: 60, background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8, padding: 6, display: 'flex', flexDirection: 'column', gap: 2, zIndex: 10,
                }}>
                  {TAGS.map(t => (
                    <button key={t} onClick={() => setTag(a.id, t)} style={{
                      background: a.tag === t ? 'rgba(99,91,255,0.2)' : 'transparent',
                      border: 'none', color: '#fff', padding: '6px 12px', borderRadius: 4,
                      cursor: 'pointer', fontSize: 12, textAlign: 'left', fontFamily: 'inherit',
                    }}>
                      {t.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button onClick={onNext} style={{
          background: '#635bff', color: '#fff', border: 'none',
          padding: '14px 28px', borderRadius: 8, fontSize: 15, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
        }}>
          {data.assets.length > 0 ? 'Continue →' : 'Skip for now →'}
        </button>
      </div>
    </div>
  );
}

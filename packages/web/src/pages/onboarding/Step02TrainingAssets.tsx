import { useState, useRef, useCallback } from 'react';
import { Upload, FileText, MessageSquare, Video, Mail, Phone, X, Tag, ArrowRight } from 'lucide-react';
import type { StepProps, UploadedAsset } from './OnboardingRouter';

const TAGS = ['objection_handling', 'opener', 'follow_up', 'closing', 'pitch'] as const;

const CATEGORIES = [
  { key: 'scripts', label: 'Sales Scripts', icon: FileText, accept: '.pdf,.docx,.txt,.doc', desc: 'PDF, DOCX, TXT' },
  { key: 'messages', label: 'Message Templates', icon: MessageSquare, accept: '.txt,.csv,.json', desc: 'TXT, CSV, or paste' },
  { key: 'recordings', label: 'Call Recordings', icon: Video, accept: '.mp4,.mp3,.m4a,.wav,.webm', desc: 'MP4, MP3, M4A' },
  { key: 'emails', label: 'Email Sequences', icon: Mail, accept: '.txt,.html,.eml,.csv', desc: 'TXT, HTML, EML' },
  { key: 'sms', label: 'SMS Sequences', icon: Phone, accept: '.txt,.csv,.json', desc: 'TXT, CSV, JSON' },
];

export function Step02TrainingAssets({ data, onUpdate, onNext }: StepProps) {
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [tagging, setTagging] = useState<string | null>(null);
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
    <div className="flex flex-col items-center h-full px-6 pt-8">
      <h2 className="text-3xl md:text-4xl font-bold text-white mb-2 text-center">
        Upload your training assets
      </h2>
      <p className="text-[var(--text-muted)] mb-8 text-center max-w-md">
        Scripts, recordings, templates — these become the training data for your AI agents. You can always add more later.
      </p>

      {/* Upload cards grid */}
      <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isDraggedOver = dragOver === cat.key;
          return (
            <div
              key={cat.key}
              onClick={() => fileRefs.current[cat.key]?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(cat.key); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={e => { e.preventDefault(); setDragOver(null); addAssets(e.dataTransfer.files, cat.key); }}
              className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 ${
                isDraggedOver
                  ? 'border-indigo-500 bg-[var(--accent)]/10'
                  : 'border-[var(--border)] bg-[var(--bg-elevated)]/40 hover:border-[var(--border-active)] hover:bg-[var(--bg-elevated)]/60'
              }`}
            >
              <input
                ref={el => { fileRefs.current[cat.key] = el; }}
                type="file" accept={cat.accept} multiple hidden
                onChange={e => { if (e.target.files) addAssets(e.target.files, cat.key); }}
              />
              <Icon size={24} className={isDraggedOver ? 'text-indigo-400' : 'text-[var(--text-muted)]'} />
              <span className="text-sm font-semibold text-white">{cat.label}</span>
              <span className="text-[10px] text-[var(--text-subtle)]">{cat.desc}</span>
            </div>
          );
        })}
      </div>

      {/* Uploaded assets list */}
      {data.assets.length > 0 && (
        <div className="w-full max-w-2xl mb-6">
          <p className="text-xs font-semibold text-[var(--text-muted)] mb-2">
            {data.assets.length} file{data.assets.length > 1 ? 's' : ''} uploaded
          </p>
          <div className="space-y-2">
            {data.assets.map(a => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-3 bg-[var(--bg-card)] rounded-xl border border-[var(--border)]">
                <FileText size={16} className="text-indigo-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">{a.name}</div>
                  <div className="text-[10px] text-[var(--text-subtle)]">{a.type} · {formatSize(a.size)}</div>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setTagging(tagging === a.id ? null : a.id)}
                    className="text-[10px] font-semibold bg-[var(--accent)]/15 text-indigo-400 px-2 py-1 rounded flex items-center gap-1"
                  >
                    <Tag size={10} /> {a.tag.replace(/_/g, ' ')}
                  </button>
                  {tagging === a.id && (
                    <div className="absolute right-0 top-8 bg-[var(--bg-elevated)] border border-[var(--border)] rounded-lg shadow-xl p-1.5 z-10 min-w-[140px]">
                      {TAGS.map(t => (
                        <button
                          key={t}
                          onClick={() => setTag(a.id, t)}
                          className={`block w-full text-left text-xs px-3 py-2 rounded ${
                            a.tag === t ? 'bg-[var(--accent)]/20 text-indigo-300' : 'text-[var(--text-muted)] hover:bg-[var(--bg-card)]'
                          }`}
                        >
                          {t.replace(/_/g, ' ')}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={() => removeAsset(a.id)} className="text-[var(--text-subtle)] hover:text-red-400 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="fixed bottom-0 left-0 right-0 z-50 px-6 py-4 bg-gradient-to-t from-gray-950 via-gray-950/90 to-transparent">
        <button
          onClick={onNext}
          className="w-full max-w-lg mx-auto flex items-center justify-center gap-2 bg-[var(--accent)] hover:opacity-90 text-white font-semibold text-base py-4 rounded-xl transition-all duration-200 block"
        >
          {data.assets.length > 0 ? 'Continue →' : 'Skip for now →'}
        </button>
      </div>
    </div>
  );
}

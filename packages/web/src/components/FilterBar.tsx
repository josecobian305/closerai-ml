import { Search, X } from 'lucide-react';
import type { ContactFilter } from '../types';

interface FilterBarProps {
  filter: ContactFilter;
  onFilterChange: (f: Partial<ContactFilter>) => void;
  total: number;
  loading: boolean;
}

interface Chip {
  label: string;
  tier?: string;
  tag?: string;
}

const CHIPS: Chip[] = [
  { label: 'All' },
  { label: '🔥 Hot Leads', tier: 'hot' },
  { label: '🌤 Warm', tier: 'warm' },
  { label: '✅ Sent Documents', tag: 'Sent Documents' },
  { label: '❄️ Cold', tier: 'cold' },
  { label: '💰 Funded', tag: 'Funded' },
  { label: '🌿 LendingTree', tag: 'LendingTree' },
  { label: '📅 October Leads', tag: 'October Leads' },
];

export function FilterBar({ filter, onFilterChange, total, loading }: FilterBarProps) {
  const activeChipIndex = CHIPS.findIndex((c) => {
    if (!c.tier && !c.tag) return !filter.tier && !filter.tag;
    if (c.tier) return filter.tier === c.tier && !filter.tag;
    if (c.tag) return filter.tag === c.tag && !filter.tier;
    return false;
  });

  const handleChipClick = (chip: Chip) => {
    onFilterChange({
      tier: chip.tier,
      tag: chip.tag,
    });
  };

  const clearSearch = () => onFilterChange({ query: '' });

  return (
    <div style={{ marginBottom: '20px' }} className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Search size={15} style={{ color: 'var(--text-subtle)' }} />
        </div>
        <input
          type="search"
          value={filter.query}
          onChange={(e) => onFilterChange({ query: e.target.value })}
          placeholder="Search by name, phone, business…"
          style={{
            width: '100%',
            paddingLeft: '36px',
            paddingRight: '36px',
            paddingTop: '9px',
            paddingBottom: '9px',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            color: 'var(--text-primary)',
            fontSize: '13px',
            outline: 'none',
          }}
        />
        {filter.query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 flex items-center pr-3"
            style={{ color: 'var(--text-subtle)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter chips + count */}
      <div className="flex flex-wrap items-center gap-2">
        {CHIPS.map((chip, i) => {
          const isActive = i === activeChipIndex;
          return (
            <button
              key={chip.label}
              onClick={() => handleChipClick(chip)}
              style={{
                padding: '5px 12px',
                borderRadius: '100px',
                fontSize: '11px',
                fontWeight: 600,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                border: isActive ? '1px solid rgba(99,91,255,0.3)' : '1px solid var(--border)',
                background: isActive ? 'rgba(99,91,255,0.12)' : 'transparent',
                color: isActive ? '#a5b4fc' : 'var(--text-muted)',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                  (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                }
              }}
            >
              {chip.label}
            </button>
          );
        })}

        <span className="ml-auto" style={{ fontSize: '11px', color: 'var(--text-subtle)', paddingLeft: '8px' }}>
          {loading ? (
            <span className="animate-pulse">Loading…</span>
          ) : (
            `${total.toLocaleString()} contacts`
          )}
        </span>
      </div>
    </div>
  );
}

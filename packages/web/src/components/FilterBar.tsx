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
    <div className="mb-5 space-y-3">
      {/* Search input */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <Search size={17} className="text-gray-500" />
        </div>
        <input
          type="search"
          value={filter.query}
          onChange={(e) => onFilterChange({ query: e.target.value })}
          placeholder="Search by name, phone, business…"
          className="w-full pl-11 pr-10 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
        />
        {filter.query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-gray-300"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter chips + count */}
      <div className="flex flex-wrap items-center gap-2">
        {CHIPS.map((chip, i) => (
          <button
            key={chip.label}
            onClick={() => handleChipClick(chip)}
            className={`
              px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 whitespace-nowrap
              ${i === activeChipIndex
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-900/40'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white border border-gray-700'}
            `}
          >
            {chip.label}
          </button>
        ))}

        <span className="ml-auto text-xs text-gray-500 pl-2">
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

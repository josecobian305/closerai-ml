import type { ContactFilter } from '../types';

interface FilterBarProps {
  filter: ContactFilter;
  onFilterChange: (f: Partial<ContactFilter>) => void;
  total: number;
  loading: boolean;
}

const TIER_CHIPS: Array<{ label: string; value: 'hot' | 'warm' | 'cold' | undefined }> = [
  { label: 'All', value: undefined },
  { label: '🔥 Hot', value: 'hot' },
  { label: '🌤 Warm', value: 'warm' },
  { label: '❄️ Cold', value: 'cold' },
];

/**
 * Search bar + filter chips for the contacts grid.
 */
export function FilterBar({ filter, onFilterChange, total, loading }: FilterBarProps) {
  return (
    <div className="mb-6 space-y-3">
      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>
        <input
          type="search"
          value={filter.query}
          onChange={(e) => onFilterChange({ query: e.target.value })}
          placeholder="Search by name, phone, business…"
          className="w-full pl-12 pr-4 py-3.5 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 text-base focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Filter chips + count */}
      <div className="flex flex-wrap items-center gap-2">
        {TIER_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => onFilterChange({ tier: chip.value })}
            className={`
              px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-150
              ${filter.tier === chip.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'}
            `}
          >
            {chip.label}
          </button>
        ))}

        <span className="ml-auto text-sm text-gray-500">
          {loading ? 'Loading…' : `${total.toLocaleString()} contacts`}
        </span>
      </div>
    </div>
  );
}

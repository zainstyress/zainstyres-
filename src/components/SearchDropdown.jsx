import React from 'react';
import { Clock3, History, Search, X } from 'lucide-react';

const SearchDropdownItem = ({ icon, title, subtitle, onClick }) => (
  <button
    type="button"
    onMouseDown={(event) => event.preventDefault()}
    onClick={onClick}
    className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-colors hover:bg-white/5"
  >
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-white/5 bg-white/5 text-zinc-300">
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-black uppercase tracking-wide text-white">{title}</p>
      {subtitle ? <p className="truncate text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">{subtitle}</p> : null}
    </div>
  </button>
);

export default function SearchDropdown({
  suggestions = [],
  recentSearches = [],
  onSelectSuggestion,
  onSelectRecent,
  onClearRecent,
  emptyMessage = 'Keep typing to search tyres, brands, and sizes.',
}) {
  const hasSuggestions = suggestions.length > 0;
  const hasRecent = recentSearches.length > 0;

  return (
    <div className="absolute left-0 right-0 top-full z-[140] mt-3 overflow-hidden rounded-[28px] border border-white/10 bg-[#0c0c0d] p-3 shadow-[0_30px_80px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      {hasRecent && (
        <div className="mb-3 rounded-[22px] border border-white/5 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
              <History size={12} /> Recent
            </div>
            <button type="button" onClick={onClearRecent} className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-600 transition-colors hover:text-white">
              <X size={11} /> Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((item) => (
              <button
                type="button"
                key={item}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => onSelectRecent(item)}
                className="inline-flex items-center gap-2 rounded-full border border-white/5 bg-[#09090b] px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400 transition-colors hover:border-rose-500/20 hover:text-white"
              >
                <Clock3 size={11} className="text-rose-500" />
                {item}
              </button>
            ))}
          </div>
        </div>
      )}

      {hasSuggestions ? (
        <div className="space-y-1">
          <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">
            <Search size={12} /> Suggestions
          </div>
          {suggestions.map((item) => (
            <SearchDropdownItem
              key={item.id}
              icon={<Search size={14} className="text-rose-500" />}
              title={item.title}
              subtitle={[item.brand, item.size, item.category].filter(Boolean).join(' • ')}
              onClick={() => onSelectSuggestion(item)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-white/10 bg-white/[0.02] px-4 py-8 text-center text-sm font-medium text-zinc-500">
          {emptyMessage}
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles } from 'lucide-react';
import useSearch from '../hooks/useSearch';
import SearchDropdown from './SearchDropdown';

const toSearchHref = (value) => `/search?q=${encodeURIComponent(value.trim())}`;

export default function SearchBar({ items = [], placeholder = 'Search tyres, brands, or sizes', className = '', compact = false, autoFocus = false }) {
  const navigate = useNavigate();
  const { query, setQuery, suggestions, recentSearches, registerSearch, clearRecentSearches } = useSearch(items);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!autoFocus) return;
    setIsOpen(true);
  }, [autoFocus]);

  const suggestionCount = useMemo(() => suggestions.length, [suggestions]);

  const submitSearch = (value) => {
    const nextValue = value.trim();
    if (!nextValue) return;
    registerSearch(nextValue);
    navigate(toSearchHref(nextValue));
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`.trim()}>
      <div className={`rounded-full border border-white/10 bg-white/[0.05] ${compact ? 'px-4 py-2.5' : 'px-5 py-3'} backdrop-blur-xl transition-all focus-within:border-rose-500/40 focus-within:bg-white/[0.08]`}>
        <form
          className="flex items-center gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            submitSearch(query);
          }}
        >
          <Search size={compact ? 16 : 18} className="shrink-0 text-rose-500" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => {
              window.setTimeout(() => setIsOpen(false), 120);
            }}
            placeholder={placeholder}
            className={`min-w-0 flex-1 bg-transparent text-white outline-none placeholder:text-zinc-600 ${compact ? 'text-sm' : 'text-[15px]'}`}
          />
          <button
            type="submit"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white transition-colors hover:bg-rose-700"
            aria-label="Search"
          >
            <Sparkles size={15} />
          </button>
        </form>
      </div>

      {isOpen && (suggestionCount > 0 || recentSearches.length > 0) && (
        <SearchDropdown
          suggestions={suggestions}
          recentSearches={recentSearches}
          onSelectSuggestion={(item) => submitSearch(item.title || item.name || '')}
          onSelectRecent={submitSearch}
          onClearRecent={clearRecentSearches}
        />
      )}
    </div>
  );
}
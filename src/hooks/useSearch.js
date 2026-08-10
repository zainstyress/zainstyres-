import { useEffect, useMemo, useState } from 'react';

const DEFAULT_STORAGE_KEY = 'zain-tyres-recent-searches';

const normalizeText = (value = '') => value.trim().toLowerCase();

const readStoredSearches = (storageKey) => {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
};

const writeStoredSearches = (storageKey, searches) => {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(searches.slice(0, 8)));
  } catch {
    // Ignore storage failures.
  }
};

export default function useSearch(items = [], { storageKey = DEFAULT_STORAGE_KEY, maxRecent = 6, maxSuggestions = 8 } = {}) {
  const [query, setQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    setRecentSearches(readStoredSearches(storageKey).slice(0, maxRecent));
  }, [maxRecent, storageKey]);

  const suggestions = useMemo(() => {
    const normalizedQuery = normalizeText(query);
    if (!normalizedQuery) return [];

    return items
      .map((item) => ({
        id: item.id,
        title: item.name || item.title || '',
        brand: item.brand || '',
        size: item.size || '',
        price: item.price || 0,
        category: item.category || '',
        description: item.description || '',
      }))
      .filter((item) => `${item.title} ${item.brand} ${item.size} ${item.category} ${item.description}`.toLowerCase().includes(normalizedQuery))
      .slice(0, maxSuggestions);
  }, [items, maxSuggestions, query]);

  const registerSearch = (value) => {
    const nextSearch = normalizeText(value);
    if (!nextSearch) return;

    setQuery(value);
    setRecentSearches((current) => {
      const next = [value.trim(), ...current.filter((item) => normalizeText(item) !== nextSearch)];
      const sliced = next.slice(0, maxRecent);
      writeStoredSearches(storageKey, sliced);
      return sliced;
    });
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(storageKey);
      } catch {
        // Ignore storage failures.
      }
    }
  };

  return {
    query,
    setQuery,
    suggestions,
    recentSearches,
    registerSearch,
    clearRecentSearches,
  };
}
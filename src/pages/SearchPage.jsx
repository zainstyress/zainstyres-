import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, Sparkles } from 'lucide-react';
import TyreCard from '../components/tyres/TyreCard';
import FilterSidebar from '../components/tyres/FilterSidebar';
import SiteNavbar from '../components/Navbar';
import SearchBar from '../components/SearchBar';
import useSearch from '../hooks/useSearch';
import { calculateTyrePricing } from '../lib/tyres';
import { normalizeProductImages } from '../lib/media';

const API = import.meta.env.VITE_API_URL || '';

const initialFilters = {
  category: 'all',
  brand: 'all',
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
};

  const searchCatalog = (tyres, query, filters) => {
  const normalizedQuery = query.trim().toLowerCase();
  const minPrice = Number(filters.minPrice || 0);
  const maxPrice = Number(filters.maxPrice || Number.MAX_SAFE_INTEGER);

  const filtered = tyres.filter((tyre) => {
    const price = calculateTyrePricing(tyre).discountedPrice;
    const matchesQuery = !normalizedQuery || `${tyre.name} ${tyre.brand} ${tyre.size} ${tyre.category} ${tyre.description || ''}`.toLowerCase().includes(normalizedQuery);
    const matchesCategory = filters.category === 'all' || (tyre.category || '').toString().toLowerCase() === filters.category.toString().toLowerCase();
    const matchesBrand = filters.brand === 'all' || tyre.brand === filters.brand;
    const matchesPrice = price >= minPrice && price <= maxPrice;
    return matchesQuery && matchesCategory && matchesBrand && matchesPrice && tyre.isActive !== false;
  });

  if (filters.sort === 'price-asc') {
    return [...filtered].sort((left, right) => calculateTyrePricing(left).discountedPrice - calculateTyrePricing(right).discountedPrice);
  }

  if (filters.sort === 'price-desc') {
    return [...filtered].sort((left, right) => calculateTyrePricing(right).discountedPrice - calculateTyrePricing(left).discountedPrice);
  }

  return [...filtered].sort((left, right) => {
    const leftTime = new Date(left.updatedAt || left.created_at || left.createdAt || 0).getTime();
    const rightTime = new Date(right.updatedAt || right.created_at || right.createdAt || 0).getTime();
    return rightTime - leftTime;
  });
};

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tyres, setTyres] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [loading, setLoading] = useState(true);

  const queryFromParams = searchParams.get('q') || searchParams.get('query') || '';
  const [query, setQuery] = useState(queryFromParams);
  const { suggestions, recentSearches } = useSearch(tyres, { maxRecent: 5, maxSuggestions: 6 });

  useEffect(() => {
    setQuery(queryFromParams);
  }, [queryFromParams]);

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API}/api/products`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data?.error || 'Failed to load products.');
        }

        if (!mounted) return;
        const normalized = Array.isArray(data) ? data.filter((tyre) => tyre.isActive !== false).map((item) => normalizeProductImages(item, API)) : [];
        setTyres(normalized);
      } catch (error) {
        console.error('Search page failed to load products:', error);
        if (!mounted) return;
        setTyres([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchProducts();
    return () => {
      mounted = false;
    };
  }, []);

  const brands = useMemo(() => [...new Set(tyres.map((tyre) => tyre.brand).filter(Boolean))].sort(), [tyres]);
  const results = useMemo(() => searchCatalog(tyres, query, filters), [filters, query, tyres]);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <SiteNavbar cartCount={0} onOpenCart={() => {}} currentView="search" settings={null} user={null} onLogout={() => {}} products={tyres} />
      <div className="mx-auto max-w-7xl space-y-8 px-4 pb-24 pt-28 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.22),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] p-6 sm:p-8 md:p-12">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-rose-300">
              <Sparkles size={13} /> Search results
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">Search tyres and accessories by size, brand, model, or price.</h1>
            <p className="mt-4 max-w-2xl text-base text-zinc-300 md:text-lg">Use live suggestions and your recent searches to jump straight to the right fit.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
              <SearchBar items={tyres} placeholder="Try 205/55R16, Michelin, or SUV tyres" className="w-full" autoFocus />
              <Link to="/shop" className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-black uppercase tracking-[0.25em] text-white transition-colors hover:bg-white/[0.08]">
                Browse shop <ArrowRight size={14} />
              </Link>
            </div>
            {(recentSearches.length > 0 || suggestions.length > 0) && (
              <div className="mt-5 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
                {recentSearches.slice(0, 5).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setQuery(item);
                      setSearchParams({ q: item });
                    }}
                    className="rounded-full border border-white/5 bg-white/[0.03] px-3 py-2 text-zinc-400 transition-colors hover:border-rose-500/20 hover:text-white"
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <FilterSidebar filters={filters} onChange={setFilters} brands={brands} />

          <div className="space-y-6">
            <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3">
                <Search size={18} className="text-zinc-500" />
                <input
                  value={query}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setQuery(nextValue);
                    setSearchParams(nextValue ? { q: nextValue } : {});
                  }}
                  placeholder="Search tyres by brand, model, or size"
                  className="w-full bg-transparent text-white outline-none placeholder:text-zinc-600"
                />
              </div>
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-black text-white">Matching products</h2>
              </div>

              {loading ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-[360px] rounded-[28px] border border-white/5 bg-white/[0.03] animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-3">
                    {results.map((tyre) => <TyreCard key={tyre.id} tyre={tyre} />)}
                  </div>

                  {results.length === 0 && (
                    <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-zinc-400">
                      No products match this search. Try another brand, size, or price range.
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
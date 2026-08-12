import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Search, SlidersHorizontal, Sparkles } from 'lucide-react';
import { calculateTyrePricing } from '../lib/tyres';
import { normalizeProductImages } from '../lib/media';
import TyreCard from '../components/tyres/TyreCard';
import FilterSidebar from '../components/tyres/FilterSidebar';

const API = import.meta.env.VITE_API_URL || '';

const initialFilters = {
  category: 'all',
  brand: 'all',
  minPrice: '',
  maxPrice: '',
  sort: 'newest',
};

export default function TyresShop() {
  const [tyres, setTyres] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [loadingMore] = useState(false);
  const [hasMore] = useState(false);

  const fetchProducts = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API}/api/products`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load products.');
      }

      const normalized = Array.isArray(data) ? data.map((item) => normalizeProductImages(item, API)) : [];
      setTyres(normalized);
      setFeatured(normalized.filter((item) => item.isFeatured || item.featured || Number(item.rating || 0) >= 4.2).slice(0, 6));
    } catch (err) {
      console.error('Failed to load products:', err);
      setTyres([]);
      setFeatured([]);
      setError((err && err.message) || 'Failed to load products. Check console for details.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const brands = useMemo(() => [...new Set(tyres.map((tyre) => tyre.brand).filter(Boolean))].sort(), [tyres]);

  const filteredTyres = useMemo(() => {
    const minPrice = Number(filters.minPrice || 0);
    const maxPrice = Number(filters.maxPrice || Number.MAX_SAFE_INTEGER);
    const normalizedQuery = query.trim().toLowerCase();

    const result = tyres.filter((tyre) => {
      const price = calculateTyrePricing(tyre).discountedPrice;
      const matchesQuery = !normalizedQuery || `${tyre.name} ${tyre.brand} ${tyre.size || ''} ${tyre.category || ''} ${tyre.description || ''}`.toLowerCase().includes(normalizedQuery);
      const matchesCategory = filters.category === 'all' || (tyre.category || '').toString().toLowerCase() === filters.category.toString().toLowerCase();
      const matchesBrand = filters.brand === 'all' || tyre.brand === filters.brand;
      const matchesPrice = price >= minPrice && price <= maxPrice;
      return matchesQuery && matchesCategory && matchesBrand && matchesPrice && tyre.isActive !== false;
    });

    const sorted = [...result];
    if (filters.sort === 'price-asc') {
      return sorted.sort((left, right) => calculateTyrePricing(left).discountedPrice - calculateTyrePricing(right).discountedPrice);
    }
    if (filters.sort === 'price-desc') {
      return sorted.sort((left, right) => calculateTyrePricing(right).discountedPrice - calculateTyrePricing(left).discountedPrice);
    }
    return sorted.sort((left, right) => {
      const leftTime = new Date(left.updatedAt || left.created_at || left.createdAt || 0).getTime();
      const rightTime = new Date(right.updatedAt || right.created_at || right.createdAt || 0).getTime();
      return rightTime - leftTime;
    });
  }, [filters, query, tyres]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(226,75,74,0.18),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] p-8 md:p-12">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(226,75,74,0.18)] bg-[rgba(226,75,74,0.08)] px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] text-[#E24B4A]">
              <Sparkles size={14} /> Live tyre catalog
            </div>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-6xl">Find the right tyre, then checkout with live stock visibility.</h1>
            <p className="mt-4 max-w-2xl text-base text-zinc-300 md:text-lg">Search by size, brand, or price and browse a catalog that updates instantly from Firestore.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="rounded-2xl bg-[#E24B4A] px-5 py-3 text-sm font-semibold text-white hover:bg-[#c43a39]">Browse inventory</Link>
              <Link to="/" className="rounded-2xl border border-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/5">Home</Link>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <FilterSidebar filters={filters} onChange={setFilters} brands={brands} />

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/5 bg-[#1a1a1a] p-5">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3">
                <Search size={18} className="text-zinc-500" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search tyres or accessories by brand, model, size, or code" className="w-full bg-transparent text-white outline-none placeholder:text-zinc-600 focus:border-[#E24B4A] focus:ring-0" />
                <SlidersHorizontal size={18} className="text-zinc-500" />
              </label>
            </div>

            {featured.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-2xl font-black text-white">Featured tyres</h2>
                  <p className="text-sm text-zinc-500">Hand-picked live picks</p>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-3">
                  {featured.map((tyre) => <TyreCard key={tyre.id} tyre={tyre} />)}
                </div>
              </div>
            )}

                <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-2xl font-black text-white">All products</h2>
                <p className="text-sm text-zinc-500">{filteredTyres.length} results</p>
              </div>
              {loading ? (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="h-[360px] rounded-[28px] border border-white/5 bg-[#1a1a1a] animate-pulse" />
                  ))}
                </div>
              ) : error ? (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-[#1a1a1a] p-10 text-center">
                  <p className="text-zinc-300 mb-4">Error: {error}</p>
                  <div className="flex items-center justify-center gap-3">
                    <button onClick={fetchProducts} className="rounded-2xl bg-[#E24B4A] px-4 py-2 text-sm font-semibold text-white">Retry</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-3">
                    {filteredTyres.map((tyre) => <TyreCard key={tyre.id} tyre={tyre} />)}
                  </div>

                  {filteredTyres.length === 0 && <div className="rounded-[28px] border border-dashed border-white/10 bg-[#1a1a1a] p-10 text-center text-zinc-400">No products match the current filters.</div>}

                  {hasMore && (
                    <div className="flex justify-center pt-4">
                      <button
                        type="button"
                        onClick={loadMore}
                        disabled={loadingMore}
                        className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronDown size={16} />
                        {loadingMore ? 'Loading more...' : 'Load more tyres'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

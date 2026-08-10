import React from 'react';

export default function FilterSidebar({ filters, onChange, brands = [] }) {
  return (
    <aside className="rounded-[28px] border border-white/5 bg-[#1a1a1a] p-5">
      <h3 className="text-lg font-black text-white">Filters</h3>
      <div className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Category</span>
          <select value={filters.category} onChange={(e) => onChange({ ...filters, category: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none">
            <option value="all">All</option>
            <option value="car">Car</option>
            <option value="bike">Bike</option>
            <option value="truck">Truck</option>
            <option value="suv">SUV</option>
            <option value="accessories">Accessories</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Brand</span>
          <select value={filters.brand} onChange={(e) => onChange({ ...filters, brand: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none">
            <option value="all">All</option>
            {brands.map((brand) => <option key={brand} value={brand}>{brand}</option>)}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Min Price</span>
          <input type="number" value={filters.minPrice} onChange={(e) => onChange({ ...filters, minPrice: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none" />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Max Price</span>
          <input type="number" value={filters.maxPrice} onChange={(e) => onChange({ ...filters, maxPrice: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none" />
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Sort</span>
          <select value={filters.sort} onChange={(e) => onChange({ ...filters, sort: e.target.value })} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none">
            <option value="newest">Newest first</option>
            <option value="price-asc">Price low to high</option>
            <option value="price-desc">Price high to low</option>
          </select>
        </label>
      </div>
    </aside>
  );
}

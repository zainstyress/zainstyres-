import React from 'react';

export default function StockBadge({ stock }) {
  if (stock <= 0) {
    return <span className="inline-flex rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-rose-300">Out of Stock</span>;
  }

  if (stock <= 5) {
    return <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300">Only {stock} left!</span>;
  }

  return <span className="inline-flex rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">In Stock</span>;
}

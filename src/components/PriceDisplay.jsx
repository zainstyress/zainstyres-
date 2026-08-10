import React from 'react';
import { calculateTyrePricing } from '../lib/tyres';

export default function PriceDisplay({ tyre, className = '' }) {
  const pricing = calculateTyrePricing(tyre);

  return (
    <div className={className}>
      {pricing.hasDiscount ? (
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-4xl font-black text-white">₹{pricing.discountedPrice.toLocaleString('en-IN')}</span>
          <span className="text-lg text-zinc-500 line-through">₹{pricing.originalPrice.toLocaleString('en-IN')}</span>
          <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
            -{pricing.discountPercent}% OFF
          </span>
        </div>
      ) : (
        <span className="text-4xl font-black text-white">₹{pricing.originalPrice.toLocaleString('en-IN')}</span>
      )}
    </div>
  );
}
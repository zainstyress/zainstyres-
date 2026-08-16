import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, Star, ShoppingBag, MessageSquareText } from 'lucide-react';
import StockBadge from './StockBadge';
import { useAuth } from '../../context/AuthContext';
import { useCustomToast } from '../../context/ToastContext';
import { calculateTyrePricing } from '../../lib/tyres';

export default function TyreCard({ tyre }) {
  const { user, API } = useAuth();
  const rawImage = tyre.images?.[tyre.thumbnailIndex || 0] || tyre.images?.[0] || tyre.image;
  const mainImage = rawImage || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=800';
  const pricing = calculateTyrePricing(tyre);
  const navigate = useNavigate();
  const { toast } = useCustomToast();
  const whatsappNumber = '917006628255';
  const addInFlightRef = useRef(false);

  const handleAddToBag = async (event) => {
    if (addInFlightRef.current) return;
    addInFlightRef.current = true;

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    try {
      const stockLimit = Math.max(1, Number(tyre.stock || 1));
      const requestedQty = Math.min(stockLimit, Math.max(1, Number(tyre.qty ?? tyre.quantity ?? 1) || 1));

      // Add to localStorage for checkout (works without login)
      const saved = localStorage.getItem('cartItems') || '[]';
      const cartItems = JSON.parse(saved);
      const existingItem = cartItems.find(item => item.id === tyre.id);
      
      if (existingItem) {
        const nextQty = Math.min(stockLimit, Math.max(1, Number(existingItem.qty || 1)) + requestedQty);
        existingItem.qty = nextQty;
        existingItem.stock = stockLimit;
      } else {
        cartItems.push({
          id: tyre.id,
          name: tyre.name,
          price: pricing.discountedPrice,
          image: tyre.images?.[0] || tyre.image || '',
          qty: requestedQty,
          stock: stockLimit,
        });
      }
      localStorage.setItem('cartItems', JSON.stringify(cartItems));

      // Also sync with backend if user is logged in
      if (user) {
        try {
          await fetch(`${API}/api/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: tyre.id, quantity: requestedQty }),
            credentials: 'include',
          });
        } catch (e) {
          console.error('Backend sync failed', e);
        }
      }

      // Redirect to delivery details page
      navigate('/delivery-details');
    } catch {
      toast.error('Could not add this tyre to your bag.');
    } finally {
      addInFlightRef.current = false;
    }
  };

  const handleBuyNow = async (event) => {
    // Reuse add-to-bag behavior so Buy now matches Add to bag behavior.
    try {
      await handleAddToBag(event);
    } catch (e) {
      // If add fails, fall back to opening WhatsApp to contact seller
      const msg = `Hi Zain's Tyres! I want to buy:\n\n` +
        `*${tyre.name}*\nBrand: ${tyre.brand}\nSize: ${tyre.size}\nPrice: ₹${tyre.price}\n\n` +
        `Please confirm availability.`;

      window.open(
        `https://wa.me/91${whatsappNumber.replace(/^91/, '')}?text=${encodeURIComponent(msg)}`,
        '_blank',
        'noopener,noreferrer',
      );
    }
  };

  return (
    <div className="group min-w-0 overflow-hidden rounded-[28px] border border-white/5 bg-[#1a1a1a] transition-all hover:border-[rgba(226,75,74,0.18)] hover:bg-[#202020]">
      <Link to={`/product/${tyre.id}`} className="block">
        <div className="relative">
          <img src={mainImage} alt={tyre.name} loading="lazy" decoding="async" className="h-36 w-full object-cover md:h-48" />
          <div className="absolute left-4 top-4 flex gap-2">
            <span className="rounded-full border border-white/10 bg-black/60 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white backdrop-blur">{tyre.brand}</span>
            {tyre.isFeatured && <span className="rounded-full border border-[rgba(226,75,74,0.18)] bg-[rgba(226,75,74,0.08)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#E24B4A]">Featured</span>}
          </div>
        </div>
      </Link>

      <div className="space-y-3 p-2 md:space-y-4 md:p-5">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">{tyre.category}</p>
          <Link to={`/product/${tyre.id}`} className="block">
            <h3 className="mt-1 overflow-hidden text-sm font-black text-white transition-colors hover:text-orange-300 md:text-lg [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">{tyre.name}</h3>
          </Link>
          <p className="mt-1 text-xs text-zinc-500 md:text-sm">Size {tyre.size}</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-baseline gap-2">
              {pricing.hasDiscount && (
                <p className="text-xs text-zinc-500 line-through">₹{Number(pricing.originalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              )}
              <p className="text-lg font-black text-[#E24B4A] md:text-2xl">₹{Number(pricing.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="mt-2"><StockBadge stock={tyre.stock} /></div>
          </div>
          <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 md:text-xs">
            <Star size={12} className="fill-yellow-400 text-yellow-400" /> Quality
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={handleAddToBag} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-white transition-colors hover:bg-white/[0.08]">
            <ShoppingBag size={14} /> Add to bag
          </button>
          <button type="button" onClick={handleBuyNow} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.2em] text-emerald-200 transition-colors hover:bg-emerald-500/15">
            <MessageSquareText size={14} /> Buy now
          </button>
        </div>

        <Link to={`/product/${tyre.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-[#E24B4A] transition-colors hover:text-[#c43a39]">
          View details <ChevronRight size={14} />
        </Link>
      </div>
    </div>
  );
}
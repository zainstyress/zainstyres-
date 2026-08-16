import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BadgeCheck, MessageSquareText, ShoppingBag, Plus, Minus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCustomToast } from '../context/ToastContext';
import { calculateTyrePricing, listTyreReviewsPage, normalizeTyre, upsertTyreReview } from '../lib/tyres';
import { normalizeProductImages } from '../lib/media';
import ImageGallery from '../components/ImageGallery';
import PriceDisplay from '../components/PriceDisplay';
import ReviewCard from '../components/ReviewCard';
import ReviewForm from '../components/ReviewForm';
import StarRating from '../components/StarRating';
import StockBadge from '../components/tyres/StockBadge';

const formatCount = (count) => `${Number(count || 0).toLocaleString('en-IN')} review${Number(count || 0) === 1 ? '' : 's'}`;

export default function ProductDetailPage() {
  const { tyreId } = useParams();
  const navigate = useNavigate();
  const { user, API } = useAuth();
  const { toast } = useCustomToast();

  const [tyre, setTyre] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [loadingMoreReviews, setLoadingMoreReviews] = useState(false);
  const [hasMoreReviews, setHasMoreReviews] = useState(true);
  const reviewCursorRef = useRef(null);
  const whatsappNumber = '917006628255';

  useEffect(() => {
    if (!tyreId) return undefined;

    let cancelled = false;
    setLoading(true);
    setNotice('');
    setTyre(null);
    setReviews([]);

    const loadTyre = async () => {
      try {
        const response = await fetch(`${API}/api/products/${tyreId}`);
        if (!response.ok) {
          if (!cancelled) { setTyre(null); setLoading(false); }
          return;
        }
        const data = await response.json();
        const normalized = normalizeProductImages(normalizeTyre(tyreId, data), API);
        if (!cancelled) { setTyre(normalized); setLoading(false); }
      } catch {
        if (!cancelled) { setTyre(null); setLoading(false); }
      }
    };

    loadTyre();

    return () => { cancelled = true; };
  }, [tyreId, API]);

  const loadReviews = useCallback(async ({ reset = false } = {}) => {
    if (!tyreId) return;

    if (reset) {
      setReviews([]);
      reviewCursorRef.current = null;
      setHasMoreReviews(true);
    } else {
      setLoadingMoreReviews(true);
    }

    try {
      const { reviews: nextReviews, lastDoc, hasMore } = await listTyreReviewsPage(tyreId, {
        afterDoc: reset ? null : reviewCursorRef.current,
        pageSize: 10,
      });

      setReviews((current) => (reset ? nextReviews : [...current, ...nextReviews]));
      reviewCursorRef.current = lastDoc;
      setHasMoreReviews(hasMore);
    } finally {
      setLoadingMoreReviews(false);
    }
  }, [tyreId]);

  useEffect(() => {
    loadReviews({ reset: true });
  }, [loadReviews]);

  useEffect(() => {
    setSelectedImage(0);
    setSelectedSize(null);
    setQuantity(1);
  }, [tyre?.id]);

  const pricing = useMemo(() => calculateTyrePricing(tyre || {}), [tyre]);
  const averageRating = useMemo(() => {
    if (reviews.length > 0) {
      const total = reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
      return Number((total / reviews.length).toFixed(1));
    }

    return Number(tyre?.averageRating || 0);
  }, [reviews, tyre?.averageRating]);
  const totalReviews = reviews.length || Number(tyre?.totalReviews || 0);
  const existingReview = reviews.find((review) => review.userId === user?.id) || null;

  const handleAddToBag = async () => {
    if (!tyre || tyre.stock <= 0) {
      setNotice('❌ This product is out of stock.');
      return;
    }

    if (quantity > tyre.stock) {
      setNotice(`❌ Only ${tyre.stock} available in stock.`);
      return;
    }

    setAddLoading(true);
    setNotice('');

    try {
      // Add to localStorage for checkout (works without login)
      const saved = localStorage.getItem('cartItems') || '[]';
      const cartItems = JSON.parse(saved);
      const cartItemId = `${tyre.id}-${selectedSize || 'default'}`;
      const existingItem = cartItems.find(item => item.cartItemId === cartItemId);
      
      if (existingItem) {
        const newQty = (existingItem.qty || 1) + quantity;
        if (newQty > tyre.stock) {
          setNotice(`❌ Cannot add more. Only ${tyre.stock} available in total.`);
          setAddLoading(false);
          return;
        }
        existingItem.qty = newQty;
      } else {
        cartItems.push({
          cartItemId,
          id: tyre.id,
          name: tyre.name,
          price: calculateTyrePricing(tyre).discountedPrice,
          image: tyre.images?.[0] || tyre.image || '',
          size: selectedSize || tyre.size,
          qty: quantity,
        });
      }
      localStorage.setItem('cartItems', JSON.stringify(cartItems));

      // Also sync with backend if user is logged in
      if (user) {
        try {
          await fetch(`${API}/api/cart`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ productId: tyre.id, quantity, size: selectedSize || tyre.size }),
            credentials: 'include',
          });
        } catch (e) {
          console.error('Backend sync failed', e);
        }
      }

      // Reset quantity and show success message
      setQuantity(1);
      setNotice('✓ Added to bag!');
      setTimeout(() => navigate('/delivery-details'), 800);
    } catch (error) {
      console.error('Failed to add tyre to bag', error);
      setNotice('Could not add this tyre to your bag.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleReviewSubmit = async ({ rating, reviewText }) => {
    if (!user || !tyre) return;

    setReviewSubmitting(true);
    setNotice('');

    try {
      await upsertTyreReview({
        tyreId: tyre.id,
        tyreName: tyre.name,
        tyreBrand: tyre.brand,
        userId: user.id,
        userName: user.name || user.displayName || user.email || 'Customer',
        userPhoto: user.photoURL || '',
        rating,
        reviewText,
      });
      setNotice(existingReview ? 'Review updated.' : 'Review posted.');
      await loadReviews({ reset: true });
    } catch (error) {
      console.error('Failed to save review', error);
      setNotice('Could not save your review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleWhatsApp = () => {
    if (!tyre) return;

    const message = encodeURIComponent(
      `Hi, I want to buy ${tyre.name}. Size: ${tyre.size}. Price: ₹${pricing.discountedPrice.toLocaleString('en-IN')}. Please share availability and delivery details.`,
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${message}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 py-10 text-white md:px-6">
        <div className="mx-auto max-w-6xl">
          <div className="h-6 w-44 rounded-full bg-white/10" />
          <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="h-[520px] rounded-[32px] bg-white/[0.04]" />
            <div className="space-y-4 rounded-[32px] border border-white/5 bg-white/[0.03] p-6 md:p-8">
              <div className="h-4 w-28 rounded-full bg-white/10" />
              <div className="h-10 w-3/4 rounded-full bg-white/10" />
              <div className="h-16 w-full rounded-3xl bg-white/10" />
              <div className="h-40 w-full rounded-3xl bg-white/10" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tyre) {
    return (
      <div className="min-h-screen bg-[#050505] px-4 py-10 text-white md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col items-start gap-4 rounded-[32px] border border-white/5 bg-white/[0.03] p-8">
          <p className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Tyre not found</p>
          <h1 className="text-3xl font-black text-white">This product is no longer available.</h1>
          <Link to="/tyres" className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
            <ArrowLeft size={16} />
            Back to tyres
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link to="/tyres" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white">
            <ArrowLeft size={16} />
            Back to shop
          </Link>
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
            <BadgeCheck size={14} className="text-emerald-400" />
            Live product details
          </div>
        </div>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div className="space-y-8">
            <ImageGallery images={tyre.images} activeIndex={selectedImage} onSelect={setSelectedImage} />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Rating</p>
                <div className="mt-3 flex items-center gap-3">
                  <StarRating value={averageRating} readOnly size={20} />
                  <span className="text-lg font-black text-white">{averageRating.toFixed(1)}</span>
                </div>
                <p className="mt-2 text-sm text-zinc-400">{formatCount(totalReviews)}</p>
              </div>

              <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Stock</p>
                <div className="mt-3">
                  <StockBadge stock={tyre.stock} />
                </div>
                <p className="mt-2 text-sm text-zinc-400">{tyre.stock > 0 ? `Only ${tyre.stock} left in stock.` : 'Sold out for now.'}</p>
              </div>

              <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Discount</p>
                <div className="mt-3 text-2xl font-black text-white">
                  {pricing.hasDiscount ? `-${pricing.discountPercent}%` : 'No discount'}
                </div>
                <p className="mt-2 text-sm text-zinc-400">Live pricing from Firestore.</p>
              </div>

              <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Category</p>
                <p className="mt-3 text-2xl font-black text-white capitalize">{tyre.category}</p>
                <p className="mt-2 text-sm text-zinc-400">Size {tyre.size}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/5 bg-white/[0.03] p-6 md:p-8 lg:sticky lg:top-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-black/50 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-white">{tyre.brand}</span>
              {tyre.isFeatured && (
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.3em] text-orange-300">
                  Featured
                </span>
              )}
            </div>

            <h1 className="mt-4 text-4xl font-black leading-tight text-white md:text-5xl">{tyre.name}</h1>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{tyre.description || 'Premium tyre engineered for grip, durability, and road confidence.'}</p>

            <div className="mt-6">
              <PriceDisplay tyre={tyre} />
            </div>

            <div className="mt-6 space-y-4">
              {/* Size Selection */}
              {(tyre.sizes && tyre.sizes.length > 0) && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <label className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Select Size</label>
                  <select
                    value={selectedSize || ''}
                    onChange={(e) => setSelectedSize(e.target.value || null)}
                    className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white placeholder-zinc-400 outline-none transition-colors focus:border-rose-500/50 focus:bg-white/10"
                  >
                    <option value="">Choose a size...</option>
                    {tyre.sizes.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                <label className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Quantity</label>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1 || tyre.stock <= 0}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max={Math.max(1, tyre.stock || 0)}
                    value={quantity}
                    onChange={(e) => {
                      let inputValue = parseInt(e.target.value);
                      // If invalid input, default to 1
                      if (isNaN(inputValue) || inputValue < 1) {
                        inputValue = 1;
                      }
                      // Clamp to available stock
                      const maxStock = Math.max(1, tyre.stock || 0);
                      const clampedValue = Math.min(inputValue, maxStock);
                      setQuantity(clampedValue);
                    }}
                    onBlur={(e) => {
                      // Ensure value is within bounds on blur
                      let inputValue = parseInt(e.target.value);
                      if (isNaN(inputValue) || inputValue < 1) {
                        setQuantity(1);
                        return;
                      }
                      const maxStock = Math.max(1, tyre.stock || 0);
                      if (inputValue > maxStock) {
                        setQuantity(maxStock);
                      }
                    }}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-bold text-white outline-none transition-colors focus:border-rose-500/50 focus:bg-white/10"
                  />
                  <button
                    type="button"
                    onClick={() => setQuantity(Math.min(Math.max(1, tyre.stock || 0), quantity + 1))}
                    disabled={quantity >= (tyre.stock || 0) || tyre.stock <= 0}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-zinc-300 transition-colors hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                {tyre.stock <= 0 && (
                  <p className="mt-2 text-xs text-red-400">🔴 Out of stock</p>
                )}
                {tyre.stock > 0 && tyre.stock <= 5 && (
                  <p className="mt-2 text-xs text-amber-300">⚠️ Only {tyre.stock} left in stock</p>
                )}
              </div>

              {/* Price Summary */}
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-200">Total: {quantity} x ₹{Number(pricing.discountedPrice).toLocaleString('en-IN')}</span>
                  <span className="text-xl font-black text-rose-300">₹{Number(pricing.discountedPrice * quantity).toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                disabled={tyre.stock <= 0}
                onClick={async () => {
                  // Add product to cart with selected size and quantity, then go to checkout
                  try {
                    if (!tyre || tyre.stock <= 0) {
                      setNotice('❌ This product is out of stock.');
                      return;
                    }

                    if (quantity > tyre.stock) {
                      setNotice(`❌ Only ${tyre.stock} available in stock.`);
                      return;
                    }

                    const stockLimit = Math.max(1, Number(tyre.stock || 1));
                    const requestedQty = Math.min(stockLimit, Math.max(1, Number(quantity) || 1));
                    const saved = localStorage.getItem('cartItems') || '[]';
                    const cartItems = JSON.parse(saved);
                    const cartItemId = `${tyre.id}-${selectedSize || 'default'}`;
                    const existingItem = cartItems.find(item => item.cartItemId === cartItemId);
                    
                    if (existingItem) {
                      const newQty = Math.min(stockLimit, Math.max(1, Number(existingItem.qty || 1)) + requestedQty);
                      if (newQty > tyre.stock) {
                        setNotice(`❌ Cannot add more. Only ${tyre.stock} available in total.`);
                        return;
                      }
                      existingItem.qty = newQty;
                      existingItem.stock = stockLimit;
                    } else {
                      cartItems.push({
                        cartItemId,
                        id: tyre.id,
                        name: tyre.name,
                        price: calculateTyrePricing(tyre).discountedPrice,
                        image: tyre.images?.[0] || tyre.image || '',
                        size: selectedSize || tyre.size,
                        qty: requestedQty,
                        stock: stockLimit,
                      });
                    }
                    localStorage.setItem('cartItems', JSON.stringify(cartItems));

                    if (user) {
                      try {
                        await fetch(`${API}/api/cart`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ productId: tyre.id, quantity: requestedQty, size: selectedSize || tyre.size }),
                          credentials: 'include',
                        });
                      } catch (e) {
                        console.error('Backend sync failed', e);
                      }
                    }

                    navigate('/checkout');
                  } catch (err) {
                    console.error('Buy now failed', err);
                    setNotice('Could not proceed to checkout. Please try again.');
                  }
                }}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.25em] transition-transform ${
                  tyre.stock <= 0
                    ? 'bg-zinc-600 text-zinc-300 cursor-not-allowed opacity-50'
                    : 'bg-white text-black hover:scale-[1.01]'
                }`}
              >
                <ShoppingBag size={16} />
                {tyre.stock <= 0 ? 'Sold Out' : 'Buy now'}
              </button>

              <button
                type="button"
                onClick={handleAddToBag}
                disabled={addLoading || tyre.stock <= 0}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black uppercase tracking-[0.25em] transition-colors ${
                  tyre.stock <= 0
                    ? 'border border-zinc-600/20 bg-zinc-600/10 text-zinc-300 cursor-not-allowed opacity-50'
                    : 'border border-rose-500/20 bg-rose-500/10 text-rose-200 hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50'
                }`}
              >
                <ShoppingBag size={16} />
                {tyre.stock <= 0 ? 'Sold Out' : addLoading ? 'Adding...' : 'Add to bag'}
              </button>
            </div>

            <button
              type="button"
              onClick={handleWhatsApp}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm font-black uppercase tracking-[0.25em] text-emerald-200 transition-colors hover:bg-emerald-500/15"
            >
              <MessageSquareText size={16} />
              Buy on WhatsApp
            </button>

            {notice && <p className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200">{notice}</p>}

            <div className="mt-8 rounded-[28px] border border-white/5 bg-black/30 p-5">
              <h2 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-500">Specifications</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  ['Width', tyre.specifications?.width],
                  ['Aspect Ratio', tyre.specifications?.aspectRatio],
                  ['Rim Diameter', tyre.specifications?.rimDiameter],
                  ['Load Index', tyre.specifications?.loadIndex],
                  ['Speed Rating', tyre.specifications?.speedRating],
                  ['Tyre Type', tyre.specifications?.tyreType],
                  ['Warranty', tyre.specifications?.warranty],
                  ['Price', `₹${pricing.discountedPrice.toLocaleString('en-IN')}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{label}</p>
                    <p className="mt-2 text-sm font-semibold text-white">{value || 'Not specified'}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <ReviewForm user={user} existingReview={existingReview} onSubmit={handleReviewSubmit} submitting={reviewSubmitting} />

          <div className="rounded-[32px] border border-white/5 bg-white/[0.03] p-6 md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-white">Customer reviews</h2>
                <p className="mt-1 text-sm text-zinc-400">Real feedback from tyre buyers.</p>
              </div>
              <div className="rounded-full border border-white/10 bg-black/50 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-zinc-300">
                {formatCount(totalReviews)}
              </div>
            </div>

            <div className="mt-6 space-y-4">
              {reviews.length > 0 ? (
                reviews.map((review) => <ReviewCard key={review.id} review={review} />)
              ) : (
                <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 p-8 text-center">
                  <p className="text-sm font-semibold text-white">No reviews yet.</p>
                  <p className="mt-2 text-sm text-zinc-400">Be the first to review this tyre.</p>
                </div>
              )}
            </div>

            {hasMoreReviews && reviews.length > 0 && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => loadReviews()}
                  disabled={loadingMoreReviews}
                  className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loadingMoreReviews ? 'Loading more...' : 'Load more reviews'}
                </button>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Minus, Plus, Trash2 } from 'lucide-react';

const STATES = [
  'Maharashtra',
  'Delhi',
  'Karnataka',
  'Tamil Nadu',
  'Gujarat',
  'Uttar Pradesh',
  'West Bengal',
  'Punjab',
  'Haryana',
  'Rajasthan',
  'Bihar',
  'Jharkhand',
  'Odisha',
  'Telangana',
  'Andhra Pradesh',
  'Madhya Pradesh',
  'Uttarakhand',
  'Himachal Pradesh',
  'Punjab',
  'Jammu and Kashmir',
];

function readSavedCart() {
  try {
    const raw = localStorage.getItem('cartItems') || '[]';
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map((item) => ({
            id: item.id || item.productId || item._id,
            name: item.name || item.title || 'Item',
            image: item.image || item.imageUrl || item.images?.[0] || '',
            price: Number(item.price || item.unitPrice || 0),
            qty: Number(item.qty || item.quantity || 1),
          }))
          .filter((item) => item.id && item.price > 0 && item.qty > 0)
      : [];
  } catch {
    return [];
  }
}

function readSavedDeliveryDetails() {
  try {
    const raw = sessionStorage.getItem('deliveryDetails') || null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function DeliveryDetailsPage() {
  const navigate = useNavigate();
  const [cart, setCart] = useState(readSavedCart);
  const [errorMessage, setErrorMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState(() => {
    const saved = readSavedDeliveryDetails();
    return saved || {
      fullName: '',
      phone: '',
      address1: '',
      address2: '',
      city: '',
      state: STATES[0],
      pin: '',
    };
  });

  useEffect(() => {
    if (cart.length === 0) {
      navigate('/tyres');
    }
  }, [cart.length, navigate]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const tax = useMemo(() => Math.round(subtotal * 0.18), [subtotal]);
  const total = subtotal + tax;

  const updateCartQty = (itemId, nextQty) => {
    const updated = cart.map((item) => {
      if (item.id !== itemId) return item;
      const stockLimit = Number(item.stock || item.productStock || 1);
      const newQty = Math.min(stockLimit, Math.max(1, Number(nextQty) || 1));
      return { ...item, qty: newQty };
    }).filter((item) => item.qty > 0);

    setCart(updated);
    localStorage.setItem('cartItems', JSON.stringify(updated));
  };

  const removeCartItem = (itemId) => {
    const updated = cart.filter((item) => item.id !== itemId);
    setCart(updated);
    localStorage.setItem('cartItems', JSON.stringify(updated));
  };

  const validateForm = () => {
    if (!formData.fullName.trim()) return 'Full name is required.';
    if (!/^[0-9]{10}$/.test(formData.phone.trim())) return 'Enter a valid 10-digit mobile number.';
    if (!formData.address1.trim()) return 'Address line 1 is required.';
    if (!formData.city.trim()) return 'City is required.';
    if (!formData.state.trim()) return 'State is required.';
    if (!formData.pin.trim() || !/^[0-9]{6}$/.test(formData.pin.trim())) return 'Enter a valid 6-digit pincode.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    const validationError = validateForm();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    setSubmitting(true);

    // Save delivery details to sessionStorage
    sessionStorage.setItem('deliveryDetails', JSON.stringify(formData));

    // Redirect to checkout with the delivery details and cart
    navigate('/checkout');
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleBack = () => {
    // Save form data before going back
    sessionStorage.setItem('deliveryDetails', JSON.stringify(formData));
    navigate(-1);
  };

  if (cart.length === 0) {
    return null; // Will redirect via useEffect
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-12 flex items-center gap-4">
          <button
            onClick={handleBack}
            className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-rose-500">Fast Checkout</p>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Enter Delivery Details</h1>
          </div>
        </div>

        {/* Layout: Form + Cart Summary */}
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl md:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Full Name */}
                <div>
                  <label htmlFor="fullName" className="block text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-zinc-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                {/* Mobile Number */}
                <div>
                  <label htmlFor="phone" className="block text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
                    Mobile Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    maxLength="10"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-zinc-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                {/* Address Line 1 */}
                <div>
                  <label htmlFor="address1" className="block text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
                    Address Line 1
                  </label>
                  <input
                    type="text"
                    id="address1"
                    value={formData.address1}
                    onChange={(e) => handleInputChange('address1', e.target.value)}
                    placeholder="House number, building name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-zinc-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                {/* Address Line 2 */}
                <div>
                  <label htmlFor="address2" className="block text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
                    Address Line 2 (Optional)
                  </label>
                  <input
                    type="text"
                    id="address2"
                    value={formData.address2}
                    onChange={(e) => handleInputChange('address2', e.target.value)}
                    placeholder="Road name, landmark, apartment number"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-zinc-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                {/* City */}
                <div>
                  <label htmlFor="city" className="block text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
                    City
                  </label>
                  <input
                    type="text"
                    id="city"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="City name"
                    className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-zinc-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                </div>

                {/* State and Pincode */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="state" className="block text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
                      State
                    </label>
                    <select
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    >
                      {STATES.map((state) => (
                        <option key={state} value={state} className="bg-zinc-900">
                          {state}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="pin" className="block text-xs font-black uppercase tracking-[0.3em] text-zinc-400 mb-2">
                      Pincode
                    </label>
                    <input
                      type="text"
                      id="pin"
                      value={formData.pin}
                      onChange={(e) => handleInputChange('pin', e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="6-digit pincode"
                      maxLength="6"
                      className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white placeholder-zinc-600 focus:border-rose-500/50 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                    />
                  </div>
                </div>

                {/* Error Message */}
                {errorMessage && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                    {errorMessage}
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-[2rem] bg-white hover:bg-zinc-200 text-black py-4 font-black text-lg italic tracking-tighter shadow-2xl transition-all disabled:opacity-50 disabled:cursor-not-allowed text-center"
                >
                  {submitting ? 'Processing...' : 'Continue to Order Summary'}
                </button>
              </form>
            </section>
          </div>

          {/* Cart Summary Section */}
          <div className="lg:col-span-1">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl sticky top-6">
              <h2 className="text-lg font-black italic tracking-tighter text-white uppercase mb-6">Order Summary</h2>

              {/* Products */}
              <div className="space-y-4 mb-6 pb-6 border-b border-white/5">
                {cart.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="w-16 h-16 shrink-0 rounded-xl overflow-hidden bg-zinc-900 border border-white/5">
                      <img src={item.image} alt={item.name} loading="lazy" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-black text-white uppercase italic tracking-tight line-clamp-2">{item.name}</h3>
                      <p className="text-rose-500 font-black text-xs mt-1">₹{item.price.toLocaleString('en-IN')}</p>

                      {/* Qty Control */}
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center bg-zinc-900 rounded-lg border border-white/5 p-1">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, item.qty - 1)}
                            className="w-6 h-6 flex items-center justify-center text-white font-black text-xs hover:bg-white/10 rounded"
                          >
                            −
                          </button>
                          <span className="w-6 text-center text-xs font-black text-white">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, item.qty + 1)}
                            className="w-6 h-6 flex items-center justify-center text-white font-black text-xs hover:bg-white/10 rounded"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeCartItem(item.id)}
                          className="text-zinc-600 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-zinc-400">
                  <span>Subtotal</span>
                  <span className="font-semibold">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Tax (18%)</span>
                  <span className="font-semibold">₹{tax.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between pt-3 border-t border-white/5">
                  <span className="font-black text-white">Total</span>
                  <span className="font-black text-2xl text-rose-500">₹{total.toLocaleString('en-IN')}</span>
                </div>
              </div>

              {/* Info Badge */}
              <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">
                  Free delivery available for orders above ₹2,000
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

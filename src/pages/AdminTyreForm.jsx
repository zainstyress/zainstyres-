import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { saveTyre, createTyre, listenTyre, calculateTyrePricing } from '../lib/tyres';
import { useAuth } from '../context/AuthContext';

const emptyForm = {
  name: '',
  brand: '',
  category: 'car',
  size: '',
  price: '',
  stock: '',
  discountPercent: '',
  description: '',
  images: '',
  isFeatured: false,
  isActive: true,
  width: '',
  aspectRatio: '',
  rimDiameter: '',
  loadIndex: '',
  speedRating: '',
  tyreType: 'tubeless',
  warranty: '',
};

export default function AdminTyreForm() {
  const { tyreId } = useParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [loadingTyre, setLoadingTyre] = useState(!!tyreId);
  const [notice, setNotice] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (!loading && user?.role !== 'admin') {
      navigate('/login');
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    if (!tyreId) {
      setLoadingTyre(false);
      return undefined;
    }

    setLoadingTyre(true);
    const unsubscribe = listenTyre(tyreId, (nextTyre) => {
      if (nextTyre) {
        setForm({
          name: nextTyre.name || '',
          brand: nextTyre.brand || '',
          category: nextTyre.category || 'car',
          size: nextTyre.size || '',
          price: nextTyre.price || '',
          stock: nextTyre.stock || '',
          discountPercent: nextTyre.discountPercent || '',
          description: nextTyre.description || '',
          images: (nextTyre.images || []).join(', '),
          isFeatured: !!nextTyre.isFeatured,
          isActive: nextTyre.isActive !== false,
          width: nextTyre.specifications?.width || '',
          aspectRatio: nextTyre.specifications?.aspectRatio || '',
          rimDiameter: nextTyre.specifications?.rimDiameter || '',
          loadIndex: nextTyre.specifications?.loadIndex || '',
          speedRating: nextTyre.specifications?.speedRating || '',
          tyreType: nextTyre.specifications?.tyreType || 'tubeless',
          warranty: nextTyre.specifications?.warranty || '',
        });
      }
      setLoadingTyre(false);
    });

    return () => unsubscribe();
  }, [tyreId]);

  const pricing = useMemo(() => {
    return calculateTyrePricing({
      price: Number(form.price || 0),
      discountPercent: Number(form.discountPercent || 0),
    });
  }, [form.discountPercent, form.price]);

  const handleChange = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setNotice('');

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      category: form.category,
      size: form.size.trim(),
      price: Number(form.price || 0),
      stock: Number(form.stock || 0),
      discountPercent: Number(form.discountPercent || 0),
      description: form.description.trim(),
      images: form.images
        .split(',')
        .map((image) => image.trim())
        .filter(Boolean),
      isFeatured: !!form.isFeatured,
      isActive: !!form.isActive,
      specifications: {
        width: form.width.trim(),
        aspectRatio: form.aspectRatio.trim(),
        rimDiameter: form.rimDiameter.trim(),
        loadIndex: form.loadIndex.trim(),
        speedRating: form.speedRating.trim(),
        tyreType: form.tyreType,
        warranty: form.warranty.trim(),
      },
    };

    try {
      if (tyreId) {
        await saveTyre(tyreId, payload);
      } else {
        const newTyreId = await createTyre(payload);
        navigate(`/product/${newTyreId}`);
        return;
      }

      setNotice('Tyre saved successfully.');
    } catch (error) {
      console.error('Failed to save tyre', error);
      setNotice('Could not save tyre. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || loadingTyre || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#050505] px-4 py-10 text-white md:px-6">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/5 bg-white/[0.03] p-8">
          <p className="text-sm text-zinc-400">Loading tyre editor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-6 text-white md:px-6 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Admin tools</p>
            <h1 className="mt-2 text-3xl font-black text-white">{tyreId ? 'Edit tyre' : 'Create tyre'}</h1>
          </div>
          <Link to="/admin" className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]">
            Back to admin
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-6 rounded-[32px] border border-white/5 bg-white/[0.03] p-6 md:p-8">
            <div className="grid gap-4 md:grid-cols-2">
              {[
                ['name', 'Tyre name'],
                ['brand', 'Brand'],
                ['size', 'Size'],
                ['price', 'Price'],
                ['stock', 'Stock'],
                ['discountPercent', 'Discount %'],
              ].map(([field, label]) => (
                <label key={field} className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{label}</span>
                  <input
                    value={form[field]}
                    onChange={(event) => handleChange(field, event.target.value)}
                    type={field === 'price' || field === 'stock' || field === 'discountPercent' ? 'number' : 'text'}
                    min={field === 'discountPercent' ? 0 : undefined}
                    max={field === 'discountPercent' ? 90 : undefined}
                    className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
                    placeholder={label}
                  />
                </label>
              ))}
            </div>
            <label className="space-y-2 block">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Category</span>
              <select
                value={form.category}
                onChange={(event) => handleChange('category', event.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none focus:border-rose-500/50"
              >
                <option value="car">Car</option>
                <option value="bike">Bike</option>
                <option value="suv">SUV</option>
                <option value="truck">Truck</option>
                <option value="accessories">Accessories</option>
              </select>
            </label>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Price preview</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-2xl font-black text-white">₹{pricing.discountedPrice.toLocaleString('en-IN')}</span>
                {pricing.hasDiscount && (
                  <span className="text-sm text-zinc-500 line-through">₹{pricing.originalPrice.toLocaleString('en-IN')}</span>
                )}
              </div>
              {pricing.hasDiscount ? (
                <p className="mt-2 text-sm text-emerald-300">Save {pricing.discountPercent}% instantly</p>
              ) : (
                <p className="mt-2 text-sm text-zinc-400">No discount applied yet</p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              className="text-sm font-semibold uppercase tracking-[0.25em] text-rose-300 hover:text-rose-100"
            >
              {showAdvanced ? 'Hide extra product details' : 'Show extra product details'}
            </button>

            {showAdvanced && (
              <div className="space-y-4 rounded-[32px] border border-white/5 bg-white/[0.03] p-6">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Additional details</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {[
                    ['width', 'Width'],
                    ['aspectRatio', 'Aspect ratio'],
                    ['rimDiameter', 'Rim diameter'],
                    ['loadIndex', 'Load index'],
                    ['speedRating', 'Speed rating'],
                    ['warranty', 'Warranty'],
                  ].map(([field, label]) => (
                    <label key={field} className="space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{label}</span>
                      <input
                        value={form[field]}
                        onChange={(event) => handleChange(field, event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
                        placeholder={label}
                      />
                    </label>
                  ))}
                </div>

                <label className="space-y-2 block">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Tyre type</span>
                  <select
                    value={form.tyreType}
                    onChange={(event) => handleChange('tyreType', event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none focus:border-rose-500/50"
                  >
                    <option value="tubeless">Tubeless</option>
                    <option value="tube">Tube</option>
                    <option value="runflat">Run Flat</option>
                    <option value="performance">Performance</option>
                  </select>
                </label>
              </div>
            )}

            <label className="space-y-2 block">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Description</span>
              <textarea
                value={form.description}
                onChange={(event) => handleChange('description', event.target.value)}
                rows={5}
                className="w-full rounded-3xl border border-white/10 bg-[#09090b] px-4 py-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
                placeholder="Product description"
              />
            </label>

            <label className="space-y-2 block">
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Image URLs, comma separated</span>
              <textarea
                value={form.images}
                onChange={(event) => handleChange('images', event.target.value)}
                rows={3}
                className="w-full rounded-3xl border border-white/10 bg-[#09090b] px-4 py-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
                placeholder="https://... , https://..."
              />
            </label>

            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                <input type="checkbox" checked={form.isFeatured} onChange={(event) => handleChange('isFeatured', event.target.checked)} />
                Featured tyre
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white">
                <input type="checkbox" checked={form.isActive} onChange={(event) => handleChange('isActive', event.target.checked)} />
                Active
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.25em] text-black transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : tyreId ? 'Save tyre' : 'Create tyre'}
            </button>

            {notice && <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-200">{notice}</p>}
          </div>

          <div className="space-y-6 rounded-[32px] border border-white/5 bg-white/[0.03] p-6 md:p-8 lg:sticky lg:top-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Live preview</p>
              <h2 className="mt-2 text-2xl font-black text-white">{form.name || 'Tyre name'}</h2>
              <p className="mt-1 text-sm text-zinc-400">{form.brand || 'Brand'}</p>
            </div>

            <div className="rounded-[28px] border border-white/5 bg-black/30 p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Discount preview</p>
              <div className="mt-3 text-3xl font-black text-white">
                ₹{pricing.discountedPrice.toLocaleString('en-IN')}
              </div>
              <div className="mt-2 text-sm text-zinc-400">
                {pricing.hasDiscount ? (
                  <>
                    Original ₹{pricing.originalPrice.toLocaleString('en-IN')} - {pricing.discountPercent}% off
                  </>
                ) : (
                  'No discount applied'
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['Price', `₹${Number(form.price || 0).toLocaleString('en-IN')}`],
                ['Discount', form.discountPercent ? `${form.discountPercent}%` : '0%'],
                ['Stock', form.stock || '0'],
                ['Active', form.isActive ? 'Yes' : 'No'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{label}</p>
                  <p className="mt-2 text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[28px] border border-white/5 bg-black/30 p-5 text-sm leading-7 text-zinc-300">
              <p className="font-semibold text-white">What this form saves</p>
              <p className="mt-2">
                The discount percent is stored directly on the tyre record, so the storefront can calculate pricing live without relying on a separate discount field.
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
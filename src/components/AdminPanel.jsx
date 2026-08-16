import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import {
  Plus, Trash2, Package, DollarSign, BarChart3, Users, LogOut,
  TrendingUp, X, Save, Search, MapPin, Smartphone, Clock, Settings,
  Edit3, Check, ShoppingBag, Car, Globe, Link, Camera, Menu
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CameraModal from './CameraModal';
import { db } from '../firebase';
import { resolveImageUrl } from '../lib/media';

const API = import.meta.env.VITE_API_URL || ''; // Backend base URL from env

const MAX_IMAGES = 10;

function normalizeOrderStatus(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (!raw) return 'pending';
  if (['pending', 'placed', 'order placed', 'processing', 'packed'].includes(raw)) return 'pending';
  if (['confirmed', 'paid', 'success'].includes(raw)) return 'confirmed';
  if (['dispatched', 'shipped', 'out for delivery', 'delivered'].includes(raw)) return 'dispatched';
  return raw;
}

function formatOrderStatus(value) {
  const normalized = normalizeOrderStatus(value);
  if (normalized === 'confirmed') return 'Confirmed';
  if (normalized === 'dispatched') return 'Dispatched';
  return 'Pending';
}

function compressImageFile(file, maxWidth = 800, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      image.onerror = () => reject(new Error('Failed to load image for compression'));
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ─── Input Helper ─────────────────────────────────────────────────────────────
const Field = ({ label, value, onChange, type = 'text', placeholder = '', disabled = false, as = 'input', rows = 3, children }) => (
  <div>
    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">{label}</label>
    {as === 'select' ? (
      <select value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:outline-none focus:border-rose-500/50 appearance-none disabled:opacity-40">
        {children}
      </select>
    ) : as === 'textarea' ? (
      <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
        className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 resize-none" />
    ) : (
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled}
        className="w-full bg-zinc-800/60 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder:text-zinc-600 focus:outline-none focus:border-rose-500/50 disabled:opacity-40" />
    )}
  </div>
);

// ─── Add / Edit Product Modal ─────────────────────────────────────────────────
const ProductModal = ({ initial, onClose, onSave }) => {
  const blank = { name: '', brand: '', category: 'Tyres', subType: 'New', price: '', discountPercent: '0', stock: '', rating: '4.5', condition: 'New', description: '', image: '', images: [], vehicle: '' };
  const [form, setForm] = useState(initial ? { ...initial, vehicle: (initial.vehicle || []).join(', '), images: initial.images || [], discountPercent: initial.discountPercent ?? '0' } : blank);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);

  function set(key) { return v => setForm(p => ({ ...p, [key]: v })); }

  async function uploadCompressedFiles(files) {
    const remainingSlots = MAX_IMAGES - (form.images?.length || 0);
    if (remainingSlots <= 0) {
      setError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      for (const file of filesToUpload) {
        const compressed = await compressImageFile(file);
        formData.append('images', compressed);
      }

      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const resolvedUrls = (data.urls || []).map((u) => resolveImageUrl(u, API));

      setForm((current) => {
        const newImages = [...(current.images || []), ...resolvedUrls].slice(0, MAX_IMAGES);
        return { ...current, images: newImages, image: newImages[0] || '' };
      });
    } catch (err) {
      setError(`Image upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    await uploadCompressedFiles(files);
    e.target.value = '';
  }

  async function handlePhotosCapture(files) {
    await uploadCompressedFiles(files);
  }


  async function handleSave() {
    if (!form.name || !form.brand || !form.price) { setError('Name, brand, price required.'); return; }
    setLoading(true);
    const payload = {
      ...form,
      price: parseFloat(form.price) || 0,
      discountPercent: parseFloat(form.discountPercent) || 0,
      stock: parseInt(form.stock) || 0,
      rating: parseFloat(form.rating) || 4.0,
      vehicle: form.vehicle.split(',').map(s => s.trim()).filter(Boolean),
    };
    try {
      const url = initial ? `${API}/api/products/${initial.id}` : `${API}/api/products`;
      const method = initial ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSave(data, !!initial);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">
            {initial ? 'Edit' : 'Add'} <span className="text-rose-500">Product</span>
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-zinc-500 hover:text-white"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2"><Field label="Product Name *" value={form.name} onChange={set('name')} placeholder="e.g. Michelin Pilot Sport 4S" /></div>
          <Field label="Brand *" value={form.brand} onChange={set('brand')} placeholder="e.g. Michelin" />
          <Field label="Category" value={form.category} onChange={set('category')} as="select">
            <option>Tyres</option><option>Accessories</option>
          </Field>
          <Field label="Sub Type" value={form.subType} onChange={set('subType')} as="select">
            <option>New</option><option>Used</option>
          </Field>
          <Field label="Condition" value={form.condition} onChange={set('condition')} placeholder="e.g. New, Used - 90% Tread" />
          <Field label="Price (₹) *" value={form.price} onChange={set('price')} type="number" placeholder="e.g. 12500" />
          <Field label="Discount %" value={form.discountPercent} onChange={set('discountPercent')} type="number" placeholder="0 to 90" />
          <Field label="Stock" value={form.stock} onChange={set('stock')} type="number" placeholder="e.g. 20" />
          <Field label="Rating (1-5)" value={form.rating} onChange={set('rating')} type="number" placeholder="4.5" />
          <div className="md:col-span-2 mt-4 pt-4 border-t border-white/5">
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">Product Photos (Multi-Select)</label>
            <div className="flex flex-wrap gap-3 mb-3">
              <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-800/60 px-4 py-3 text-sm font-bold text-white hover:bg-white/5">
                <Plus size={16} /> Upload Images
                <input type="file" multiple accept="image/*" onChange={handleFileUpload} disabled={uploading} className="hidden" />
              </label>
              <button type="button" onClick={() => setCameraOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-zinc-800/60 px-4 py-3 text-sm font-bold text-white hover:bg-white/5">
                <Camera size={16} /> Take Photo
              </button>
            </div>
            <div className="bg-zinc-800 border border-dashed border-white/20 hover:border-rose-500/50 transition-colors rounded-2xl p-4 flex flex-col items-center justify-center relative cursor-pointer min-h-[120px]">
              {uploading ? (
                <p className="text-sm font-bold text-rose-500 animate-pulse">Uploading files...</p>
              ) : (
                <div className="text-center">
                  <p className="text-sm font-bold text-white mb-1">Click Upload Images or Take Photo</p>
                  <p className="text-xs text-zinc-500">Supported: JPG, PNG, WEBP (Max 10 files)</p>
                </div>
              )}
            </div>
            
            {form.images && form.images.length > 0 && (
              <div className="flex gap-4 mt-4 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                {form.images.map((imgUrl, idx) => (
                  <div key={idx} className="relative w-24 h-24 bg-zinc-900 rounded-2xl flex-shrink-0 overflow-hidden border border-white/10 group">
                    <img src={imgUrl} alt={`Preview ${idx+1}`} loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.target.src='https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400'; }} />
                    {idx === 0 && <span className="absolute top-1 left-1 bg-rose-600 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">Cover</span>}
                    <button onClick={() => setForm(p => ({ ...p, images: p.images.filter((_, i) => i !== idx), image: idx === 0 ? p.images[1] || '' : p.image }))} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-rose-500"><X size={20} /></button>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4">
               <Field label="Or paste Direct Image URL (Fallback)" value={form.image} onChange={v => { set('image')(v); setForm(p => ({...p, images: p.images.length ? p.images : [v]})) }} placeholder="https://..." />
            </div>
          </div>
          <div className="md:col-span-2"><Field label="Compatible Vehicles (comma separated)" value={form.vehicle} onChange={set('vehicle')} placeholder="Swift, Creta, City" /></div>
          <div className="md:col-span-2">
            <Field label="Detailed Product Description" value={form.description} onChange={set('description')} as="textarea" rows={6} placeholder="Craft a profound description highlighting the premium features of this product..." />
          </div>
        </div>

        {error && <p className="mt-4 text-red-400 text-xs font-bold px-4 py-3 bg-red-500/10 rounded-xl border border-red-500/20">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-black uppercase transition-all">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-black uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            <Save size={16} />{loading ? 'Saving...' : initial ? 'Update Product' : 'Add Product'}
          </button>
        </div>

        <CameraModal
          isOpen={cameraOpen}
          onClose={() => setCameraOpen(false)}
          onPhotosCapture={handlePhotosCapture}
          remainingSlots={MAX_IMAGES - (form.images?.length || 0)}
        />
      </div>
    </div>
  );
};

// ─── Add / Edit Branch Modal ──────────────────────────────────────────────────
const BranchModal = ({ initial, onClose, onSave }) => {
  const blank = { name: '', address: '', city: '', phone: '', timings: '9 AM - 6 PM', hours: '9 AM - 6 PM', mapLink: '', images: [] };
  const [form, setForm] = useState(initial ? { ...initial, city: initial.city || '', timings: initial.timings || initial.hours || '9 AM - 6 PM', hours: initial.hours || initial.timings || '9 AM - 6 PM', images: initial.images || [] } : blank);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  function set(key) { return v => setForm(p => ({ ...p, [key]: v })); }

  async function uploadBranchImages(files) {
    const remainingSlots = MAX_IMAGES - (form.images?.length || 0);
    if (remainingSlots <= 0) {
      setUploadError(`Maximum ${MAX_IMAGES} images allowed.`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (filesToUpload.length === 0) return;

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      for (const file of filesToUpload) {
        formData.append('images', file);
      }

      const res = await fetch(`${API}/api/upload`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      const resolvedUrls = (data.urls || []).map((u) => resolveImageUrl(u, API));

      setForm((current) => ({
        ...current,
        images: [...(current.images || []), ...resolvedUrls].slice(0, MAX_IMAGES),
      }));
    } catch (err) {
      setUploadError(`Image upload failed: ${err.message || 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleFileUpload(e) {
    const files = e.target.files;
    if (!files.length) return;
    await uploadBranchImages(files);
    e.target.value = '';
  }

  const handleRemoveImage = (index) => {
    setForm((current) => ({
      ...current,
      images: (current.images || []).filter((_, i) => i !== index),
    }));
  };

  async function handleSave() {
    if (!form.name || !form.address || !form.phone) { setError('Name, address, phone required.'); return; }
    setLoading(true);
    try {
      const url = initial ? `${API}/api/branches/${initial.id}` : `${API}/api/branches`;
      const method = initial ? 'PUT' : 'POST';
      const normalizedTimings = (form.timings || form.hours || '9 AM - 6 PM').trim();
      const payload = { ...form, timings: normalizedTimings, hours: normalizedTimings };
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSave(data, !!initial);
      onClose();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-black italic uppercase tracking-tighter text-white">{initial ? 'Edit' : 'Add'} <span className="text-rose-500">Branch</span></h2>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl text-zinc-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <div className="space-y-4">
          <Field label="Branch Name *" value={form.name} onChange={set('name')} placeholder="e.g. Elite Hub: Delhi" />
          <Field label="Full Address *" value={form.address} onChange={set('address')} placeholder="Area, City, PIN" />
          <Field label="City" value={form.city} onChange={set('city')} placeholder="e.g. Jammu" />
          <Field label="Phone *" value={form.phone} onChange={set('phone')} placeholder="+91 98765 43210" />
          <Field label="Opening Hours" value={form.timings || form.hours || ''} onChange={(value) => { set('timings')(value); set('hours')(value); }} placeholder="9 AM - 9 PM" />
          <Field label="Google Maps Link" value={form.mapLink} onChange={set('mapLink')} placeholder="https://maps.google.com/..." />
          <div>
            <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5 block">Branch Images</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white transition hover:bg-white/10">
                <Camera size={16} /> Upload Images
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
              </label>
              {uploading && <span className="text-sm text-rose-400">Uploading images...</span>}
            </div>
            {uploadError && <p className="mt-2 text-sm text-rose-400">{uploadError}</p>}
            {form.images?.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {form.images.map((src, index) => (
                  <div key={`${src}-${index}`} className="relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
                    <img src={src} alt={`Branch ${index + 1}`} className="h-24 w-full object-cover" />
                    <button type="button" onClick={() => handleRemoveImage(index)} className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black">
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {error && <p className="mt-4 text-red-400 text-xs font-bold px-4 py-2 bg-red-500/10 rounded-xl">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-black uppercase transition-all">Cancel</button>
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-black uppercase transition-all flex items-center justify-center gap-2 disabled:opacity-50">
            <Save size={16} />{loading ? 'Saving...' : initial ? 'Update' : 'Add Branch'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Admin Panel ─────────────────────────────────────────────────────────
export default function AdminPanel({ onLogout }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [settings, setSettings] = useState(null);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [maintenanceStatus, setMaintenanceStatus] = useState({ maintenanceMode: false, loading: true });
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [serverError, setServerError] = useState(false);
  const [productModal, setProductModal] = useState(null); // null | 'add' | productObj
  const [branchModal, setBranchModal] = useState(null);
  
  // New States
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);

  const [searchProducts, setSearchProducts] = useState('');
  const [deletingProduct, setDeletingProduct] = useState(null);
  const [deletingBranch, setDeletingBranch] = useState(null);

  useEffect(() => {
    const fetchMaintenanceStatus = async () => {
      try {
        const token = localStorage.getItem('zt_token');
        const res = await fetch(`${API}/api/admin/settings/maintenance`, {
          method: 'GET',
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          credentials: 'include',
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data && typeof data.maintenanceMode === 'boolean') {
          setMaintenanceStatus({ maintenanceMode: data.maintenanceMode, loading: false });
          return;
        }
      } catch (error) {
        console.warn('Failed to fetch maintenance status', error);
      }
      setMaintenanceStatus((current) => ({ ...current, loading: false }));
    };

    fetchMaintenanceStatus();

    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      const normalizedOrders = snapshot.docs
        .map((doc) => ({ _id: doc.id, id: doc.id, ...doc.data() }))
        .map((order) => {
          const status = normalizeOrderStatus(order.orderStatus || order.order_status || order.status);
          const total = Number(order.total ?? order.totalAmount ?? 0);

          return {
            ...order,
            orderStatus: status,
            status,
            total,
            totalAmount: Number(order.totalAmount ?? order.total ?? 0),
            paymentMethod: order.paymentMethod || order.payment_method || 'Unknown',
            createdAt: order.createdAt || order.created_at || order.timestamp || null,
            timestamp: order.timestamp || order.createdAt || order.created_at || null,
          };
        })
        .sort((left, right) => new Date(right.timestamp || right.createdAt || 0).getTime() - new Date(left.timestamp || left.createdAt || 0).getTime());

      setOrders(normalizedOrders);
      const confirmedOrders = normalizedOrders.filter((order) => normalizeOrderStatus(order.orderStatus) === 'confirmed');
      setDashboardStats({
        totalOrders: confirmedOrders.length,
        pendingOrders: normalizedOrders.filter((order) => normalizeOrderStatus(order.orderStatus) === 'pending').length,
        revenueToday: confirmedOrders.reduce((sum, order) => sum + Number(order.totalAmount ?? order.total ?? 0), 0),
      });
    });

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('zt_token');
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [prods, brans, sett, usrs] = await Promise.all([
          fetch(`${API}/api/products`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API}/api/branches`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API}/api/settings`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API}/api/admin/users`, { headers, credentials: 'include' }).then(r => r.ok ? r.json() : null).catch(() => null),
        ]);
        
        setProducts(Array.isArray(prods) ? prods : []); setLoadingProducts(false);
        setBranches(Array.isArray(brans) ? brans : []); setLoadingBranches(false);
        setSettings(sett || {});
        if (usrs && Array.isArray(usrs.users)) setUsers(usrs.users); else if (Array.isArray(usrs)) setUsers(usrs); else setUsers([]);
      } catch (err) {
        setServerError(true);
        setLoadingProducts(false);
        setLoadingBranches(false);
      }
    };
    fetchData();

    return () => unsubOrders();
  }, []);

  // Product handlers
  function handleProductSave(data, isEdit) {
    if (isEdit) setProducts(p => p.map(x => x.id === data.id ? data : x));
    else setProducts(p => [...p, data]);
  }
  async function handleProductDelete(id) {
    setDeletingProduct(id);
    try {
      await fetch(`${API}/api/products/${id}`, { method: 'DELETE' });
      setProducts(p => p.filter(x => x.id !== id));
    } catch { alert('Delete failed.'); }
    finally { setDeletingProduct(null); }
  }

  // Branch handlers
  function handleBranchSave(data, isEdit) {
    if (isEdit) setBranches(b => b.map(x => x.id === data.id ? data : x));
    else setBranches(b => [...b, data]);
  }
  async function handleBranchDelete(id) {
    setDeletingBranch(id);
    try {
      await fetch(`${API}/api/branches/${id}`, { method: 'DELETE' });
      setBranches(b => b.filter(x => x.id !== id));
    } catch { alert('Delete failed.'); }
    finally { setDeletingBranch(null); }
  }

  // Settings handler
  async function saveSettings() {
    try {
      await fetch(`${API}/api/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch { alert('Settings save failed.'); }
  }

  async function handleMaintenanceToggle(nextValue) {
    const confirmed = window.confirm(nextValue ? 'Enable maintenance mode for the storefront?' : 'Disable maintenance mode and reopen the storefront?');
    if (!confirmed) return;

    try {
        const token = localStorage.getItem('zt_token');
        const res = await fetch(`${API}/api/admin/settings/maintenance`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ maintenanceMode: nextValue }),
      });
        if (res.status === 401) {
          // Not authenticated — redirect admin to the admin login gate
          window.alert('Please sign in as admin to change maintenance mode.');
          navigate('/khelgavalo');
          return;
        }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || 'Failed to update maintenance mode');
      setMaintenanceStatus({ maintenanceMode: Boolean(data.maintenanceMode), loading: false });
      alert(nextValue ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.');
    } catch (error) {
      alert(error.message || 'Failed to update maintenance mode');
    }
  }

  // Order Status handler
  async function updateOrderStatus(id, status) {
    try {
      const token = localStorage.getItem('zt_token');
      await fetch(`${API}/api/admin/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      setOrders(prev => prev.map(o => o._id === id ? { ...o, orderStatus: normalizeOrderStatus(status), status: normalizeOrderStatus(status) } : o));
    } catch { alert('Update failed'); }
  }

  // User Actions
  async function handleUserToggleBlock(id) {
    try {
      const token = localStorage.getItem('zt_token');
      const res = await fetch(`${API}/api/admin/users/${id}/toggle-block`, {
        method: 'PATCH',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(users.map(u => u._id === id ? { ...u, isActive: data.isActive } : u));
      } else {
        alert(data.error || 'Failed to toggle block status');
      }
    } catch (err) {
      alert('Action failed');
    }
  }

  async function handleUserDelete(id) {
    if (!window.confirm('Are you sure you want to delete this user? This action is permanent.')) return;
    try {
      const token = localStorage.getItem('zt_token');
      const res = await fetch(`${API}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      });
      if (res.ok) {
        setUsers(users.filter(u => u._id !== id));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete user');
      }
    } catch (err) {
      alert('Delete failed');
    }
  }

  const [selectedUser, setSelectedUser] = useState(null);

  // Stats
  const totalRevenue = products.reduce((s, p) => s + p.price * (p.sales || 0), 0);
  const totalStock = products.reduce((s, p) => s + (p.stock || 0), 0);
  const lowStock = products.filter(p => p.stock < 5).length;
  const stats = [
    { label: 'Est. Revenue', value: dashboardStats ? `₹${(dashboardStats.revenueToday / 100000).toFixed(1)}L` : `₹${(totalRevenue / 100000).toFixed(1)}L`, icon: <DollarSign className="text-green-500" size={20} />, trend: 'Confirmed', up: true },
    { label: 'Total Orders', value: dashboardStats ? dashboardStats.totalOrders : 0, icon: <Package className="text-blue-400" size={20} />, trend: `${dashboardStats?.pendingOrders || 0} Pending`, up: (dashboardStats?.pendingOrders || 0) === 0 },
    { label: 'Active Users', value: users.length, icon: <Users className="text-purple-400" size={20} />, trend: 'Live', up: true },
    { label: 'Total Users', value: users.length, icon: <Globe className="text-orange-400" size={20} />, trend: 'Active', up: true },
  ];

  const filteredProducts = products.filter(p =>
    p.name?.toLowerCase().includes(searchProducts.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchProducts.toLowerCase())
  );

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <BarChart3 size={18} /> },
    { id: 'orders', label: 'Orders', icon: <ShoppingBag size={18} /> },
    { id: 'users', label: 'Users', icon: <Users size={18} /> },
    { id: 'inventory', label: 'Inventory', icon: <Package size={18} /> },
    { id: 'branches', label: 'Branches', icon: <MapPin size={18} /> },
    { id: 'settings', label: 'Site Settings', icon: <Settings size={18} /> },
  ];

  const handleLogout = onLogout || logout;

  useEffect(() => {
    const path = window.location.pathname.replace('/yehlepakadmerachoco', '').replace(/^\//, '');
    if (path && navItems.some((item) => item.id === path)) {
      setActiveTab(path);
    } else {
      setActiveTab('dashboard');
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white md:flex">
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm md:hidden">
          <div className="absolute inset-x-4 top-4 rounded-[2rem] border border-white/10 bg-[#0D0D0E] p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Admin Menu</p>
                <p className="text-lg font-black italic uppercase tracking-tighter">Zains <span className="text-rose-500">Admin</span></p>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="rounded-xl border border-white/10 bg-white/5 p-2 text-zinc-400">
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-2">
              {navItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                  className={`flex min-h-[48px] items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-black uppercase tracking-[0.2em] transition-colors ${
                    activeTab === item.id ? 'bg-rose-600 text-white' : 'bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-2">
              <a href="/yehlepakadmerachoco" className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-300">Dashboard</a>
              <a href="/yehlepakadmerachoco/inventory" className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-300">Inventory</a>
              <a href="/yehlepakadmerachoco/branches" className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-300">Branches</a>
            </div>

            <button onClick={handleLogout} className="mt-4 flex w-full items-center justify-center gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-black uppercase tracking-widest text-rose-400">
              <LogOut size={16} /> Sign Out
            </button>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[60] p-4 lg:p-8">
          <div className="bg-zinc-900 border border-white/10 rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-8 border-b border-white/5 flex items-center justify-between bg-zinc-900/50 backdrop-blur-sm">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gradient-to-tr from-rose-600 to-rose-400 rounded-2xl flex items-center justify-center text-2xl font-black text-white shadow-lg">
                  {selectedUser.name?.charAt(0) || 'U'}
                </div>
                <div>
                  <h2 className="text-2xl font-black italic uppercase tracking-tighter text-white">{selectedUser.name}</h2>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest flex items-center gap-2">
                    {selectedUser.email} • {selectedUser.phone}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-zinc-500 hover:text-white">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-[#0A0A0B]/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Stats Cards */}
                <div className="bg-zinc-900/80 border border-white/5 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Joined</p>
                  <p className="text-xl font-bold text-white">{new Date(selectedUser.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="bg-zinc-900/80 border border-white/5 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Provider</p>
                  <p className="text-xl font-bold text-rose-500 uppercase">{selectedUser.provider || 'Email'}</p>
                </div>
                <div className="bg-zinc-900/80 border border-white/5 p-6 rounded-3xl">
                  <p className="text-[10px] font-black text-zinc-600 uppercase tracking-widest mb-1">Role</p>
                  <p className="text-xl font-bold text-blue-500 uppercase">{selectedUser.role}</p>
                </div>

                {/* Cart Items */}
                <div className="md:col-span-1 bg-zinc-900/80 border border-white/5 rounded-3xl p-6 flex flex-col">
                   <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                     <ShoppingBag size={14} className="text-rose-500" /> Cart Items ({selectedUser.cart?.length || 0})
                   </h4>
                   <div className="flex-1 space-y-3">
                     {selectedUser.cart && selectedUser.cart.length > 0 ? (
                       selectedUser.cart.map((item, idx) => (
                       <div key={idx} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
                         <div className="w-10 h-10 bg-zinc-800 rounded-lg flex-shrink-0 overflow-hidden">
                           <img src={item.productId?.image || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400'} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                            </div>
                            <div>
                               <p className="text-[10px] font-black text-white uppercase italic">{item.productId?.name || 'Unknown Product'}</p>
                               <p className="text-[10px] text-zinc-500 font-bold">Qty: {item.quantity} • ₹{(item.productId?.price || 0).toLocaleString()}</p>
                            </div>
                       </div>
                       ))
                     ) : (
                       <p className="text-xs text-zinc-600 font-bold italic py-4">No items in cart</p>
                     )}
                   </div>
                </div>

                {/* Recent Activities */}
                <div className="md:col-span-2 bg-zinc-900/80 border border-white/5 rounded-3xl p-6">
                   <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                     <TrendingUp size={14} className="text-green-500" /> Recent Activities
                   </h4>
                   <div className="space-y-4">
                     {selectedUser.recentActivities && selectedUser.recentActivities.length > 0 ? (
                       selectedUser.recentActivities.slice(0, 5).map((act, idx) => (
                         <div key={idx} className="flex gap-4 border-l-2 border-rose-600/30 pl-4 py-1">
                            <div>
                               <p className="text-xs font-black text-white uppercase">{act.activity}</p>
                               <p className="text-[10px] text-zinc-500 font-medium">{act.details}</p>
                               <p className="text-[9px] text-zinc-600 mt-1">{new Date(act.timestamp).toLocaleString()}</p>
                            </div>
                         </div>
                       ))
                     ) : (
                       <p className="text-xs text-zinc-600 font-bold italic">No recent activity recorded.</p>
                     )}
                   </div>
                </div>

                {/* Recent Searches */}
                <div className="md:col-span-3 bg-zinc-900/80 border border-white/5 rounded-3xl p-6">
                   <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
                     <Search size={14} className="text-blue-500" /> Recent Searches
                   </h4>
                   <div className="flex flex-wrap gap-2">
                      {selectedUser.recentSearches && selectedUser.recentSearches.length > 0 ? (
                        selectedUser.recentSearches.map((s, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white/5 border border-white/5 rounded-full text-[10px] font-black uppercase tracking-tighter text-zinc-400">
                            {s.query}
                          </span>
                        ))
                      ) : (
                        <p className="text-xs text-zinc-600 font-bold italic">No recent searches.</p>
                      )}
                   </div>
                </div>
              </div>
            </div>
            
            <div className="p-8 border-t border-white/5 bg-zinc-900/50 flex justify-end gap-3">
               <button 
                 onClick={() => { handleUserToggleBlock(selectedUser._id); setSelectedUser(prev => ({...prev, isActive: !prev.isActive})) }} 
                 className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedUser.isActive ? 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}
               >
                 {selectedUser.isActive ? 'Block User' : 'Unblock User'}
               </button>
               <button 
                 onClick={() => { handleUserDelete(selectedUser._id); setSelectedUser(null); }}
                 className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
               >
                 Delete Account
               </button>
            </div>
          </div>
        </div>
      )}
      {productModal && (
        <ProductModal
          initial={productModal === 'add' ? null : productModal}
          onClose={() => setProductModal(null)}
          onSave={handleProductSave}
        />
      )}
      {branchModal && (
        <BranchModal
          initial={branchModal === 'add' ? null : branchModal}
          onClose={() => setBranchModal(null)}
          onSave={handleBranchSave}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside className="hidden w-64 bg-zinc-900/80 backdrop-blur-xl border-r border-white/5 flex-col p-6 fixed h-full z-10 md:flex">
        <div className="flex items-center space-x-3 mb-4">
          <a
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-zinc-300 transition-all hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-white"
          >
            Open Old Admin
          </a>
        </div>
        <div className="flex items-center space-x-3 mb-10">
          <div className="w-10 h-10 bg-rose-600 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(225,29,72,0.4)]">
            <Car size={20} className="text-white" />
          </div>
          <span className="text-lg font-black italic uppercase tracking-tighter">ZAINS<span className="text-rose-500">ADMIN</span></span>
        </div>

        <nav className="flex-1 space-y-1.5">
          {navItems.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-black transition-all ${
                activeTab === item.id
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                  : 'text-zinc-500 hover:bg-white/5 hover:text-white'
              }`}>
              {item.icon}<span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-4 space-y-2 rounded-2xl border border-white/5 bg-white/[0.03] p-3">
          <p className="px-1 text-[10px] font-black uppercase tracking-widest text-zinc-600">Quick Actions</p>
          <a
            href="/yehlepakadmerachoco"
            className="block rounded-xl border border-white/5 bg-zinc-900/60 px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-300 transition-all hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-white"
          >
            Dashboard
          </a>
          <a
            href="/yehlepakadmerachoco/inventory"
            className="block rounded-xl border border-white/5 bg-zinc-900/60 px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-300 transition-all hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-white"
          >
            Inventory
          </a>
          <a
            href="/yehlepakadmerachoco/branches"
            className="block rounded-xl border border-white/5 bg-zinc-900/60 px-4 py-3 text-xs font-black uppercase tracking-widest text-zinc-300 transition-all hover:border-rose-500/20 hover:bg-rose-500/10 hover:text-white"
          >
            Branches
          </a>
        </div>

        {serverError && (
          <div className="my-4 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-[10px] font-black">
            ⚠️ Server offline
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-white/5">
          <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest mb-3 px-2">Logged in as Owner</p>
          <button onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-black text-rose-500 hover:bg-rose-500/10 transition-all">
            <LogOut size={18} /><span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <main className="flex-1 p-4 pt-20 md:ml-64 md:p-10 md:pt-10">
        <div className="mb-6 flex items-center justify-between rounded-[1.5rem] border border-white/5 bg-white/[0.03] px-4 py-3 md:hidden">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.35em] text-zinc-500">Dashboard</p>
            <h1 className="text-lg font-black italic uppercase tracking-tighter">Admin Panel</h1>
          </div>
          <button onClick={() => setMobileMenuOpen(true)} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-300">
            <Menu size={18} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
          {stats.map((s, i) => (
            <div key={i} className="bg-zinc-900/60 border border-white/5 p-5 rounded-3xl md:p-6">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-white/5 rounded-xl">{s.icon}</div>
                <span className={`text-xs font-black ${s.up ? 'text-green-500' : 'text-red-400'}`}>{s.trend}</span>
              </div>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-widest">{s.label}</p>
              <h3 className="text-3xl font-black mt-1">{s.value}</h3>
            </div>
          ))}
        </div>

        {/* ── Inventory Tab ──────────────────────────────────────────────── */}
        {activeTab === 'inventory' && (
          <div className="bg-zinc-900/60 border border-white/5 rounded-3xl overflow-hidden">
            <div className="flex flex-col gap-4 border-b border-white/5 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-7">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter shrink-0">
                Product <span className="text-rose-500">Inventory</span>
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <a href="/yehlepakadmerachoco/branches" className="hidden sm:inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all">
                  <MapPin size={15} /> Branches
                </a>
                <a href="/yehlepakadmerachoco/inventory" className="hidden sm:inline-flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all">
                  <Package size={15} /> Inventory
                </a>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input value={searchProducts} onChange={e => setSearchProducts(e.target.value)} placeholder="Search..."
                    className="w-36 rounded-xl border border-white/10 bg-zinc-800 py-2 pl-9 pr-4 text-xs text-white focus:border-rose-500/50 focus:outline-none sm:w-48" />
                </div>
                <button onClick={() => setProductModal('add')}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all">
                  <Plus size={15} /> Add Product
                </button>
              </div>
            </div>

            {loadingProducts ? (
              <div className="p-12 text-center text-zinc-600 font-black">Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="p-12 text-center text-zinc-600 font-black">{searchProducts ? 'No results.' : 'No products yet.'}</div>
            ) : (
                <div className="overflow-x-auto md:overflow-visible">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                      {['Product', 'Brand', 'Category', 'Price', 'Stock', 'Rating', 'Actions'].map(h => (
                        <th key={h} className={`px-6 py-4 ${h === 'Actions' ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="text-sm font-bold">
                    {filteredProducts.map(product => (
                      <tr key={product.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-xl overflow-hidden shrink-0">
                              {product.image ? <img src={product.image} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" onError={e => { e.target.src='https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400'; }} /> : <img src="https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400" alt="" loading="lazy" decoding="async" className="w-full h-full object-cover opacity-50 grayscale" />}
                            </div>
                            <div>
                              <p className="text-xs uppercase text-white group-hover:text-rose-400 transition-colors">{product.name}</p>
                              <p className="text-[10px] text-zinc-600">ZT-{String(product.id).padStart(4,'0')}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-zinc-400 uppercase tracking-widest">{product.brand}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${product.subType === 'Used' ? 'bg-amber-500/10 text-amber-400' : 'bg-rose-500/10 text-rose-400'}`}>
                            {product.category} · {product.subType}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-rose-400 font-black">
                          {product.discountPercent > 0 ? (
                            <div className="flex flex-col text-sm">
                              <span>₹{(product.price || 0).toLocaleString()}</span>
                              <span className="text-xs text-zinc-500 line-through">{`-${product.discountPercent}%`}</span>
                            </div>
                          ) : (
                            `₹${(product.price || 0).toLocaleString()}`
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${product.stock < 5 ? 'bg-red-500/10 text-red-400' : product.stock < 10 ? 'bg-yellow-500/10 text-yellow-400' : 'bg-green-500/10 text-green-400'}`}>
                            {product.stock}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-400 text-xs">⭐ {product.rating}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <a href={`/product/${product.id}`} target="_blank" rel="noopener noreferrer" title="View live product page" className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500 hover:text-white"><Link size={15} /></a>
                            <button onClick={() => setProductModal(product)} className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500 hover:text-white"><Edit3 size={15} /></button>
                            <button onClick={() => handleProductDelete(product.id)} disabled={deletingProduct === product.id}
                              className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors text-zinc-600 disabled:opacity-40"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Branches Tab ───────────────────────────────────────────────── */}
        {activeTab === 'branches' && (
          <div>
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                Branch <span className="text-rose-500">Locations</span>
              </h2>
              <button onClick={() => setBranchModal('add')}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase transition-all">
                <Plus size={15} /> Add Branch
              </button>
            </div>
            {loadingBranches ? (
              <div className="text-center text-zinc-600 font-black py-12">Loading...</div>
            ) : branches.length === 0 ? (
              <div className="text-center text-zinc-600 font-black py-12">No branches yet. Add one!</div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-6">
                {branches.map(branch => (
                  <div key={branch.id} className="bg-zinc-900/60 border border-white/5 hover:border-rose-500/20 rounded-3xl p-5 transition-all md:p-7">
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-rose-600/10 rounded-2xl flex items-center justify-center">
                        <MapPin className="text-rose-500" size={22} />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setBranchModal(branch)} className="p-2 hover:bg-zinc-700 rounded-lg transition-colors text-zinc-500 hover:text-white"><Edit3 size={15} /></button>
                        <button onClick={() => handleBranchDelete(branch.id)} disabled={deletingBranch === branch.id}
                          className="p-2 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-colors text-zinc-600 disabled:opacity-40"><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <h3 className="font-black uppercase italic tracking-tighter text-white text-lg mb-4">{branch.name}</h3>
                    <div className="space-y-2.5 text-xs text-zinc-400 font-medium">
                      <p className="flex items-start gap-2"><MapPin size={14} className="text-rose-500 shrink-0 mt-0.5" />{branch.address}</p>
                      <p className="flex items-center gap-2"><Smartphone size={14} className="text-rose-500 shrink-0" />{branch.phone}</p>
                      <p className="flex items-center gap-2"><Clock size={14} className="text-rose-500 shrink-0" />{branch.hours}</p>
                      {branch.mapLink && (
                        <a href={branch.mapLink} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-rose-400 hover:text-rose-300 transition-colors">
                          <Link size={14} />Get Directions
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Settings Tab ───────────────────────────────────────────────── */}
        {activeTab === 'settings' && settings && (
          <div className="max-w-3xl">
            <h2 className="text-2xl font-black italic uppercase tracking-tighter mb-6 md:mb-8">
              Site <span className="text-rose-500">Settings</span>
            </h2>
            <div className="space-y-6">
              {/* Section: Branding */}
              <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-7">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-5">🎨 Branding & Hero</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Store Name" value={settings.storeName || ''} onChange={v => setSettings(s => ({ ...s, storeName: v }))} placeholder="ZainTyres" />
                  <Field label="Tagline" value={settings.tagline || ''} onChange={v => setSettings(s => ({ ...s, tagline: v }))} placeholder="India's #1 Garage" />
                  <Field label="Hero Main Heading" value={settings.heroHeading || ''} onChange={v => setSettings(s => ({ ...s, heroHeading: v }))} placeholder="PRECISION" />
                  <Field label="Hero Highlight Word" value={settings.heroHighlight || ''} onChange={v => setSettings(s => ({ ...s, heroHighlight: v }))} placeholder="PERFORMANCE" />
                  <div className="md:col-span-2">
                    <Field label="Hero Subtitle" value={settings.heroSubText || ''} onChange={v => setSettings(s => ({ ...s, heroSubText: v }))} placeholder="India's #1 Rated Performance Garage" />
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Footer Description" value={settings.footerText || ''} onChange={v => setSettings(s => ({ ...s, footerText: v }))} as="textarea" placeholder="Footer description..." />
                  </div>
                </div>
              </div>

              {/* Section: Store Status */}
              <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-7">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-5">⚙️ Store Status</h3>
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-white">Maintenance Mode</p>
                    <p className="mt-1 text-xs text-zinc-400">Block the public storefront while keeping the admin panel operational.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${maintenanceStatus.maintenanceMode ? 'bg-rose-500/15 text-rose-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
                      {maintenanceStatus.loading ? 'Checking...' : maintenanceStatus.maintenanceMode ? 'Maintenance On' : 'Live'}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMaintenanceToggle(!maintenanceStatus.maintenanceMode)}
                      disabled={maintenanceStatus.loading}
                      className={`rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-[0.2em] transition ${maintenanceStatus.maintenanceMode ? 'bg-rose-600 text-white hover:bg-rose-500' : 'bg-emerald-600 text-white hover:bg-emerald-500'} disabled:opacity-50`}
                    >
                      {maintenanceStatus.maintenanceMode ? 'Turn Off' : 'Turn On'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Section: Contact */}
              <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-7">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-5">📞 Contact Info</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Phone" value={settings.phone || ''} onChange={v => setSettings(s => ({ ...s, phone: v }))} placeholder="+91 98765 43210" />
                  <Field label="WhatsApp Number (no + or spaces)" value={settings.whatsapp || ''} onChange={v => setSettings(s => ({ ...s, whatsapp: v }))} placeholder="917006628255" />
                  <Field label="Email" value={settings.email || ''} onChange={v => setSettings(s => ({ ...s, email: v }))} placeholder="info@zaintyres.com" />
                  <Field label="Address" value={settings.address || ''} onChange={v => setSettings(s => ({ ...s, address: v }))} placeholder="City, State" />
                </div>
              </div>

              {/* Section: Social */}
              <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-7">
                <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-5">🔗 Social Links</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Instagram URL" value={settings.instagramUrl || ''} onChange={v => setSettings(s => ({ ...s, instagramUrl: v }))} placeholder="https://instagram.com/..." />
                  <Field label="Facebook URL" value={settings.facebookUrl || ''} onChange={v => setSettings(s => ({ ...s, facebookUrl: v }))} placeholder="https://facebook.com/..." />
                </div>
              </div>

              <button onClick={saveSettings}
                className="flex items-center gap-3 bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-2xl font-black uppercase italic tracking-tighter transition-all shadow-[0_0_20px_rgba(225,29,72,0.3)]">
                {settingsSaved ? <><Check size={18} /> Saved!</> : <><Save size={18} /> Save All Settings</>}
              </button>
            </div>
          </div>
        )}

        {/* ── Dashboard Tab ──────────────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="bg-zinc-900/60 border border-white/5 rounded-3xl p-8 text-center md:p-12">
            <BarChart3 size={56} className="mx-auto mb-4 text-zinc-700" />
            <p className="font-black uppercase tracking-widest text-zinc-500 text-sm">Analytics Dashboard</p>
            <p className="text-zinc-700 text-xs mt-2 font-medium">Sales charts & detailed reports coming soon.</p>
          </div>
        )}

        {/* ── Orders Tab ──────────────────────────────────────────────── */}
        {activeTab === 'orders' && (
          <div className="bg-zinc-900/60 border border-white/5 rounded-3xl overflow-hidden">
            <div className="p-4 border-b border-white/5 md:p-7">
              <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                Customer <span className="text-rose-500">Orders</span>
              </h2>
            </div>
            {orders.length === 0 ? (
              <div className="p-12 text-center text-zinc-600 font-black">No orders found.</div>
            ) : (
              <div className="overflow-x-auto md:overflow-visible">
                <table className="w-full text-left text-sm font-bold">
                  <thead>
                    <tr className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                      <th className="px-6 py-4">Order ID</th>
                      <th className="px-6 py-4">Customer</th>
                      <th className="px-6 py-4">Total</th>
                      <th className="px-6 py-4">Payment</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map(order => (
                      <tr key={order._id || order.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-zinc-400">{(order._id || order.id || '').toString().slice(-8)}</td>
                        <td className="px-6 py-4 text-white">
                          {order.customerName || order.userId?.name || 'Unknown'}
                          <p className="text-[10px] text-zinc-500 font-medium">{order.userId?.email}</p>
                        </td>
                        <td className="px-6 py-4 text-rose-400">₹{Number(order.total ?? order.totalAmount ?? 0).toLocaleString()}</td>
                        <td className="px-6 py-4"><span className="px-2.5 py-1 bg-white/5 rounded-full text-xs">{order.paymentMethod || order.payment_method || 'Unknown'}</span></td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            normalizeOrderStatus(order.orderStatus) === 'confirmed'
                              ? 'bg-blue-500/10 text-blue-500'
                              : normalizeOrderStatus(order.orderStatus) === 'dispatched'
                                ? 'bg-green-500/10 text-green-500'
                                : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {formatOrderStatus(order.orderStatus)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                           <select 
                             value={normalizeOrderStatus(order.orderStatus || order.order_status || 'pending')} 
                             onChange={(e) => updateOrderStatus(order._id || order.id, e.target.value)}
                             className="bg-zinc-800 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                           >
                              <option value="pending">Pending</option>
                              <option value="confirmed">Confirmed</option>
                              <option value="dispatched">Dispatched</option>
                           </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Users Tab ──────────────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="bg-zinc-900/60 border border-white/5 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-7 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black italic uppercase tracking-tighter">
                  Registered <span className="text-rose-500">Users</span>
                </h2>
                <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest mt-1">Total {users.length} active members</p>
              </div>
              <div className="flex gap-2">
                 <div className="bg-zinc-800/50 border border-white/5 rounded-2xl px-4 py-2 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Live Analytics ON</span>
                 </div>
              </div>
            </div>
            {users.length === 0 ? (
              <div className="p-12 text-center text-zinc-600 font-black">No users found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm font-bold">
                  <thead>
                    <tr className="text-zinc-600 text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/5">
                      <th className="px-6 py-4">User Details</th>
                      <th className="px-6 py-4">Provider</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Last Activity</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => (
                      <tr key={user._id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-zinc-800 rounded-xl flex items-center justify-center font-black text-rose-500">
                               {user.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <p className="text-white uppercase italic group-hover:text-rose-400 transition-colors">{user.name}</p>
                              <p className="text-[10px] text-zinc-500 font-medium">{user.email || user.phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase
                            ${user.provider === 'google' ? 'bg-blue-500/10 text-blue-400' : 
                              user.provider === 'phone' ? 'bg-green-500/10 text-green-400' : 'bg-zinc-500/10 text-zinc-400'}`}>
                            {user.provider || 'Email'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                           <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase
                            ${user.isActive ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-500'}`}>
                            {user.isActive ? 'Active' : 'Blocked'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 text-xs">
                          {user.recentActivities && user.recentActivities.length > 0 
                            ? new Date(user.recentActivities[user.recentActivities.length - 1].timestamp).toLocaleDateString()
                            : new Date(user.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                           <div className="flex items-center justify-end gap-2">
                             <button 
                               onClick={async () => {
                                 const token = localStorage.getItem('zt_token');
                                 const res = await fetch(`${API}/api/admin/users/${user._id}`, {
                                   headers: token ? { Authorization: `Bearer ${token}` } : {},
                                   credentials: 'include'
                                 });
                                 if (res.ok) setSelectedUser(await res.json());
                                 else alert('Failed to load user details');
                               }} 
                               className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-[10px] font-black uppercase transition-all"
                             >
                               Details
                             </button>
                             <button onClick={() => handleUserToggleBlock(user._id)} className={`p-2 rounded-lg transition-colors ${user.isActive ? 'text-zinc-500 hover:text-amber-500 hover:bg-amber-500/10' : 'text-amber-500 hover:text-green-500 hover:bg-green-500/10'}`}>
                                {user.isActive ? <X size={15} title="Block" /> : <Check size={15} title="Unblock" />}
                             </button>
                             <button onClick={() => handleUserDelete(user._id)} className="p-2 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors">
                               <Trash2 size={15} />
                             </button>
                           </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

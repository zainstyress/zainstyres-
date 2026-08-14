import React, { useState, useEffect, useMemo, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import {
  ShoppingBag, Search, Menu, X, Star, ShieldCheck, Truck, Clock, Filter,
  ShoppingCart, Plus, Minus, Trash2, ArrowRight, User, Mail, Smartphone,
  MapPin, Car, CreditCard, ChevronLeft, Info, Award, Zap, Sparkles,
  Wrench, Package, LogOut, ChevronRight, Globe, Shield
} from 'lucide-react';
import PageLoader from './components/PageLoader';
import SiteNavbar from './components/Navbar';
import BranchCard from './components/BranchCard';
import { fadeInUp, fadeInLeft, fadeInRight, staggerContainer, scaleUp } from './components/AnimationSuite';
import { normalizeProductImages } from './lib/media';
import { calculateTyrePricing } from './lib/tyres';
import StockBadge from './components/tyres/StockBadge';
import AdminPanel from './pages/AdminPanel';

const AuthPage = lazy(() => import('./pages/AuthPage'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminReviewsPage = lazy(() => import('./pages/AdminReviewsPage'));
const AdminTyreForm = lazy(() => import('./pages/AdminTyreForm'));
const AdminBranchesPage = lazy(() => import('./pages/AdminBranchesPage'));
const DeliveryDetailsPage = lazy(() => import('./pages/DeliveryDetailsPage'));
const Checkout = lazy(() => import('./pages/CheckoutNew'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage'));
const TyresShop = lazy(() => import('./pages/TyresShop'));
const TyreDetail = lazy(() => import('./pages/TyreDetail'));
const BranchesPage = lazy(() => import('./pages/BranchesPage'));
const PrivacyPolicyPage = lazy(() => import('./pages/PrivacyPolicyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const RefundPolicyPage = lazy(() => import('./pages/RefundPolicyPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const Khelgavalo = lazy(() => import('./pages/Khelgavalo'));

// ─── Background ───────────────────────────────────────────────────────────────
const BackgroundAnimation = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#050505]">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(225,29,72,0.05)_0%,transparent_70%)] z-10" />
    <div className="absolute top-0 w-full h-full opacity-[0.03] bg-[linear-gradient(to_right,#888_1px,transparent_1px),linear-gradient(to_bottom,#888_1px,transparent_1px)] bg-[size:60px_60px] z-0" />
    
    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-600/10 blur-[120px] rounded-full animate-pulse" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/5 blur-[120px] rounded-full animate-pulse delay-700" />
    
    <div className="absolute inset-0 z-0 overflow-hidden">
      {[...Array(20)].map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: Math.random() * 1000 }}
          animate={{ opacity: [0, 0.2, 0], y: -100 }}
          transition={{ duration: 5 + Math.random() * 5, repeat: Infinity, delay: Math.random() * 5 }}
          className="absolute w-[1px] h-[100px] bg-gradient-to-t from-transparent via-rose-500/20 to-transparent"
          style={{ left: `${Math.random() * 100}%` }}
        />
      ))}
    </div>
  </div>
);

// ─── Logo ─────────────────────────────────────────────────────────────────────
const PremiumLogo = ({ settings }) => {
  const { scrollY } = useScroll();
  const rotate = useTransform(scrollY, [0, 1000], [0, 360 * 5]); // Rotate 5 full turns over 1000px

  return (
    <div className="flex min-w-0 items-center space-x-2 group cursor-pointer sm:space-x-4">
      <motion.div 
        style={{ rotate }}
        className="w-12 h-12 shrink-0 bg-zinc-900 rounded-full border-4 border-rose-600 flex items-center justify-center relative shadow-[0_0_20px_rgba(225,29,72,0.3)]"
      >
        {/* Tyre Tread Design */}
        <div className="absolute inset-0 rounded-full border-4 border-dashed border-zinc-700 opacity-50" />
        <div className="w-6 h-6 bg-zinc-800 rounded-full border-2 border-zinc-600 flex items-center justify-center">
          <div className="w-2 h-2 bg-zinc-400 rounded-full" />
        </div>
        {/* Tread Marks */}
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className="absolute w-1 h-2 bg-rose-600 top-0 left-1/2 -translate-x-1/2 origin-[0_6px]"
            style={{ transform: `translateX(-50%) rotate(${i * 45}deg)` }}
          />
        ))}
      </motion.div>
      <div className="flex min-w-0 flex-col leading-none">
        <div className="flex min-w-0 items-baseline space-x-1">
          <span className="truncate text-lg font-black italic tracking-tighter text-white uppercase transition-all duration-700 group-hover:tracking-normal sm:text-3xl">
            ZAINS
          </span>
          <span className="truncate text-lg font-black italic tracking-tighter text-rose-600 uppercase transition-all duration-700 group-hover:tracking-tight sm:text-3xl">
            TYRES
          </span>
        </div>
        <div className="mt-1 flex max-w-full items-center space-x-2 overflow-hidden">
          <div className="h-[1px] w-full bg-gradient-to-r from-rose-600 to-transparent opacity-50" />
          <span className="whitespace-nowrap text-[7px] font-black uppercase tracking-[0.3em] text-rose-500">Trusted Tyre Dealer</span>
        </div>
      </div>
    </div>
  );
};


// ─── Navbar ───────────────────────────────────────────────────────────────────
const Navbar = ({ cartCount, onOpenCart, onNavigate, currentView, settings }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 w-full z-[100] transition-all duration-700 ${
      scrolled ? 'py-4' : 'py-8'
    }`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className={`glass-panel rounded-[2.5rem] px-8 py-4 flex justify-between items-center transition-all duration-700 ${
          scrolled ? 'shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10' : 'bg-transparent border-transparent'
        }`}>
          <div onClick={() => onNavigate('home')} className="hover:scale-105 transition-transform"><PremiumLogo settings={settings} /></div>

          <div className="hidden lg:flex items-center space-x-12">
            {[
              { label: 'Studio', id: 'home' },
              { label: 'Inventory', id: 'tyres' },
              { label: 'Branches', id: 'branches' },
              { label: 'Add-ons', id: 'accessories' },
              { label: 'The Hub', id: 'contactus' },
            ].map(item => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => (item.id === 'branches' ? window.location.href = '/branches' : onNavigate(item.id))}
                  className={`group relative text-[11px] font-black uppercase tracking-[0.3em] transition-all ${
                    isActive ? 'text-rose-500' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {item.label}
                  <motion.div
                    className={`absolute -bottom-1 left-0 h-[2px] bg-rose-600`}
                    initial={false}
                    animate={{ width: isActive ? '100%' : '0%' }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={onOpenCart}
              className="relative group flex min-h-[44px] min-w-[44px] items-center justify-center p-2"
            >
              <div className="absolute inset-0 bg-rose-600 rounded-2xl blur-lg opacity-0 group-hover:opacity-40 transition-opacity" />
              <div className="relative flex items-center space-x-3 bg-white/5 hover:bg-white/10 px-5 py-3 rounded-2xl border border-white/10 transition-all">
                <ShoppingCart size={20} className="text-white group-hover:text-rose-500 transition-colors" />
                <span className="text-[10px] font-black text-white uppercase tracking-widest hidden sm:inline">Bag</span>
                {cartCount > 0 && (
                  <span className="bg-rose-600 text-white font-black text-[9px] w-5 h-5 rounded-lg flex items-center justify-center shadow-lg">
                    {cartCount}
                  </span>
                )}
              </div>
            </button>
            {user ? (
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => window.location.href = '/'}
                  className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 transition-all hover:border-rose-500/50 hover:bg-white/10"
                >
                  {user.profileImage ? (
                    <img src={user.profileImage} loading="lazy" decoding="async" className="w-6 h-6 rounded-lg object-cover" alt="" />
                  ) : (
                    <div className="w-6 h-6 bg-rose-600 rounded-lg flex items-center justify-center text-[10px] font-black">{user.name?.charAt(0) || user.email?.charAt(0)}</div>
                  )}
                  <span className="text-[10px] font-black text-white uppercase tracking-widest hidden sm:inline">
                    {user.name?.split(' ')[0] || user.email?.split('@')[0] || 'Profile'}
                  </span>
                </button>
                <button onClick={logout} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-rose-500/20 bg-rose-600/10 p-2.5 text-rose-500 transition-all hover:bg-rose-600/20" title="Logout">
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button onClick={() => window.location.href = '/login'} className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 p-3 text-zinc-400 hover:text-white">
                <User size={20} />
              </button>
            )}
            <button className="lg:hidden flex min-h-[44px] min-w-[44px] items-center justify-center rounded-2xl bg-white/5 p-3 text-zinc-400" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>
      
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="lg:hidden absolute top-24 left-4 right-4 glass-panel rounded-[2rem] p-6 max-h-[calc(100vh-7rem)] overflow-y-auto shadow-2xl"
          >
            <div className="flex flex-col space-y-6">
              {['Home', 'Tyres', 'Branches', 'Accessories', 'Contact Us'].map(item => (
                <button 
                  key={item} 
                  onClick={() => {
                    if (item === 'Branches') {
                      window.location.href = '/branches';
                    } else {
                      onNavigate(item.toLowerCase().replace(' ', ''));
                    }
                    setMobileOpen(false);
                  }}
                  className="min-h-[44px] border-b border-white/5 py-4 text-left text-lg font-black uppercase tracking-[0.2em] text-zinc-400 hover:text-rose-500 last:border-0"
                >
                  {item}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};


// ─── Product Card ─────────────────────────────────────────────────────────────
const ProductCard = ({ product, onAddToCart, settings }) => {
  const images = product.images && product.images.length > 0 ? product.images : [product.image || 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400'];
  const pricing = calculateTyrePricing(product);
  const [currentIdx, setCurrentIdx] = useState(0);
  const whatsappNumber = settings?.whatsapp || '917006628255';
  const navigate = useNavigate();

  const handleBuyNow = (tyre, navigateToCheckout) => {
    // Reuse the onAddToCart callback to add the product, then go to checkout.
    try {
      onAddToCart && onAddToCart(tyre);
      if (navigateToCheckout) navigateToCheckout();
      else window.location.href = '/checkout';
    } catch (err) {
      // Fallback: open WhatsApp only if add-to-cart fails
      const message = `Hi Zain's Tyres! I want to buy:\n\n` +
        `*${tyre.name}*\n` +
        `Brand: ${tyre.brand}\n` +
        `Size: ${tyre.size}\n` +
        `Price: ₹${tyre.price}\n\n` +
        `Please confirm availability and payment details.`;
      const encodedMessage = encodeURIComponent(message);
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
  <motion.div 
    variants={fadeInUp}
    className="group relative flex h-full min-w-0 flex-col overflow-hidden rounded-[3rem] luxury-card"
  >
    <div className="relative h-36 overflow-hidden bg-zinc-900 group/image md:h-56">
      <img
        src={images[currentIdx]}
        alt={product.name}
        loading="lazy"
        decoding="async"
        onError={e => { e.target.src = 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&q=80&w=400'; }}
        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-all duration-500"
      />
      
      {images.length > 1 && (
        <>
          <button onClick={e => { e.stopPropagation(); setCurrentIdx(i => (i === 0 ? images.length - 1 : i - 1)); }} className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover/image:opacity-100 hover:bg-rose-600 transition-all"><ChevronRight size={14} className="rotate-180" /></button>
          <button onClick={e => { e.stopPropagation(); setCurrentIdx(i => (i === images.length - 1 ? 0 : i + 1)); }} className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover/image:opacity-100 hover:bg-rose-600 transition-all"><ChevronRight size={14} /></button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 opacity-0 group-hover/image:opacity-100 transition-opacity">
            {images.map((_, i) => <div key={i} className={`h-1 rounded-full transition-all ${i === currentIdx ? 'w-4 bg-rose-500' : 'w-1.5 bg-white/50'}`} />)}
          </div>
        </>
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0D0F] via-transparent to-transparent opacity-60 pointer-events-none" />

      
      <div className="absolute top-6 left-6">
        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border border-white/10 ${
          product.subType === 'Used' ? 'bg-amber-500/80 text-black' : 'bg-rose-600/80 text-white'
        }`}>
          {product.condition || product.subType}
        </span>
      </div>
    </div>

    <div className="flex flex-1 flex-col p-2 md:p-10">
      <div className="mb-3 flex items-start justify-between md:mb-4">
        <div className="flex items-center space-x-2 text-xs text-rose-500 md:text-sm">
          <Star size={12} className="fill-current" />
          <span className="text-[10px] font-black uppercase tracking-widest">{product.rating || '4.9'}</span>
        </div>
        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 md:text-[11px]">{product.brand}</span>
      </div>
      
      <h3 className="mb-3 overflow-hidden text-sm font-black italic uppercase tracking-tighter text-white transition-colors group-hover:text-rose-500 md:mb-4 md:text-2xl [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
        {product.name}
      </h3>
      
      <div className="flex items-end justify-between border-t border-white/5 pt-3 md:pt-6">
        <div>
          <p className="mb-1 hidden text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 md:block">Acquisition Cost</p>
          {pricing.hasDiscount && (
            <p className="text-xs text-zinc-500 line-through">₹{Number(pricing.originalPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          )}
          <p className="text-lg font-black italic tracking-tighter text-white md:text-3xl">₹{Number(pricing.discountedPrice).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
          <div className="mt-2"><StockBadge stock={product.stock} /></div>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 p-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 md:p-3">
           {product.category}
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:mt-6 md:gap-3">
        <button
          type="button"
          onClick={() => onAddToCart({ ...product, price: pricing.discountedPrice })}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs font-black italic uppercase tracking-tighter text-black transition-all hover:bg-zinc-200 md:px-0 md:py-4 md:text-sm"
        >
          <Plus size={18} /> Add to Bag
        </button>
        <button
          type="button"
          onClick={() => handleBuyNow({ ...product, price: pricing.discountedPrice }, () => navigate('/checkout'))}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-3 py-2 text-xs font-black italic uppercase tracking-tighter text-white transition-all hover:bg-rose-700 shadow-lg shadow-rose-600/30 md:px-0 md:py-4 md:text-sm"
        >
          <Zap size={18} /> Buy Now
        </button>
      </div>
    </div>
  </motion.div>
)};


// ─── Cart Sidebar ─────────────────────────────────────────────────────────────
const CartSidebar = ({ cart, setCart, onClose, settings, API, user }) => {
  const navigate = useNavigate();
  const total = cart.reduce((a, b) => a + b.price * b.quantity, 0);

  const updateCartItem = async (productId, quantity, isDelete) => {
    if (!user) {
      if (isDelete) setCart(p => p.filter(i => i.id !== productId));
      else setCart(p => p.map(i => i.id === productId ? { ...i, quantity } : i));
      return;
    }
    
    try {
      if (isDelete) {
        await fetch(`${API}/api/cart/${productId}`, { method: 'DELETE', credentials: 'include' });
        setCart(p => p.filter(i => (i.productId?.id || i.id) !== productId));
      } else {
        await fetch(`${API}/api/cart/${productId}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({quantity}), credentials: 'include' });
        setCart(p => p.map(i => (i.productId?.id || i.id) === productId ? { ...i, quantity } : i));
      }
    } catch {}
  };
  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0D0D0E] h-full shadow-[0_0_100px_rgba(0,0,0,1)] border-l border-white/5 flex flex-col">
        <div className="p-8 border-b border-white/5 flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-black italic tracking-tighter text-white uppercase">Your Bag</h2>
            <p className="text-[9px] font-black text-rose-500 uppercase tracking-widest mt-1">{cart.reduce((a, b) => a + b.quantity, 0)} Items</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-zinc-500 hover:text-white hover:bg-white/10 transition-all">
            <X size={22} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8" style={{ scrollbarWidth: 'none' }}>
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-800">
              <ShoppingBag size={80} strokeWidth={1} className="mb-6 opacity-20" />
              <p className="font-black uppercase tracking-[0.2em]">Bag Is Empty</p>
            </div>
          ) : cart.map(item => (
            <div key={item.id} className="flex gap-6 group">
              <div className="w-24 h-24 shrink-0 overflow-hidden rounded-[1.5rem] bg-zinc-900 border border-white/5">
                <img src={item.image} loading="lazy" decoding="async" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt="" />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-black text-white uppercase italic tracking-tight text-sm">{item.name}</h4>
                  <button onClick={() => updateCartItem(item.id || item.productId?.id, undefined, true)} className="text-zinc-700 hover:text-rose-500 transition-colors ml-2">
                    <Trash2 size={15} />
                  </button>
                </div>
                <p className="text-rose-500 font-black text-xs mb-4">₹{item.price.toLocaleString()}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center bg-zinc-900 rounded-xl border border-white/5 p-1">
                    <button onClick={() => updateCartItem(item.id || item.productId?.id, Math.max(1, item.quantity - 1))} className="w-7 h-7 flex items-center justify-center text-white font-black text-sm">−</button>
                    <span className="w-8 text-center text-xs font-black text-white">{item.quantity}</span>
                    <button onClick={() => updateCartItem(item.id || item.productId?.id, item.quantity + 1)} className="w-7 h-7 flex items-center justify-center text-white font-black text-sm">+</button>
                  </div>
                  <p className="font-black text-white italic text-sm">₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {cart.length > 0 && (
          <div className="p-8 bg-black/40 border-t border-white/5">
            <div className="flex justify-between items-end mb-6">
              <div>
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Subtotal</p>
                <p className="text-4xl font-black italic tracking-tighter text-white">₹{total.toLocaleString()}</p>
              </div>
            </div>
            
            <button
                  onClick={() => { onClose(); navigate('/checkout'); }}
              className="block w-full mb-3 bg-white hover:bg-zinc-200 text-black py-4 rounded-[2rem] font-black text-lg italic tracking-tighter shadow-2xl transition-all text-center"
            >
              PROCEED TO CHECKOUT
            </button>

            <a
              href={`https://wa.me/${settings?.whatsapp || '917006628255'}?text=${encodeURIComponent('Hi! I want to order:\n' + cart.map(i => `• ${i.name} x${i.quantity} = ₹${(i.price * i.quantity).toLocaleString()}`).join('\n') + `\nTotal: ₹${total.toLocaleString()}`)}`}
              target="_blank" rel="noreferrer"
              className="block w-full bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/20 py-4 rounded-[2rem] font-black text-lg italic tracking-tighter transition-all text-center"
            >
              📱 OR ORDER VIA WHATSAPP
            </a>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Home View ────────────────────────────────────────────────────────────────
const HomeView = ({ settings, onNavigate }) => (
  <div className="pt-20">
    {/* Hero Section */}
    <motion.section 
      variants={staggerContainer}
      initial="initial"
      whileInView="whileInView"
      viewport={{ once: true }}
      className="min-h-[85vh] flex w-full max-w-[100vw] flex-col items-center justify-center overflow-hidden px-4 text-center relative sm:px-6"
    >
      <div className="max-w-6xl relative z-10 w-full overflow-hidden">
        <motion.div variants={fadeInUp} className="inline-flex items-center space-x-4 bg-white/5 px-8 py-3 rounded-full border border-white/10 mb-12 backdrop-blur-md">
          <div className="w-2 h-2 bg-rose-600 rounded-full animate-ping" />
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-rose-500">
            {settings?.heroSubText || "Elite Performance Engineered"}
          </span>
        </motion.div>
        
        <motion.h1
          variants={fadeInUp}
          className="mb-10 break-words px-2 font-black italic uppercase leading-[0.82] tracking-[calc(-0.05em)] text-white text-glow-rose md:mb-16"
          style={{ fontSize: 'clamp(2.5rem, 10vw, 9rem)' }}
        >
          {settings?.heroHeading || 'PRECISION'}
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-600 via-rose-500 to-rose-700">
            {settings?.heroHighlight || 'PERFORMANCE'}
          </span>
        </motion.h1>

        <motion.p variants={fadeInUp} className="mx-auto mb-12 max-w-2xl px-6 text-base font-medium leading-relaxed text-zinc-400 sm:px-0 sm:text-lg md:mb-16 md:text-xl">
          Unlock the true potential of your vehicle with our world-class inventory of high-performance tyres and bespoke automotive accessories.
        </motion.p>

        <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-8">
          <button onClick={() => onNavigate('tyres')}
            className="group relative px-16 py-6 bg-rose-600 hover:bg-rose-700 rounded-[2rem] overflow-hidden transition-all duration-500 shadow-[0_25px_60px_rgba(225,29,72,0.4)]">
            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
            <span className="relative flex items-center gap-3 font-black text-2xl italic tracking-tighter text-white">
              EXPLORE UNITS <ArrowRight size={24} />
            </span>
          </button>
            <button onClick={() => window.location.href = '/branches'}
            className="px-16 py-6 glass-panel hover:bg-white/10 rounded-[2rem] font-black text-2xl italic tracking-tighter text-white transition-all duration-500 border-white/10">
            LOCATE STUDIO
          </button>
        </motion.div>
      </div>

      {/* Hero Visual Elements */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none overflow-hidden opacity-30">
        <svg viewBox="0 0 100 100" className="h-full w-full text-rose-600/10 md:h-[150%] md:w-[150%]">
          <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.1" strokeDasharray="1 2" />
          <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" strokeWidth="0.1" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeWidth="0.1" strokeDasharray="3 1" />
        </svg>
      </div>
    </motion.section>

    {/* Tyre Size Finder */}
    <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 pb-24">
      <div className="grid gap-6 overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(244,63,94,0.18),transparent_40%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] p-6 md:grid-cols-[1.2fr_0.8fr] md:p-10">
        <div>
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.35em] text-rose-300">
            <Sparkles size={13} /> Find the right tyre
          </p>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter text-white md:text-5xl">Match the exact fit for your car or bike.</h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">Pick the width, aspect ratio, and rim size, then jump straight into search results for that fit.</p>
          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {['175 / 65 R14', '195 / 55 R16', '205 / 60 R15'].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => { window.location.href = `/search?q=${encodeURIComponent(size)}`; }}
                className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left transition-colors hover:border-rose-500/30 hover:bg-white/[0.08]"
              >
                <span className="block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Quick find</span>
                <span className="mt-2 block text-lg font-black italic uppercase tracking-tighter text-white">{size}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-4 rounded-[28px] border border-white/5 bg-black/20 p-5 md:p-6">
          <div className="grid grid-cols-3 gap-3">
            {['Width', 'Aspect', 'Rim'].map((label) => (
              <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-4 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">{label}</p>
                <p className="mt-3 text-2xl font-black text-white">--</p>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => { window.location.href = '/search'; }}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-5 py-4 text-sm font-black uppercase tracking-[0.25em] text-black transition-transform hover:scale-[1.01]"
          >
            Open tyre search <ArrowRight size={15} />
          </button>
        </div>
      </div>
    </section>

    {/* Brand Marquee */}
    <section className="py-24 border-y border-white/5 bg-zinc-950/50 backdrop-blur-sm overflow-hidden">
      <div className="flex space-x-20 animate-marquee whitespace-nowrap">
        {['MICHELIN', 'PIRELLI', 'CONTINENTAL', 'BRIDGESTONE', 'GOODYEAR', 'DUNLOP', 'YOKOHAMA', 'HANKOOK'].map((brand, i) => (
          <span key={i} className="text-4xl md:text-6xl font-black italic tracking-tighter text-white/10 hover:text-rose-600/50 transition-colors cursor-default select-none">
            {brand}
          </span>
        ))}
        {/* Duplicate for seamless loop */}
        {['MICHELIN', 'PIRELLI', 'CONTINENTAL', 'BRIDGESTONE', 'GOODYEAR', 'DUNLOP', 'YOKOHAMA', 'HANKOOK'].map((brand, i) => (
          <span key={i+10} className="text-4xl md:text-6xl font-black italic tracking-tighter text-white/10 hover:text-rose-600/50 transition-colors cursor-default select-none">
            {brand}
          </span>
        ))}
      </div>
      <style>{`
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
        .animate-marquee { animation: marquee 30s linear infinite; }
      `}</style>
    </section>

    {/* Features Grid */}
    <section className="py-32 max-w-7xl mx-auto px-6">
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        whileInView="whileInView"
        viewport={{ once: true }}
        className="grid grid-cols-1 md:grid-cols-3 gap-10"
      >
        {[
          { icon: <ShieldCheck size={40} />, title: "Precision Grade", text: "Every unit undergoes a 40-point structural integrity verification before delivery." },
          { icon: <Zap size={40} />, title: "Instant Logistics", text: "Same-day deployment for all performance inventory within metropolitan sectors." },
          { icon: <Globe size={40} />, title: "Global Network", text: "Direct sourcing from manufacturing plants across Europe and Japan." },
        ].map((feat, i) => (
          <motion.div key={i} variants={fadeInUp} className="glass-panel rounded-[3rem] p-12 hover:border-rose-500/30 transition-all duration-700 group">
             <div className="text-rose-600 mb-8 group-hover:scale-110 transition-transform duration-500">{feat.icon}</div>
             <h3 className="text-3xl font-black italic tracking-tighter text-white uppercase mb-6">{feat.title}</h3>
             <p className="text-zinc-500 font-medium leading-relaxed">{feat.text}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  </div>
);


// ─── Products Grid ────────────────────────────────────────────────────────────
const ProductsSection = ({ products, loading, error, activeFilter, setActiveFilter, onAddToCart, currentView, onNavigate, settings }) => {
  const filtered = useMemo(() => {
    if (activeFilter === 'All') return products;
    return products.filter(p => p.category === activeFilter);
  }, [products, activeFilter]);

  return (
    <section className="max-w-screen-2xl mx-auto px-4 py-24 sm:px-6">
      <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-10">
        <div>
          <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-white mb-3">
            CURATED <span className="text-rose-600">UNITS</span>
          </h2>
          <p className="text-zinc-600 font-black text-[10px] uppercase tracking-[0.4em] italic">Currency: Indian Rupee (₹) • VAT Included</p>
        </div>
        <div className="flex max-w-full overflow-hidden rounded-[2rem] border border-white/5 bg-zinc-900/50 p-2 backdrop-blur-xl">
          {['All', 'Tyres', 'Accessories'].map(f => (
            <button key={f} onClick={() => { setActiveFilter(f); if (f !== 'All' && currentView === 'home') onNavigate(f.toLowerCase()); }}
              className={`min-h-[44px] rounded-2xl px-5 py-3.5 font-black text-[10px] uppercase tracking-widest transition-all ${activeFilter === f ? 'bg-rose-600 text-white shadow-xl' : 'text-zinc-500 hover:text-white'}`}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-8 px-5 py-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl text-yellow-400 text-sm font-bold">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-10 xl:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-zinc-900/40 rounded-[2.5rem] border border-white/5 overflow-hidden animate-pulse">
              <div className="h-36 bg-zinc-800 md:h-64" />
              <div className="space-y-3 p-2 md:p-8">
                <div className="h-3 bg-zinc-800 rounded w-1/3" />
                <div className="h-5 bg-zinc-800 rounded" />
                <div className="h-4 bg-zinc-800 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-32 text-zinc-700">
          <Package size={60} className="mx-auto mb-4 opacity-30" />
          <p className="font-black uppercase tracking-widest">No products found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-2 md:gap-10 xl:grid-cols-4">
          {filtered.map(p => <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} settings={settings} />)}
        </div>
      )}
    </section>
  );
};

const BranchesPreviewSection = ({ branches }) => (
  <section className="max-w-screen-2xl mx-auto px-4 sm:px-6 pb-24">
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        <h2 className="text-4xl md:text-6xl font-black italic tracking-tighter uppercase text-white mb-3">
          OUR <span className="text-rose-600">BRANCHES</span>
        </h2>
        <p className="text-zinc-600 font-black text-[10px] uppercase tracking-[0.4em] italic">Visit the nearest studio for premium service</p>
      </div>
      <button onClick={() => window.location.href = '/branches'} className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-white px-5 py-3 text-sm font-black uppercase tracking-[0.25em] text-black transition-transform hover:scale-[1.01]">
        View branches
      </button>
    </div>

    <div className="grid gap-4 md:grid-cols-2">
      {branches.slice(0, 2).map((branch) => (
        <BranchCard key={branch.id} branch={branch} variant="compact" />
      ))}
    </div>
  </section>
);

// ─── Contact View ─────────────────────────────────────────────────────────────
const ContactView = ({ branches, loading, settings }) => (
  <div className="max-w-7xl mx-auto px-6 py-40 relative z-20">
    <motion.div 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-32"
    >
      <div className="inline-flex items-center space-x-3 bg-rose-600/10 px-6 py-2 rounded-full border border-rose-500/20 mb-10">
        <Globe size={16} className="text-rose-600" />
        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-rose-500 text-glow-rose">Tactical Network</span>
      </div>
      <h2 className="text-6xl md:text-8xl font-black italic tracking-tight text-white uppercase leading-[0.9] mb-8">
        PREMIUM <span className="text-rose-600">LOCATIONS</span>
      </h2>
      <p className="text-zinc-500 font-medium max-w-2xl mx-auto text-lg leading-relaxed">
        Experience automotive excellence at our specialized studios where artisan craft meets aerospace technology.
      </p>
    </motion.div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-32">
       <div className="glass-panel rounded-[3.5rem] p-16 flex flex-col justify-center border-rose-600/20 shadow-[0_30px_60px_rgba(225,29,72,0.1)]">
          <h3 className="text-4xl font-black italic tracking-tighter text-white uppercase mb-8">Direct Access</h3>
          <div className="space-y-4 mb-12">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-rose-500 shadow-lg border border-white/5"><Smartphone size={20}/></div>
              <p className="text-xl font-black italic text-zinc-300 tracking-tight">{settings?.phone || '+91 98765 43210'}</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-rose-500 shadow-lg border border-white/5"><Mail size={20}/></div>
              <p className="text-xl font-black italic text-zinc-300 tracking-tight">{settings?.email || 'info@zaintyres.com'}</p>
            </div>
          </div>
          <a
            href={`https://wa.me/${settings?.whatsapp || '917006628255'}`}
            target="_blank" rel="noreferrer"
            className="group relative inline-flex items-center justify-center gap-4 bg-rose-600 hover:bg-rose-700 text-white px-10 py-6 rounded-3xl font-black italic uppercase text-lg transition-all shadow-[0_20px_50px_rgba(225,29,72,0.3)]"
          >
            <Sparkles size={24} /> CONNECT VIA WHATSAPP
          </a>
       </div>
       <div className="grid grid-cols-2 gap-6">
          <div className="glass-panel rounded-[3rem] p-10 flex flex-col items-center justify-center text-center opacity-50 hover:opacity-100 transition-opacity">
             <Shield size={32} className="text-rose-600 mb-6" />
             <p className="font-black italic uppercase tracking-tighter text-white text-sm">Certified Techs</p>
          </div>
          <div className="glass-panel rounded-[3rem] p-10 flex flex-col items-center justify-center text-center opacity-50 hover:opacity-100 transition-opacity">
             <Clock size={32} className="text-rose-600 mb-6" />
             <p className="font-black italic uppercase tracking-tighter text-white text-sm">24/7 Response</p>
          </div>
          <div className="glass-panel rounded-[3rem] p-10 flex flex-col items-center justify-center text-center opacity-50 hover:opacity-100 transition-opacity">
             <Truck size={32} className="text-rose-600 mb-6" />
             <p className="font-black italic uppercase tracking-tighter text-white text-sm">Quick Deploy</p>
          </div>
          <div className="glass-panel rounded-[3rem] p-10 flex flex-col items-center justify-center text-center opacity-50 hover:opacity-100 transition-opacity">
             <Award size={32} className="text-rose-600 mb-6" />
             <p className="font-black italic uppercase tracking-tighter text-white text-sm">Best-in-Class</p>
          </div>
       </div>
    </div>

    {loading ? (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {[1, 2, 3].map(i => <div key={i} className="luxury-card rounded-[3.5rem] h-[500px] animate-pulse" />)}
      </div>
    ) : (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {branches.map(branch => (
          <motion.div 
            key={branch.id} 
            variants={fadeInUp}
            whileHover={{ y: -10 }}
            className="group luxury-card rounded-[3.5rem] overflow-hidden"
          >
            <div className="h-48 bg-zinc-900 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(225,29,72,0.2)_0%,transparent_100%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
              <div className="absolute inset-0 flex items-center justify-center">
                 <MapPin size={48} className="text-rose-600/30 group-hover:text-rose-600 transition-colors duration-700 group-hover:scale-110 transform" />
              </div>
            </div>
            <div className="p-12">
              <h3 className="text-3xl font-black italic tracking-tighter text-white uppercase mb-8 group-hover:text-rose-600 transition-colors">{branch.name}</h3>
              <div className="space-y-6 text-zinc-500 font-medium text-sm">
                <p className="flex items-start gap-4"><MapPin className="text-rose-600 shrink-0" size={20} />{branch.address}</p>
                <p className="flex items-center gap-4"><Smartphone className="text-rose-600 shrink-0" size={20} />{branch.phone}</p>
                <p className="flex items-center gap-4"><Clock className="text-rose-600 shrink-0" size={20} />{branch.hours}</p>
              </div>
              {branch.mapLink && branch.mapLink !== '' && (
                <a href={branch.mapLink} target="_blank" rel="noreferrer"
                  className="mt-10 inline-flex items-center gap-3 text-rose-500 text-[10px] font-black uppercase tracking-[0.3em] hover:text-white transition-all group">
                  Locate Studio <ChevronRight size={14} className="group-hover:translate-x-2 transition-transform" />
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    )}
  </div>
);


// ─── Account View ─────────────────────────────────────────────────────────────
const AccountView = ({ user }) => {
  if (!user) return null;
  return (
    <div className="max-w-4xl mx-auto px-6 py-40">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel rounded-[3rem] overflow-hidden border-rose-600/20 shadow-2xl"
      >
        <div className="h-48 bg-gradient-to-r from-rose-600 to-rose-800 relative">
          <div className="absolute -bottom-16 left-12 p-2 bg-[#0A0A0B] rounded-[2rem] border-4 border-[#0A0A0B]">
            <div className="w-32 h-32 bg-zinc-900 rounded-[1.5rem] flex items-center justify-center text-4xl font-black text-rose-500 shadow-xl border border-white/5 uppercase">
              {user.name?.[0] || user.email?.[0]}
            </div>
          </div>
        </div>
        
        <div className="pt-24 px-12 pb-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white mb-2">
                {user.name || user.email?.split('@')[0] || 'Anonymous User'}
              </h1>
              <p className="text-zinc-500 font-black text-[10px] uppercase tracking-[0.4em] italic flex items-center gap-2">
                <Globe size={14} className="text-rose-600" /> Member since {new Date().getFullYear()}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Status</p>
                <p className="text-xs font-black text-green-500 uppercase flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" /> Verified
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 px-6 py-4 rounded-2xl">
                <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Tier</p>
                <p className="text-xs font-black text-rose-500 uppercase">Platinum</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-16">
            <div className="space-y-6">
              <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-rose-500/20 transition-all group">
                <div className="w-12 h-12 bg-rose-600/10 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform"><Mail size={20} /></div>
                <div>
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Contact Protocol</p>
                  <p className="text-sm font-bold text-white">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 hover:border-rose-500/20 transition-all group">
                <div className="w-12 h-12 bg-rose-600/10 rounded-2xl flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform"><Smartphone size={20} /></div>
                <div>
                  <p className="text-[9px] font-black text-zinc-600 uppercase tracking-widest mb-1">Security Sync</p>
                  <p className="text-sm font-bold text-white">{user.phone || 'Not Linked'}</p>
                </div>
              </div>
            </div>

            <div className="bg-rose-600/5 rounded-[2.5rem] p-10 border border-rose-500/10 flex flex-col justify-center">
              <h3 className="text-2xl font-black italic uppercase tracking-tighter text-white mb-4">Elite Support</h3>
              <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-8">Your account is secured with aerospace-grade encryption. Need priority assistance?</p>
              <button className="w-full bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-2xl font-black italic uppercase tracking-tighter transition-all shadow-lg shadow-rose-600/20">
                CONNECT TO CONCIERGE
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};


// ─── Main Public App ──────────────────────────────────────────────────────────
function PublicApp() {
  const [view, setView] = useState('home');
  const [products, setProducts] = useState([]);
  const [branches, setBranches] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [productError, setProductError] = useState(null);
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');

  const { user, API, logout } = useAuth();
  const location = useLocation();
  const routerNavigate = useNavigate();

  useEffect(() => {
    fetch(`${API}/api/products`)
      .then(r => r.ok ? r.json() : Promise.reject(new Error('Network error')))
      .then(data => { 
        if(Array.isArray(data)) setProducts(data.map((item) => normalizeProductImages(item, API))); 
        else { setProducts([]); setProductError(data?.error || 'Failed to fetch products'); }
        setLoadingProducts(false); 
      })
      .catch(() => { setProductError('Server offline. Ensure backend is running.'); setProducts([]); setLoadingProducts(false); });

  }, [user, API]);

  useEffect(() => {
    let cancelled = false;
    const loadBranches = async () => {
      try {
        const response = await fetch(`${API}/api/branches`);
        const data = response.ok ? await response.json() : [];
        if (!cancelled) {
          setBranches(Array.isArray(data) ? data.filter((branch) => branch.isActive !== false) : []);
        }
      } catch {
        if (!cancelled) setBranches([]);
      } finally {
        if (!cancelled) setLoadingBranches(false);
      }
    };
    loadBranches();
    return () => { cancelled = true; };
  }, [API]);

  useEffect(() => {
    fetch(`${API}/api/settings`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => setSettings(data))
      .catch(() => { });

    if (user) {
      // Sync cart
      fetch(`${API}/api/cart`, { credentials: 'include' }).then(r=>r.json()).then(data => {
        if(data && data.items) {
          setCart(data.items.map(i => ({...i.productId, quantity: i.quantity})));
        }
      });
    }
  }, [user, API]);

  async function addToCart(p, redirectToCheckout = false) {
    // Add to localStorage for checkout flow
    const saved = localStorage.getItem('cartItems') || '[]';
    const cartItems = JSON.parse(saved);
    const existingItem = cartItems.find(item => item.id === p.id);
    
    if (existingItem) {
      existingItem.qty = (existingItem.qty || 1) + 1;
    } else {
      cartItems.push({
        id: p.id,
        name: p.name,
        price: p.price,
        image: p.image || p.imageUrl || p.images?.[0] || '',
        qty: 1,
      });
    }
    localStorage.setItem('cartItems', JSON.stringify(cartItems));

    // Sync with backend if user is logged in
    if (user) {
      try {
        await fetch(`${API}/api/cart`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json'},
          body: JSON.stringify({ productId: p.id, quantity: 1 }),
          credentials: 'include'
        });
      } catch (e) { console.error('Backend cart sync failed'); }
    }

    // Redirect to delivery details page
    routerNavigate('/delivery-details');
  }

  function navigate(to) {
    setView(to);
    if (to === 'tyres') setActiveFilter('Tyres');
    else if (to === 'accessories') setActiveFilter('Accessories');
    else if (to === 'home') setActiveFilter('All');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const cartCount = cart.reduce((a, b) => a + b.quantity, 0);
  const showProducts = view === 'home' || view === 'tyres' || view === 'accessories';

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 font-sans selection:bg-rose-600 selection:text-white overflow-x-hidden">
      <BackgroundAnimation />
      <SiteNavbar currentView={view} onNavigate={navigate} cartCount={cartCount} onOpenCart={() => setIsCartOpen(true)} settings={settings} user={user} onLogout={logout} products={products} />

      <main className="relative z-20">
        {view === 'home' && <HomeView settings={settings} onNavigate={navigate} />}
        {showProducts && (
          <ProductsSection
            products={products}
            loading={loadingProducts}
            error={productError}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            onAddToCart={addToCart}
            currentView={view}
            onNavigate={navigate}
            settings={settings}
          />
        )}
        {showProducts && <BranchesPreviewSection branches={branches} />}
        {view === 'contactus' && <ContactView branches={branches} loading={loadingBranches} settings={settings} />}
        {view === 'account' && <AccountView user={user} />}
      </main>

      <footer className="relative z-20 pt-48 pb-16 px-6 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-24 mb-32">
          <div className="md:col-span-2 space-y-12">
            <PremiumLogo settings={settings} />
            <p className="text-zinc-500 text-xl font-medium leading-relaxed max-w-lg">
              {settings?.footerText || "Redefining the boundaries of automotive performance through precision engineering and visionary service standards."}
            </p>
            <div className="flex items-center space-x-8">
               {['INSTAGRAM', 'FACEBOOK', 'TWITTER', 'LINKEDIN'].map(social => (
                 <a key={social} href="#" className="text-[10px] font-black tracking-[0.3em] text-zinc-700 hover:text-rose-600 transition-colors uppercase">{social}</a>
               ))}
            </div>
          </div>
          
          <div>
            <h4 className="text-white font-black uppercase text-xs tracking-[0.4em] mb-12 italic">The Collection</h4>

        <div className="fixed bottom-24 right-4 z-[110] md:bottom-8">
          <a
            href={`https://wa.me/${settings?.whatsapp || '917006628255'}?text=${encodeURIComponent('Hi Zain\'s Tyres, I need help finding the right tyre.')}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-[0_20px_50px_rgba(34,197,94,0.35)] transition-transform hover:scale-105"
            aria-label="WhatsApp us"
          >
            <Smartphone size={20} />
          </a>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-[105] border-t border-white/10 bg-[#0b0b0c]/95 px-3 py-3 backdrop-blur-xl md:hidden">
          <div className="grid grid-cols-5 gap-2 text-center">
            {[
              { label: 'Home', action: () => navigate('home'), icon: <Car size={16} /> },
              { label: 'Search', action: () => { window.location.href = '/search'; }, icon: <Search size={16} /> },
              { label: 'Shop', action: () => navigate('tyres'), icon: <Package size={16} /> },
              { label: 'Branch', action: () => { window.location.href = '/branches'; }, icon: <MapPin size={16} /> },
              { label: 'Bag', action: () => setIsCartOpen(true), icon: <ShoppingBag size={16} /> },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={item.action}
                className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded-2xl border border-white/5 bg-white/[0.03] py-2 text-[9px] font-black uppercase tracking-[0.25em] text-zinc-400 transition-colors hover:text-white"
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>
            <ul className="space-y-6">
              <li onClick={() => navigate('tyres')} className="text-zinc-500 hover:text-rose-500 cursor-pointer transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-3 group">
                <div className="w-1 h-1 bg-rose-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /> Tyres Studio
              </li>
              <li onClick={() => window.location.href = '/branches'} className="text-zinc-500 hover:text-rose-500 cursor-pointer transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-3 group">
                <div className="w-1 h-1 bg-rose-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /> Branches
              </li>
              <li onClick={() => navigate('accessories')} className="text-zinc-500 hover:text-rose-500 cursor-pointer transition-all font-black uppercase text-[10px] tracking-widest flex items-center gap-3 group">
                <div className="w-1 h-1 bg-rose-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" /> Performance Add-ons
              </li>
              <li className="text-zinc-500 font-black uppercase text-[10px] tracking-widest opacity-30 cursor-not-allowed">Specialty Units</li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black uppercase text-xs tracking-[0.4em] mb-12 italic">Studio Info</h4>
            <ul className="space-y-6">
              <li className="text-zinc-500 hover:text-white cursor-pointer transition-all font-black uppercase text-[10px] tracking-widest">Maintenance Guide</li>
              <li className="text-zinc-500 hover:text-white cursor-pointer transition-all font-black uppercase text-[10px] tracking-widest">Network Coverage</li>
              <li className="text-zinc-500 hover:text-white cursor-pointer transition-all font-black uppercase text-[10px] tracking-widest">Brand Credentials</li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10 border-t border-white/5 pt-16">
          <p className="text-[10px] font-black text-zinc-700 uppercase tracking-[0.4em]">
            © 2026 {settings?.storeName?.toUpperCase() || 'ZAINTYRES'} PERFORMANCE STUDIO. ALL RIGHTS RESERVED.
          </p>
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.4em]">
            MADE BY <span className="text-rose-600">RITIK SHARMA</span>
          </p>
          <div className="flex items-center space-x-10">
            <span onClick={() => window.location.href = '/privacy-policy'} className="text-[9px] font-black text-zinc-600 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Privacy Protocol</span>
            <span onClick={() => window.location.href = '/terms'} className="text-[9px] font-black text-zinc-600 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Ownership Terms</span>
            <span onClick={() => window.location.href = '/refund-policy'} className="text-[9px] font-black text-zinc-600 uppercase tracking-widest cursor-pointer hover:text-white transition-colors">Refund Policy</span>
          </div>
        </div>
      </footer>


      {isCartOpen && <CartSidebar cart={cart} setCart={setCart} onClose={() => setIsCartOpen(false)} settings={settings} API={API} user={user} />}

      <style>{`
        .text-glow { text-shadow: 0 0 40px rgba(225,29,72,0.3); }
      `}</style>
    </div>
  );
}

function MaintenancePage({ message }) {
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100 flex items-center justify-center px-6">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-600/10 border border-rose-500/20 text-3xl">
          🚧
        </div>
        <h1 className="text-3xl font-black italic uppercase tracking-tighter text-white mb-4">
          We'll Be <span className="text-rose-600">Right Back</span>
        </h1>
        <p className="text-zinc-400 text-sm leading-relaxed">
          {message || "We're currently upgrading the store to serve you better. Please check back shortly."}
        </p>
      </div>
    </div>
  );
}

function MaintenanceGate({ children }) {
  const { user, API } = useAuth();
  const location = useLocation();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/settings`)
      .then(r => r.ok ? r.json() : {})
      .then(data => setSettings(data))
      .catch(() => setSettings({}));
  }, [API]);

  const bypassPaths = ['/khelgavalo', '/yehlepakadmerachoco', '/admin', '/login', '/auth', '/signup'];
  const isBypassPath = bypassPaths.some((p) => location.pathname.startsWith(p));

  // Fail open: while settings haven't loaded yet, show the site normally
  // rather than blocking on a blank screen.
  if (settings?.maintenanceMode && user?.role !== 'admin' && !isBypassPath) {
    return <MaintenancePage message={settings?.maintenanceMessage} />;
  }

  return children;
}

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white text-xl font-black tracking-widest">Verifying Access...</div>;
  if (!user) return <Navigate to={adminOnly ? '/khelgavalo' : '/login'} replace />;
  if (user.isBlocked) return <Navigate to={adminOnly ? '/khelgavalo' : '/login'} replace />;
  if (adminOnly && user.role !== 'admin') {
    console.warn('Access denied — user role:', user.role, '| email:', user.email);
    return <Navigate to="/khelgavalo" replace />;
  }
  
  return children;
}

// ─── Root App with Router ─────────────────────────────────────────────────────
export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
          <MaintenanceGate>
          <Routes>
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/login" element={<AuthPage />} />
            <Route path="/signup" element={<AuthPage />} />
            <Route path="/khelgavalo" element={<Khelgavalo />} />
            <Route path="/shop" element={<TyresShop />} />
            <Route path="/tyres" element={<TyresShop />} />
            <Route path="/branches" element={<BranchesPage />} />
            <Route path="/locate" element={<BranchesPage />} />
            <Route path="/studios" element={<BranchesPage />} />
            <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/refund-policy" element={<RefundPolicyPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/product/:tyreId" element={<ProductDetailPage />} />
            <Route path="/tyres/:tyreId" element={<TyreDetail />} />
            <Route path="/admin" element={
              <ProtectedRoute adminOnly={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin/branches" element={
              <ProtectedRoute adminOnly={true}>
                <AdminBranchesPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/reviews" element={
              <ProtectedRoute adminOnly={true}>
                <AdminReviewsPage />
              </ProtectedRoute>
            } />
            <Route path="/admin/tyres/new" element={
              <ProtectedRoute adminOnly={true}>
                <AdminTyreForm />
              </ProtectedRoute>
            } />
            <Route path="/admin/tyres/:tyreId" element={
              <ProtectedRoute adminOnly={true}>
                <AdminTyreForm />
              </ProtectedRoute>
            } />
            
            <Route path="/yehlepakadmerachoco" element={
              <ProtectedRoute adminOnly={true}>
                <AdminPanel />
              </ProtectedRoute>
            } />
            <Route path="/yehlepakadmerachoco/:tab" element={
              <ProtectedRoute adminOnly={true}>
                <AdminPanel />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/profile" element={<Navigate to="/" replace />} />
            
            <Route path="/delivery-details" element={<DeliveryDetailsPage />} />
            <Route path="/checkout" element={<CheckoutWrapper />} />
            <Route path="/order-confirmation/:orderId" element={<OrderSuccess />} />
            <Route path="/*" element={<PublicApp />} />
          </Routes>
          </MaintenanceGate>
          </Suspense>
        </Router>
      </ToastProvider>
    </AuthProvider>
  );
}

// Wrapper to pass guest cart data into checkout
function CheckoutWrapper() {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('cartItems');
      if (!saved) return;
      const items = JSON.parse(saved);
      if (!Array.isArray(items)) return;
      const normalized = items
        .map((item) => ({
          id: item.id || item.productId || item._id,
          name: item.name || item.title || 'Item',
          image: item.image || item.imageUrl || item.images?.[0] || '',
          price: Number(item.price || item.unitPrice || 0),
          qty: Number(item.qty || item.quantity || 1),
        }))
        .filter((item) => item.id && item.price > 0 && item.qty > 0);
      setCart(normalized);
    } catch {
      setCart([]);
    }
  }, []);

  const clearCart = () => {
    localStorage.removeItem('cartItems');
    setCart([]);
  };

  return <Checkout cart={cart} clearCart={clearCart} />;
}
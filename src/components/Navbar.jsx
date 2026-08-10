import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { LogOut, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import SearchBar from './SearchBar';

const navItems = [
  { label: 'Studio', path: '/', key: 'home' },
  { label: 'Inventory Tyres', path: '/shop', key: 'tyres' },
  { label: 'Add-ons', path: '/addons', key: 'addons' },
  { label: 'The Hub', path: '/hub', key: 'hub' },
];

export default function Navbar({ cartCount = 0, onOpenCart, currentView = 'home', settings, user, onLogout, products = [] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setMobileSearchOpen(false);
  }, [location.pathname]);

  const goTo = (path) => {
    navigate(path);
  };

  return (
    <nav className={`fixed left-0 top-0 z-[100] w-full transition-all duration-700 ${scrolled ? 'py-4' : 'py-8'}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className={`glass-panel flex items-center justify-between rounded-[2.5rem] px-4 py-3 transition-all duration-700 sm:px-6 lg:px-8 ${scrolled ? 'border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]' : 'border-transparent bg-transparent'}`}>
          <Link to="/" className="min-w-0 shrink-0 text-left transition-transform hover:scale-105">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-rose-600 bg-zinc-900 shadow-[0_0_20px_rgba(225,29,72,0.3)]">
                <div className="h-5 w-5 rounded-full border-2 border-zinc-600 bg-zinc-800" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black uppercase tracking-tighter text-white sm:text-xl">ZAINS <span className="text-rose-500">TYRES</span></p>
                <p className="hidden text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500 sm:block">Trusted Tyre Dealer</p>
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-8 xl:flex">
            {navItems.map((item) => {
              const isActive = currentView === item.key || location.pathname === item.path;
              return (
                <Link
                  key={item.key}
                  to={item.path}
                  className={`relative text-[11px] font-black uppercase tracking-[0.3em] transition-colors ${isActive ? 'text-rose-500' : 'text-zinc-400 hover:text-white'}`}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="hidden min-w-0 flex-1 items-center justify-center px-5 lg:flex xl:px-8">
            <div className="w-full max-w-[26rem] transition-all duration-300 focus-within:max-w-[32rem]">
              <SearchBar items={products} placeholder="Search tyres, brands, or sizes" compact className="w-full" />
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((value) => !value)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Open search"
            >
              <Search size={18} />
            </button>

            <Link to="/bag" className="relative inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 transition-all hover:bg-white/10">
              <ShoppingCart size={18} className="text-white transition-colors hover:text-rose-500" />
              <span className="ml-2 hidden text-[10px] font-black uppercase tracking-widest text-white sm:inline">Bag</span>
              {cartCount > 0 && <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-lg bg-rose-600 px-1 text-[9px] font-black text-white">{cartCount}</span>}
            </Link>

            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  to="/"
                  className="hidden min-h-[44px] items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 transition-all hover:border-rose-500/50 hover:bg-white/10 md:flex"
                >
                  {user.profileImage ? (
                    <img src={user.profileImage} loading="lazy" decoding="async" className="h-6 w-6 rounded-lg object-cover" alt="" />
                  ) : (
                    <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-rose-600 text-[10px] font-black text-white">{user.name?.charAt(0) || user.email?.charAt(0)}</div>
                  )}
                  <span className="hidden text-[10px] font-black uppercase tracking-widest text-white sm:inline">{user.name?.split(' ')[0] || user.email?.split('@')[0] || 'Profile'}</span>
                </Link>

                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white"
                  title="Logout"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              <button type="button" onClick={() => navigate('/login')} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white" title="Login">
                <User size={18} />
              </button>
            )}

            <button type="button" onClick={() => setMobileOpen((value) => !value)} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-400 transition-colors hover:bg-white/10 hover:text-white xl:hidden" aria-label="Open menu">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileSearchOpen && (
          <div className="mt-3 rounded-[2rem] border border-white/10 bg-[#09090b]/95 p-3 shadow-2xl backdrop-blur-xl xl:hidden">
            <SearchBar items={products} placeholder="Search tyres, brands, or sizes" className="w-full" autoFocus />
          </div>
        )}

        {mobileOpen && (
          <div className="mt-3 rounded-[2rem] border border-white/10 bg-[#09090b]/95 p-4 shadow-2xl backdrop-blur-xl xl:hidden">
            <div className="grid gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.key}
                  to={item.path}
                  className="flex min-h-[44px] items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-left text-sm font-black uppercase tracking-[0.25em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <span>{item.label}</span>
                  <span className="text-rose-500">›</span>
                </Link>
              ))}
              <Link to="/branches" className="flex min-h-[44px] items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-left text-sm font-black uppercase tracking-[0.25em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white">
                <span>Branches</span>
                <span className="text-rose-500">›</span>
              </Link>
              <Link to="/" className="flex min-h-[44px] items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-left text-sm font-black uppercase tracking-[0.25em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white">
                <span>Home</span>
                <span className="text-rose-500">›</span>
              </Link>
              <Link to="/bag" className="flex min-h-[44px] items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-left text-sm font-black uppercase tracking-[0.25em] text-zinc-300 transition-colors hover:bg-white/[0.06] hover:text-white">
                <span>My Bag</span>
                <span className="text-rose-500">›</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
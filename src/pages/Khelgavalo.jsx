import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Loader2, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCustomToast } from '../context/ToastContext';

const Khelgavalo = () => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { API, checkAuth } = useAuth();
  const { toast } = useCustomToast();

  useEffect(() => {
    const redirectIfAdmin = async () => {
      try {
        const user = await checkAuth();
        if (user?.role === 'admin') {
          navigate('/yehlepakadmerachoco');
        }
      } catch (err) {
        // Ignore, user is not authenticated yet.
      }
    };

    redirectIfAdmin();
  }, [checkAuth, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API}/api/auth/admin-password-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Admin Access Granted');
        await checkAuth();
        navigate('/yehlepakadmerachoco');
      } else {
        toast.error(data.message || 'Incorrect Password');
      }
    } catch (err) {
      toast.error('Connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden font-['Inter']">
      {/* Background Aesthetics - Matching the landing page style */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-0 w-full h-full opacity-[0.03] bg-[linear-gradient(to_right,#888_1px,transparent_1px),linear-gradient(to_bottom,#888_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-6"
      >
        <div className="bg-zinc-900/50 backdrop-blur-3xl rounded-[3rem] p-10 border border-white/5 shadow-[0_0_100px_rgba(0,0,0,1)]">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-rose-600 mb-6 text-white shadow-[0_0_30px_rgba(225,29,72,0.3)]">
              <ShieldCheck size={40} />
            </div>
            <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase">Admin Gate</h1>
            <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em] mt-2 italic">Enter Secret Access Code</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-zinc-600 group-focus-within:text-rose-500 transition-colors">
                <ShieldCheck size={18} />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ADMIN USERNAME"
                className="w-full bg-white/5 border border-white/5 text-white rounded-2xl py-5 pl-14 pr-5 outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all placeholder:text-zinc-700 font-black tracking-widest text-sm"
                autoComplete="username"
              />
            </div>

            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-zinc-600 group-focus-within:text-rose-500 transition-colors">
                <Lock size={18} />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ACCESS PASSWORD"
                className="w-full bg-white/5 border border-white/5 text-white rounded-2xl py-5 pl-14 pr-5 outline-none focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/5 transition-all placeholder:text-zinc-700 font-black tracking-widest text-sm"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full bg-rose-600 hover:bg-rose-700 text-white font-black italic uppercase tracking-tighter py-5 rounded-2xl transition-all shadow-[0_15px_30px_rgba(225,29,72,0.3)] disabled:opacity-50 flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  VERIFYING...
                </>
              ) : (
                <>
                  ACCESS DASHBOARD <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-white/5 text-center">
            <button 
              onClick={() => navigate('/')}
              className="text-[9px] font-black text-zinc-600 hover:text-rose-500 uppercase tracking-[0.4em] transition-colors italic"
            >
              ← RETURN TO STUDIO
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Khelgavalo;

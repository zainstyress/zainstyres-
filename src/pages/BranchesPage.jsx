import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, MapPin } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import BranchCard from '../components/BranchCard';

export default function BranchesPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const { API } = useAuth();

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
        if (!cancelled) setLoading(false);
      }
    };
    loadBranches();
    return () => { cancelled = true; };
  }, [API]);

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white">
            <ArrowLeft size={16} /> Back home
          </Link>
          <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-rose-300">
            <MapPin size={14} /> Find us
          </div>
        </div>

        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(225,29,72,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 md:p-10">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-rose-400">Our Locations</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">Find the nearest Zain&apos;s Tyres studio.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">Visit any of our active branches for tyre fitting, balancing, wheel alignment, puncture repair, and premium automotive support.</p>
        </section>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="h-[680px] animate-pulse rounded-[32px] border border-white/5 bg-white/[0.03]" />
            ))}
          </div>
        ) : branches.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2">
            {branches.map((branch) => (
              <BranchCard key={branch.id} branch={branch} variant="full" />
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-zinc-400">
            No active branches found.
          </div>
        )}
      </div>
    </div>
  );
}

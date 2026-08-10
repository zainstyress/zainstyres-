import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Filter, Trash2, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { deleteTyreReview, listenAllReviews, setReviewVerified } from '../lib/tyres';
import ReviewCard from '../components/ReviewCard';

const FILTERS = [
  { key: 'all', label: 'All Reviews' },
  { key: 'verified', label: 'Verified' },
  { key: 'pending', label: 'Pending' },
];

export default function AdminReviewsPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [actionId, setActionId] = useState('');

  useEffect(() => {
    const isAdmin = user?.role === 'admin';
    if (!loading && !isAdmin) {
      navigate('/login');
    }
  }, [loading, navigate, user]);

  useEffect(() => {
    const unsubscribe = listenAllReviews(setReviews);
    return () => unsubscribe();
  }, []);

  const visibleReviews = useMemo(() => {
    const query = search.trim().toLowerCase();

    return reviews.filter((review) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'verified' && review.verified) ||
        (filter === 'pending' && !review.verified);

      const searchTarget = [review.tyreName, review.tyreBrand, review.tyreId, review.userName, review.reviewText]
        .join(' ')
        .toLowerCase();

      const matchesSearch = !query || searchTarget.includes(query);

      return matchesFilter && matchesSearch;
    });
  }, [filter, reviews, search]);

  const stats = useMemo(() => {
    const verified = reviews.filter((review) => review.verified).length;
    const pending = reviews.length - verified;
    return { total: reviews.length, verified, pending };
  }, [reviews]);

  const handleToggleVerified = async (review) => {
    setActionId(review.id);
    try {
      await setReviewVerified(review.id, !review.verified);
    } catch (error) {
      console.error('Failed to update review status', error);
    } finally {
      setActionId('');
    }
  };

  const handleDelete = async (review) => {
    if (!window.confirm('Delete this review?')) return;

    setActionId(review.id);
    try {
      await deleteTyreReview(review.id);
    } catch (error) {
      console.error('Failed to delete review', error);
    } finally {
      setActionId('');
    }
  };

  if (loading || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-[#050505] px-4 py-10 text-white md:px-6">
        <div className="mx-auto max-w-3xl rounded-[32px] border border-white/5 bg-white/[0.03] p-8">
          <p className="text-sm text-zinc-400">Loading admin access...</p>
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
            <h1 className="mt-2 text-3xl font-black text-white">Review moderation</h1>
          </div>
          <Link to="/admin" className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]">
            Back to admin
          </Link>
        </div>

        <section className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            ['Total reviews', stats.total],
            ['Verified', stats.verified],
            ['Pending', stats.pending],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">{label}</p>
              <p className="mt-3 text-3xl font-black text-white">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-8 rounded-[32px] border border-white/5 bg-white/[0.03] p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.3em] text-zinc-500">
              <Filter size={14} />
              Filters
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.25em] transition-colors ${
                    filter === item.key
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                      : 'border-white/10 bg-black/30 text-zinc-400 hover:text-white'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by user, tyre or text"
              className="ml-auto w-full max-w-md rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/50"
            />
          </div>

          <div className="mt-6 space-y-4">
            {visibleReviews.length > 0 ? (
              visibleReviews.map((review) => (
                <div key={review.id} className="rounded-[28px] border border-white/5 bg-black/30 p-4 md:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1">
                      <ReviewCard review={review} />
                      <div className="mt-4 grid gap-3 text-sm text-zinc-400 md:grid-cols-3">
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Tyre</p>
                          <p className="mt-2 font-semibold text-white">{review.tyreName || review.tyreId || 'Unknown tyre'}</p>
                          <p className="mt-1 text-xs text-zinc-500">{review.tyreBrand || 'Brand not set'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Status</p>
                          <p className="mt-2 font-semibold text-white">{review.verified ? 'Verified purchase' : 'Pending review'}</p>
                          <p className="mt-1 text-xs text-zinc-500">{review.verified ? 'Visible as trusted feedback' : 'Needs moderation'}</p>
                        </div>
                        <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-4">
                          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Review ID</p>
                          <p className="mt-2 break-all font-semibold text-white">{review.id}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 md:w-56">
                      <button
                        type="button"
                        onClick={() => handleToggleVerified(review)}
                        disabled={actionId === review.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.25em] text-emerald-200 transition-colors hover:bg-emerald-500/15 disabled:opacity-50"
                      >
                        {review.verified ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                        {review.verified ? 'Unverify' : 'Verify'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(review)}
                        disabled={actionId === review.id}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.25em] text-rose-200 transition-colors hover:bg-rose-500/15 disabled:opacity-50"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                      <div className="rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-3 text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">
                        {actionId === review.id ? 'Working...' : review.verified ? 'Verified' : 'Pending'}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-[28px] border border-dashed border-white/10 bg-black/20 p-8 text-center">
                <CheckCircle2 className="mx-auto text-zinc-500" size={24} />
                <p className="mt-4 text-sm font-semibold text-white">No reviews match the current filters.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
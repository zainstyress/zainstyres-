import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send } from 'lucide-react';
import StarRating from './StarRating';

export default function ReviewForm({ user, existingReview, onSubmit, submitting = false }) {
  const [rating, setRating] = useState(existingReview?.rating || 0);
  const [reviewText, setReviewText] = useState(existingReview?.reviewText || '');
  const [error, setError] = useState('');

  useEffect(() => {
    setRating(existingReview?.rating || 0);
    setReviewText(existingReview?.reviewText || '');
    setError('');
  }, [existingReview]);

  if (!user) {
    return (
      <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-6 md:p-8">
        <h3 className="text-lg font-bold text-white">Login to write a review</h3>
        <p className="mt-2 text-sm text-zinc-400">Sign in to post feedback and manage your review later.</p>
        <Link to="/login" className="mt-5 inline-flex rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-500">
          Login
        </Link>
      </div>
    );
  }

  const isEditing = !!existingReview;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!rating) {
      setError('Please select a rating.');
      return;
    }

    if (!reviewText.trim()) {
      setError('Please write your review.');
      return;
    }

    setError('');
    await onSubmit({ rating, reviewText: reviewText.trim() });
  };

  return (
    <div className="rounded-[28px] border border-white/5 bg-white/[0.03] p-6 md:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit Review' : 'Write a Review'}</h3>
          <p className="mt-1 text-sm text-zinc-400">{isEditing ? 'Update your existing review for this tyre.' : 'Share your experience with this tyre.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Your rating</label>
          <StarRating value={rating} onChange={setRating} size={22} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Your review</label>
          <textarea
            value={reviewText}
            onChange={(event) => setReviewText(event.target.value)}
            placeholder="Write your review..."
            rows={5}
            className="w-full rounded-3xl border border-white/10 bg-[#09090b] px-4 py-4 text-sm text-white outline-none transition-colors placeholder:text-zinc-600 focus:border-rose-500/50"
          />
        </div>

        {error && <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-semibold text-rose-300">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
          {submitting ? 'Posting...' : isEditing ? 'Update Review' : 'Post Review'}
        </button>
      </form>
    </div>
  );
}
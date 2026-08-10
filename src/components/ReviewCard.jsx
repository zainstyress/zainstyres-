import React from 'react';
import StarRating from './StarRating';

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const formatDate = (value) => {
  if (!value) return 'Recently';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently';
  return dateFormatter.format(date);
};

export default function ReviewCard({ review }) {
  const initials = review.userName?.trim()?.charAt(0)?.toUpperCase() || 'U';

  return (
    <article className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 text-sm font-black text-white">
          {review.userPhoto ? <img src={review.userPhoto} alt={review.userName} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-base font-bold text-white">{review.userName}</h3>
            {review.verified && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300">
                Verified Purchase
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StarRating value={review.rating} readOnly size={14} />
            <span className="text-xs text-zinc-500">{formatDate(review.createdAt)}</span>
          </div>
        </div>
      </div>

      <p className="mt-4 text-sm leading-7 text-zinc-300">{review.reviewText}</p>
    </article>
  );
}
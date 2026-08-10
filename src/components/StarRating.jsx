import React from 'react';
import { Star } from 'lucide-react';

export default function StarRating({ value = 0, onChange, readOnly = false, size = 18, className = '' }) {
  const roundedValue = Math.round(Number(value || 0));

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {[1, 2, 3, 4, 5].map((rating) => {
        const filled = rating <= roundedValue;
        const star = <Star size={size} className={filled ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'} />;

        if (readOnly || !onChange) {
          return <span key={rating}>{star}</span>;
        }

        return (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className="transition-transform hover:scale-110"
            aria-label={`${rating} star${rating === 1 ? '' : 's'}`}
          >
            {star}
          </button>
        );
      })}
    </div>
  );
}
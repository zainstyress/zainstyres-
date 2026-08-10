import React, { useEffect, useState } from 'react';

export default function ImageGallery({ images = [], activeIndex: activeIndexProp, onSelect }) {
  const [internalIndex, setInternalIndex] = useState(0);
  const hasMultipleImages = images.length > 1;
  const activeIndex = typeof activeIndexProp === 'number' ? activeIndexProp : internalIndex;
  const activeImage = images[activeIndex] || images[0] || '';

  useEffect(() => {
    if (activeIndex >= images.length) {
      const nextIndex = Math.max(images.length - 1, 0);
      if (typeof activeIndexProp !== 'number') {
        setInternalIndex(nextIndex);
      } else if (onSelect) {
        onSelect(nextIndex);
      }
    }
  }, [activeIndex, activeIndexProp, images.length, onSelect]);

  const handleSelect = (index) => {
    if (onSelect) {
      onSelect(index);
      return;
    }

    setInternalIndex(index);
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.03]">
        {activeImage ? (
          <img src={activeImage} alt="Tyre preview" loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="aspect-[4/3] w-full bg-white/[0.03]" />
        )}
      </div>

      {hasMultipleImages && (
        <div className="grid grid-cols-5 gap-3 md:grid-cols-8">
          {images.map((image, index) => (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => handleSelect(index)}
              className={`overflow-hidden rounded-2xl border transition-all ${
                index === activeIndex
                  ? 'border-rose-500/60 ring-2 ring-rose-500/20'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <img src={image} alt={`Thumbnail ${index + 1}`} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
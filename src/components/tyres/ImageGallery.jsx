import React from 'react';

export default function ImageGallery({ images = [], activeIndex = 0, onSelect }) {
  const active = images[activeIndex] || images[0] || '';

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5">
        {active ? <img src={active} alt="Tyre preview" loading="lazy" decoding="async" className="aspect-[4/3] w-full object-cover" /> : <div className="aspect-[4/3] w-full bg-white/5" />}
      </div>
      <div className="grid grid-cols-5 gap-3 md:grid-cols-10">
        {images.map((image, index) => (
          <button key={`${image}-${index}`} onClick={() => onSelect(index)} className={`overflow-hidden rounded-2xl border transition-all ${index === activeIndex ? 'border-orange-500/50 ring-2 ring-orange-500/20' : 'border-white/10 hover:border-white/20'}`}>
            <img src={image} alt={`Thumbnail ${index + 1}`} loading="lazy" decoding="async" className="aspect-square w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

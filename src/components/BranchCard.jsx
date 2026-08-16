import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, Building2, Clock3, MapPin, PhoneCall } from 'lucide-react';

const placeholderStyles = 'flex aspect-[4/3] w-full items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(225,29,72,0.22),transparent_35%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]';

function getWhatsAppLink(branchName, whatsapp) {
  const message = encodeURIComponent(`Hi! I'm enquiring about Zain's Tyres ${branchName}`);
  const phone = (whatsapp || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${phone}?text=${message}`;
}

function inferCityFromAddress(address) {
  if (!address || typeof address !== 'string') return '';
  const parts = address.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) return '';
  const cityCandidate = parts[parts.length - 2] || parts[0];
  return cityCandidate.replace(/\s+/g, ' ');
}

export default function BranchCard({ branch, variant = 'full', onViewBranch }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const images = useMemo(() => (Array.isArray(branch.images) ? branch.images.filter(Boolean) : []), [branch.images]);
  const activeImage = images[activeImageIndex] || images[0] || '';
  const isCompact = variant === 'compact';
  const cityLabel = branch.city || inferCityFromAddress(branch.address) || 'Mumbai';
  const timingsLabel = branch.timings || branch.hours || 'Timings not available';

  const handleDirections = () => {
    if (branch.mapLink) {
      window.open(branch.mapLink, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCall = () => {
    if (branch.phone) {
      window.location.href = `tel:${branch.phone}`;
    }
  };

  const handleWhatsApp = () => {
    if (branch.whatsapp) {
      window.open(getWhatsAppLink(branch.name, branch.whatsapp), '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article className="overflow-hidden rounded-[32px] border border-white/5 bg-white/[0.03] transition-all hover:border-rose-500/20 hover:bg-white/[0.05]">
      <div className="p-4 md:p-5">
        {activeImage ? (
          <div className="space-y-4">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/40">
              <img src={activeImage} alt={branch.name} loading="lazy" decoding="async" className={`${isCompact ? 'h-40 md:h-48' : 'h-56 md:h-72'} w-full object-cover`} />
            </div>

            {!isCompact && images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((image, index) => (
                  <button
                    key={`${branch.id}-${image}-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className={`h-16 w-16 flex-shrink-0 overflow-hidden rounded-2xl border transition-all ${index === activeImageIndex ? 'border-rose-500/60 ring-2 ring-rose-500/20' : 'border-white/10 hover:border-white/20'}`}
                  >
                    <img src={image} alt={`${branch.name} thumbnail ${index + 1}`} loading="lazy" decoding="async" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className={`${placeholderStyles} rounded-[28px] border border-white/10`}>
            <div className="text-center">
              <Building2 size={40} className="mx-auto text-rose-500/60" />
              <p className="mt-3 text-lg font-black uppercase tracking-[0.25em] text-white">{branch.name || 'Zain&apos;s Tyres'}</p>
            </div>
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className={`${isCompact ? 'text-xl md:text-2xl' : 'text-2xl md:text-3xl'} font-black italic uppercase tracking-tighter text-white`}>
                  {branch.name || 'Branch'}
                </h3>
                {branch.isPrimary && (
                  <span className="rounded-full bg-rose-600 px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] text-white">
                    Main Branch
                  </span>
                )}
              </div>
              {!isCompact && <p className="mt-1 text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">{cityLabel}</p>}
            </div>
            {!isCompact && (
              <BadgeCheck size={20} className={`shrink-0 ${branch.isActive ? 'text-emerald-400' : 'text-zinc-600'}`} />
            )}
          </div>

          <div className="space-y-3 text-sm text-zinc-300">
            <p className="flex items-start gap-2">
              <MapPin size={16} className="mt-0.5 shrink-0 text-rose-500" />
              <span>{branch.address || 'Address not available'}</span>
            </p>
            <p className="flex items-start gap-2">
              <Clock3 size={16} className="mt-0.5 shrink-0 text-rose-500" />
              <span>{timingsLabel}</span>
            </p>
            <p className="flex items-start gap-2">
              <PhoneCall size={16} className="mt-0.5 shrink-0 text-rose-500" />
              <a href={`tel:${branch.phone || ''}`} className="text-white transition-colors hover:text-rose-400">{branch.phone || 'Phone not available'}</a>
            </p>
          </div>

          {Array.isArray(branch.services) && branch.services.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {branch.services.map((service) => (
                <span key={service} className="rounded-full border border-rose-500/20 bg-black/30 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-300">
                  {service}
                </span>
              ))}
            </div>
          )}

          <div className={`grid gap-3 ${isCompact ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>
            {isCompact ? (
              <Link
                to="/branches"
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black uppercase tracking-[0.25em] text-black transition-transform hover:scale-[1.01]"
              >
                View Branch <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <button type="button" onClick={handleDirections} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-black uppercase tracking-[0.25em] text-white transition-colors hover:bg-white/[0.08]">
                  Get Directions
                </button>
                <button type="button" onClick={handleCall} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-xs font-black uppercase tracking-[0.25em] text-black transition-transform hover:scale-[1.01]">
                  Call Now
                </button>
                <button type="button" onClick={handleWhatsApp} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-xs font-black uppercase tracking-[0.25em] text-rose-200 transition-colors hover:bg-rose-500/15">
                  WhatsApp Us
                </button>
              </>
            )}
          </div>

          {!isCompact && onViewBranch && (
            <button type="button" onClick={onViewBranch} className="inline-flex min-h-[44px] items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-rose-400 transition-colors hover:text-rose-300">
              View branch <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

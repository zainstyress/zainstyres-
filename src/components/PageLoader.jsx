import React from 'react';

export default function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-white">
      <div className="rounded-[32px] border border-white/10 bg-white/[0.04] px-8 py-10 shadow-2xl shadow-black/30">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-white/10 border-t-rose-500" />
        <p className="mt-5 text-xs font-black uppercase tracking-[0.35em] text-zinc-500">Loading page</p>
      </div>
    </div>
  );
}
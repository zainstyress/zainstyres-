import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Camera, GripVertical, Plus, Save, Trash2, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import CameraModal from '../components/CameraModal';
import { listenBranches, setBranchImages, deleteBranchImage, saveBranch, updateBranch, uploadBranchPhotos } from '../lib/branches';

const MAX_IMAGES = 10;

function compressImageFile(file, maxWidth = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, maxWidth / image.width);
        const width = Math.round(image.width * scale);
        const height = Math.round(image.height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }));
        }, 'image/jpeg', quality);
      };
      image.onerror = () => reject(new Error('Failed to load image for compression'));
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function BranchEditor({ branch }) {
  const [draft, setDraft] = useState(branch);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [dragIndex, setDragIndex] = useState(null);
  const fileInputRef = useRef(null);

  const { API } = useAuth();

  useEffect(() => {
    setDraft(branch);
  }, [branch]);

  const patch = (field, value) => setDraft((current) => ({ ...current, [field]: value }));

  const persist = async () => {
    setSaving(true);
    try {
      const payload = {
        ...draft,
        images: draft.images || [],
        services: draft.services || [],
      };

      try {
        await saveBranch(branch.id, payload);
      } catch (error) {
        console.warn('Firestore save failed, falling back to API:', error?.message || error);
        await fetch(`${API}/api/branches/${branch.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleFiles = async (files) => {
    const imageFiles = Array.from(files || []);
    if (imageFiles.length === 0) return;
    setUploading(true);
    try {
      const compressed = [];
      for (const file of imageFiles.slice(0, MAX_IMAGES - (draft.images?.length || 0))) {
        compressed.push(await compressImageFile(file));
      }
      const nextImages = await uploadBranchPhotos(branch.id, compressed, draft.images || []);
      setDraft((current) => ({ ...current, images: nextImages }));
    } finally {
      setUploading(false);
    }
  };

  const handleCameraCapture = async (files) => {
    await handleFiles(files);
  };

  const deleteImage = async (imageUrl) => {
    const nextImages = await deleteBranchImage(branch.id, imageUrl);
    setDraft((current) => ({ ...current, images: nextImages }));
  };

  const setMainImage = async (imageUrl) => {
    const nextImages = [imageUrl, ...(draft.images || []).filter((item) => item !== imageUrl)];
    await setBranchImages(branch.id, nextImages);
    setDraft((current) => ({ ...current, images: nextImages }));
  };

  const onDragStart = (index) => setDragIndex(index);
  const onDrop = async (dropIndex) => {
    if (dragIndex == null || dragIndex === dropIndex) return;
    const nextImages = [...(draft.images || [])];
    const [item] = nextImages.splice(dragIndex, 1);
    nextImages.splice(dropIndex, 0, item);
    setDragIndex(null);
    await setBranchImages(branch.id, nextImages);
    setDraft((current) => ({ ...current, images: nextImages }));
  };

  const addService = () => {
    const value = tagInput.trim();
    if (!value) return;
    const next = Array.from(new Set([...(draft.services || []), value]));
    patch('services', next);
    setTagInput('');
  };

  const removeService = (service) => {
    patch('services', (draft.services || []).filter((item) => item !== service));
  };

  return (
    <section className="rounded-[32px] border border-white/5 bg-white/[0.03] p-5 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Branch editor</p>
          <h2 className="mt-2 text-2xl font-black text-white">{draft.name || branch.id}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={persist} disabled={saving} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white disabled:opacity-50">
            <Save size={16} /> {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Name</span>
          <input value={draft.name || ''} onChange={(event) => patch('name', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">City</span>
          <input value={draft.city || ''} onChange={(event) => patch('city', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none" />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Address</span>
          <textarea value={draft.address || ''} onChange={(event) => patch('address', event.target.value)} rows={3} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Phone</span>
          <input value={draft.phone || ''} onChange={(event) => patch('phone', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">WhatsApp</span>
          <input value={draft.whatsapp || ''} onChange={(event) => patch('whatsapp', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Timings</span>
          <input value={draft.timings || ''} onChange={(event) => patch('timings', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none" />
        </label>
        <label className="block">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Map link</span>
          <input value={draft.mapLink || ''} onChange={(event) => patch('mapLink', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none" />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-2 block text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Email</span>
          <input value={draft.email || ''} onChange={(event) => patch('email', event.target.value)} className="w-full rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-white outline-none" />
        </label>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="inline-flex min-h-[44px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
          <input type="checkbox" checked={!!draft.isActive} onChange={(event) => patch('isActive', event.target.checked)} /> Active
        </label>
        <label className="inline-flex min-h-[44px] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white">
          <input type="checkbox" checked={!!draft.isPrimary} onChange={(event) => patch('isPrimary', event.target.checked)} /> Main branch
        </label>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/5 bg-black/30 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Services</p>
            <h3 className="mt-1 text-lg font-black text-white">Branch services</h3>
          </div>
          <div className="flex gap-2">
            <input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="Add service" className="min-h-[44px] rounded-2xl border border-white/10 bg-[#09090b] px-4 py-3 text-sm text-white outline-none" />
            <button type="button" onClick={addService} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white">
              <Plus size={16} /> Add
            </button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {(draft.services || []).map((service) => (
            <button key={service} type="button" onClick={() => removeService(service)} className="inline-flex min-h-[44px] items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.2em] text-rose-200">
              {service} <Trash2 size={12} />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded-[28px] border border-white/5 bg-black/30 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Branch photos</p>
            <h3 className="mt-1 text-lg font-black text-white">Up to {MAX_IMAGES} photos</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">
              <Upload size={16} /> Upload
              <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={async (event) => { await handleFiles(event.target.files); event.target.value = ''; }} />
            </label>
            <button type="button" onClick={() => setCameraOpen(true)} className="inline-flex min-h-[44px] items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white">
              <Camera size={16} /> Camera
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
          {(draft.images || []).map((imageUrl, index) => (
            <div
              key={`${branch.id}-${imageUrl}-${index}`}
              draggable
              onDragStart={() => onDragStart(index)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={() => onDrop(index)}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
            >
              <img src={imageUrl} alt={`Branch ${index + 1}`} loading="lazy" decoding="async" className="h-32 w-full object-cover" />
              {index === 0 && <span className="absolute left-2 top-2 rounded-full bg-rose-600 px-2 py-1 text-[8px] font-black uppercase tracking-[0.2em] text-white">Main</span>}
              <div className="absolute inset-0 flex items-start justify-between p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <button type="button" onClick={() => deleteImage(imageUrl)} className="rounded-full bg-black/70 p-2 text-white">
                  <Trash2 size={14} />
                </button>
                <button type="button" onClick={() => setMainImage(imageUrl)} className="rounded-full bg-black/70 p-2 text-white">
                  <GripVertical size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {uploading && <p className="mt-3 text-sm text-rose-300">Uploading photos...</p>}
      </div>

      <CameraModal
        isOpen={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onPhotosCapture={handleCameraCapture}
        remainingSlots={MAX_IMAGES - (draft.images?.length || 0)}
      />
    </section>
  );
}

export default function AdminBranchesPage() {
  const [branches, setBranches] = useState([]);
  const { API } = useAuth();

  useEffect(() => {
    const unsubscribe = listenBranches(
      setBranches,
      async (error) => {
        console.warn('Admin branch listener failed, falling back to API:', error?.message || error);
        try {
          const response = await fetch(`${API}/api/branches`);
          const data = response.ok ? await response.json() : [];
          setBranches(Array.isArray(data) ? data : []);
        } catch {
          setBranches([]);
        }
      },
    );

    return () => unsubscribe();
  }, [API]);

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex items-center justify-between gap-4">
          <Link to="/admin" className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 transition-colors hover:text-white">
            <ArrowLeft size={16} /> Back to admin
          </Link>
          <div className="rounded-full border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs font-black uppercase tracking-[0.3em] text-rose-300">
            Branch Management
          </div>
        </div>

        <section className="overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(225,29,72,0.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02))] p-6 md:p-10">
          <p className="text-[10px] font-black uppercase tracking-[0.35em] text-rose-400">Admin branches</p>
          <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">Edit branch details, services, and photos in Firestore.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">This page writes directly to the branches collection and syncs instantly to the public locations page.</p>
        </section>

        <div className="grid gap-6">
          {branches.map((branch) => <BranchEditor key={branch.id} branch={branch} />)}
        </div>

        {branches.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center text-zinc-400">
            No branches found.
          </div>
        )}
      </div>
    </div>
  );
}

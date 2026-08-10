import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Upload, Trash2, Image, ChevronRight, Filter, X } from 'lucide-react';
import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { db, storage } from '../firebase';

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BATCH_UPLOAD = 12;

const formatDate = (value) => {
  if (!value) return 'Unknown';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const branchDocPhotosCollection = (branchId) => collection(db, 'branches', branchId, 'photos');

export default function AdminBranchPhotosPage() {
  const [branches, setBranches] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [photoSearch, setPhotoSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [newBranchName, setNewBranchName] = useState('');
  const [uploads, setUploads] = useState([]);
  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const fileInputRef = useRef(null);
  const previewUrls = useRef(new Set());

  useEffect(() => {
    const branchesQuery = query(collection(db, 'branches'), orderBy('name', 'asc'));
    const unsubscribeBranches = onSnapshot(branchesQuery, (snapshot) => {
      const nextBranches = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
      setBranches(nextBranches);
    });

    const photosQuery = query(collectionGroup(db, 'photos'), orderBy('uploadedAt', 'desc'));
    const unsubscribePhotos = onSnapshot(photosQuery, (snapshot) => {
      const nextPhotos = snapshot.docs.map((docSnap) => {
        const branchId = docSnap.ref.parent.parent?.id || docSnap.data().branchId;
        return { id: docSnap.id, branchId, ...docSnap.data() };
      });
      setPhotos(nextPhotos);
    });

    return () => {
      unsubscribeBranches();
      unsubscribePhotos();
    };
  }, []);

  useEffect(() => {
    if (!selectedBranchId && branches.length) {
      setSelectedBranchId(branches[0].id);
    }
  }, [branches, selectedBranchId]);

  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId) || null;

  const filteredPhotos = useMemo(() => {
    let next = photos;
    if (selectedBranchId) {
      next = next.filter((photo) => photo.branchId === selectedBranchId);
    }
    const queryTerm = photoSearch.trim().toLowerCase();
    if (queryTerm) {
      next = next.filter((photo) => (photo.caption || '').toLowerCase().includes(queryTerm));
    }
    if (sortOrder === 'oldest') {
      next = [...next].reverse();
    }
    return next;
  }, [photos, selectedBranchId, photoSearch, sortOrder]);

  const handleAddBranch = async () => {
    const name = newBranchName.trim();
    if (!name) return;
    try {
      const docRef = await addDoc(collection(db, 'branches'), {
        name,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isActive: true,
      });
      setNewBranchName('');
      setSelectedBranchId(docRef.id);
    } catch (error) {
      console.error('Failed to create branch', error);
      alert('Could not create branch.');
    }
  };

  const createUploadItems = (files) => {
    const nextFiles = Array.from(files || [])
      .slice(0, MAX_BATCH_UPLOAD - uploads.length)
      .map((file) => {
        if (!SUPPORTED_TYPES.includes(file.type)) return null;
        const previewUrl = URL.createObjectURL(file);
        previewUrls.current.add(previewUrl);
        return {
          id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          file,
          previewUrl,
          caption: file.name.replace(/\.[^.]+$/, ''),
          progress: 0,
          status: 'ready',
          storagePath: '',
          error: '',
        };
      })
      .filter(Boolean);

    setUploads((current) => [...current, ...nextFiles]);
  };

  const handleFileInputChange = (event) => {
    createUploadItems(event.target.files);
    event.target.value = '';
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    createUploadItems(event.dataTransfer.files);
  };

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((previewUrl) => URL.revokeObjectURL(previewUrl));
      previewUrls.current.clear();
    };
  }, []);

  const removeUploadItem = (id) => {
    setUploads((current) => {
      return current.filter((item) => {
        if (item.id === id) {
          URL.revokeObjectURL(item.previewUrl);
          previewUrls.current.delete(item.previewUrl);
          return false;
        }
        return true;
      });
    });
  };

  const updateUploadCaption = (id, caption) => {
    setUploads((current) => current.map((item) => (item.id === id ? { ...item, caption } : item)));
  };

  const uploadPhotos = async () => {
    if (!selectedBranchId || !uploads.length) return;
    setIsUploading(true);

    const branchName = selectedBranch?.name || 'Branch';
    const queue = [...uploads];

    for (const uploadItem of queue) {
      const safeName = uploadItem.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `branches/${selectedBranchId}/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, storagePath);
      const task = uploadBytesResumable(storageRef, uploadItem.file, {
        contentType: uploadItem.file.type || 'image/jpeg',
      });

      await new Promise((resolve) => {
        task.on(
          'state_changed',
          (snapshot) => {
            const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
            setUploads((current) =>
              current.map((item) => (item.id === uploadItem.id ? { ...item, progress } : item))
            );
          },
          (error) => {
            console.error('Upload failed', error);
            setUploads((current) =>
              current.map((item) =>
                item.id === uploadItem.id
                  ? { ...item, status: 'error', error: 'Upload failed. Please retry.' }
                  : item
              )
            );
            resolve();
          },
          async () => {
            try {
              const imageURL = await getDownloadURL(task.snapshot.ref);
              await addDoc(branchDocPhotosCollection(selectedBranchId), {
                branchId: selectedBranchId,
                branchName,
                imageURL,
                storagePath,
                caption: uploadItem.caption || '',
                uploadedAt: serverTimestamp(),
              });
              URL.revokeObjectURL(uploadItem.previewUrl);
              previewUrls.current.delete(uploadItem.previewUrl);
              setUploads((current) => current.filter((item) => item.id !== uploadItem.id));
            } catch (error) {
              console.error('Photo metadata save failed', error);
              setUploads((current) =>
                current.map((item) =>
                  item.id === uploadItem.id
                    ? { ...item, status: 'error', error: 'Could not save metadata.' }
                    : item
                )
              );
            }
            resolve();
          }
        );
      });
    }

    setIsUploading(false);
  };

  const deletePhoto = async (photo) => {
    if (!window.confirm('Delete this photo from branch gallery?')) return;
    try {
      if (photo.storagePath) {
        await deleteObject(ref(storage, photo.storagePath));
      }
    } catch (error) {
      console.warn('Storage delete failed', error);
    }

    try {
      await deleteDoc(doc(branchDocPhotosCollection(photo.branchId), photo.id));
    } catch (error) {
      console.error('Failed to delete photo metadata', error);
      alert('Unable to delete photo metadata.');
    }
  };

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(-1);
  const showPrevious = () => setLightboxIndex((current) => Math.max(0, current - 1));
  const showNext = () => setLightboxIndex((current) => Math.min(filteredPhotos.length - 1, current + 1));

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (lightboxIndex < 0) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') showPrevious();
      if (event.key === 'ArrowRight') showNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, filteredPhotos.length]);

  const activeLightboxPhoto = filteredPhotos[lightboxIndex] || null;

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.35em] text-orange-300/80">
              <ArrowLeft size={16} />
              <Link to="/admin" className="text-orange-300 hover:text-white">Back to admin</Link>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Branch Photo Gallery Manager</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white sm:text-5xl">Upload, browse and manage branch photos in real time.</h1>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative block overflow-hidden rounded-2xl border border-white/10 bg-[#111] px-4 py-3 text-sm text-white">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                className="w-full bg-transparent pl-11 text-sm outline-none placeholder:text-zinc-500"
                placeholder="Search captions..."
                value={photoSearch}
                onChange={(event) => setPhotoSearch(event.target.value)}
              />
            </label>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#111] p-3 text-sm text-zinc-200">
              <Filter size={16} />
              <select
                value={sortOrder}
                onChange={(event) => setSortOrder(event.target.value)}
                className="bg-transparent text-sm text-white outline-none"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
            </div>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/10 bg-[#111] p-6 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-300/80">Branch selector</p>
              <p className="mt-2 text-sm text-zinc-300">Choose a branch, or add a new one to start uploading photos.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={newBranchName}
                onChange={(event) => setNewBranchName(event.target.value)}
                placeholder="New branch name"
                className="min-w-[220px] rounded-2xl border border-white/10 bg-[#0d0d10] px-4 py-3 text-sm text-white outline-none focus:border-orange-500"
              />
              <button
                type="button"
                onClick={handleAddBranch}
                className="inline-flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-black transition hover:bg-orange-400"
              >
                <Plus size={16} /> Add New Branch
              </button>
            </div>
          </div>

          <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setSelectedBranchId('')}
              className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-black transition ${selectedBranchId === '' ? 'border-orange-500 bg-orange-500/15 text-orange-200' : 'border-white/10 bg-white/5 text-zinc-300 hover:border-orange-500 hover:text-white'}`}
            >
              All Branches
            </button>
            {branches.map((branch) => (
              <button
                key={branch.id}
                type="button"
                onClick={() => setSelectedBranchId(branch.id)}
                className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-black transition ${selectedBranchId === branch.id ? 'border-orange-500 bg-orange-500/15 text-orange-200' : 'border-white/10 bg-white/5 text-zinc-300 hover:border-orange-500 hover:text-white'}`}
              >
                {branch.name}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-[#111] p-6 shadow-xl shadow-black/20">
          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[28px] border border-white/10 bg-[#0d0d10] p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Photo upload</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Upload to {selectedBranch?.name || 'Selected branch'}</h2>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl border border-orange-500 bg-orange-500/10 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-orange-200 transition hover:bg-orange-500/20"
                >
                  <Upload size={16} /> Select files
                </button>
              </div>

              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={handleDrop}
                className={`mt-6 rounded-[28px] border border-dashed ${dragActive ? 'border-orange-500 bg-orange-500/10' : 'border-white/10 bg-white/5'} p-8 text-center transition`}
              >
                <div className="mx-auto max-w-xl">
                  <Image size={42} className="mx-auto text-orange-400" />
                  <p className="mt-4 text-lg font-black text-white">Drag & drop images here</p>
                  <p className="mt-2 text-sm text-zinc-400">Only JPG, PNG and WEBP are supported.</p>
                  <p className="mt-4 text-sm text-zinc-500">Preview thumbnails appear before upload. Add captions for each photo.</p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={handleFileInputChange}
              />

              {uploads.length > 0 ? (
                <div className="mt-6 space-y-4">
                  {uploads.map((item) => (
                    <div key={item.id} className="grid gap-4 rounded-[24px] border border-white/10 bg-[#111] p-4 sm:grid-cols-[120px_minmax(0,1fr)_auto]">
                      <div className="overflow-hidden rounded-2xl bg-zinc-950">
                        <img src={item.previewUrl} alt={item.caption} className="h-full w-full object-cover" />
                      </div>
                      <div className="space-y-3">
                        <label className="block text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Caption</label>
                        <input
                          value={item.caption}
                          onChange={(event) => updateUploadCaption(item.id, event.target.value)}
                          className="w-full rounded-2xl border border-white/10 bg-[#0c0c0e] px-4 py-3 text-sm text-white outline-none"
                        />
                        <div className="h-2 overflow-hidden rounded-full bg-white/5">
                          <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${item.progress}%` }} />
                        </div>
                        {item.status === 'error' ? <p className="text-sm text-rose-400">{item.error}</p> : null}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeUploadItem(item.id)}
                        className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10"
                        aria-label="Remove upload"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-zinc-400">Ready to upload {uploads.length} photo{uploads.length === 1 ? '' : 's'} to {selectedBranch?.name || 'selected branch'}.</p>
                    <button
                      type="button"
                      disabled={!selectedBranchId || isUploading}
                      onClick={uploadPhotos}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black uppercase tracking-[0.2em] text-black transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Upload size={16} /> {isUploading ? 'Uploading...' : `Upload to ${selectedBranch?.name || 'Branch'}`}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-6 rounded-[28px] border border-dashed border-white/10 bg-[#0d0d10] p-6 text-center text-zinc-400">
                  Select images to preview captions and upload progress.
                </div>
              )}
            </div>

            <aside className="space-y-4 rounded-[28px] border border-white/10 bg-[#0d0d10] p-6">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-zinc-500">Branch summary</p>
                <h2 className="mt-2 text-2xl font-black text-white">{selectedBranch?.name || 'All branches'}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#111] p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Total branches</p>
                  <p className="mt-2 text-3xl font-black text-white">{branches.length}</p>
                </div>
                <div className="rounded-2xl bg-[#111] p-4">
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Photos in view</p>
                  <p className="mt-2 text-3xl font-black text-white">{filteredPhotos.length}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 text-sm text-zinc-300">
                <p className="font-black uppercase tracking-[0.35em] text-zinc-500">Tip</p>
                <p className="mt-2">Use the search bar to find captions, or filter by branch tab to narrow the gallery.</p>
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-[32px] border border-white/10 bg-[#111] p-6 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-orange-300/80">Photo gallery</p>
              <h2 className="mt-2 text-2xl font-black text-white">Gallery grid</h2>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-[#0d0d10] px-4 py-3 text-sm text-zinc-300">
              <span className="font-semibold text-white">Branch filter</span>
              <select
                className="bg-transparent text-sm text-white outline-none"
                value={selectedBranchId}
                onChange={(event) => setSelectedBranchId(event.target.value)}
              >
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredPhotos.length === 0 ? (
            <div className="mt-8 rounded-[28px] border border-dashed border-white/10 bg-black/40 p-10 text-center text-zinc-500">
              No photos found. Upload branch images to populate the gallery.
            </div>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredPhotos.map((photo, index) => (
                <article key={`${photo.id}-${photo.branchId}`} className="group overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0d10] transition hover:-translate-y-1 hover:border-orange-500/40">
                  <button type="button" onClick={() => openLightbox(index)} className="block overflow-hidden">
                    <img src={photo.imageURL} alt={photo.caption || photo.branchName} className="h-56 w-full object-cover transition duration-500 group-hover:scale-105" />
                  </button>
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <span className="rounded-full bg-orange-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-[0.35em] text-orange-200">{photo.branchName || 'Branch'}</span>
                      <button
                        type="button"
                        onClick={() => deletePhoto(photo)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-rose-600/20 hover:text-rose-300"
                        aria-label="Delete photo"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                    <div>
                      <p className="text-sm font-black text-white">{photo.caption || 'No caption provided'}</p>
                      <p className="mt-2 text-xs text-zinc-500">Uploaded on {formatDate(photo.uploadedAt)}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>

      {activeLightboxPhoto ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-6">
          <div className="absolute inset-0" onClick={closeLightbox} />
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[36px] border border-white/10 bg-[#0b0b0d] shadow-2xl">
            <img src={activeLightboxPhoto.imageURL} alt={activeLightboxPhoto.caption || activeLightboxPhoto.branchName} className="max-h-[80vh] w-full object-contain bg-black" />
            <button
              type="button"
              onClick={closeLightbox}
              className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white transition hover:bg-black"
              aria-label="Close lightbox"
            >
              <X size={18} />
            </button>
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/95 to-transparent p-6 text-white">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-zinc-500">{activeLightboxPhoto.branchName}</p>
                  <h3 className="mt-1 text-xl font-black">{activeLightboxPhoto.caption || 'Untitled photo'}</h3>
                </div>
                <p className="text-sm text-zinc-400">{formatDate(activeLightboxPhoto.uploadedAt)}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={showPrevious}
                  disabled={lightboxIndex <= 0}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white disabled:opacity-40"
                >
                  <ChevronRight className="rotate-180" size={16} /> Previous
                </button>
                <button
                  type="button"
                  onClick={showNext}
                  disabled={lightboxIndex >= filteredPhotos.length - 1}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-black uppercase tracking-[0.2em] text-white disabled:opacity-40"
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

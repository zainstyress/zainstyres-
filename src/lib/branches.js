import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';

export const BRANCHES_COLLECTION = 'branches';
const MAX_BRANCH_IMAGES = 10;

const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'number' || typeof value === 'string') return new Date(value);
  return null;
};

export const normalizeBranch = (branchId, data = {}) => ({
  id: branchId,
  name: data.name || '',
  address: data.address || '',
  city: data.city || '',
  phone: data.phone || '',
  whatsapp: data.whatsapp || '',
  email: data.email || '',
  timings: data.timings || data.hours || '',
  mapLink: data.mapLink || '',
  images: Array.isArray(data.images) ? data.images : [],
  isActive: data.isActive !== false,
  isPrimary: !!data.isPrimary,
  services: Array.isArray(data.services) ? data.services : [],
  createdAt: toDate(data.createdAt),
  updatedAt: toDate(data.updatedAt),
});

export function branchesCollection() {
  return collection(db, BRANCHES_COLLECTION);
}

export function branchDocRef(branchId) {
  return doc(db, BRANCHES_COLLECTION, branchId);
}

export function listenBranches(onChange, onError) {
  const q = query(branchesCollection(), orderBy('isPrimary', 'desc'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((branchDoc) => normalizeBranch(branchDoc.id, branchDoc.data())));
  }, onError);
}

export function listenActiveBranches(onChange, onError) {
  const q = query(branchesCollection(), where('isActive', '==', true), orderBy('isPrimary', 'desc'), orderBy('name', 'asc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((branchDoc) => normalizeBranch(branchDoc.id, branchDoc.data())));
  }, onError);
}

export async function getBranch(branchId) {
  const snapshot = await getDoc(branchDocRef(branchId));
  return snapshot.exists() ? normalizeBranch(snapshot.id, snapshot.data()) : null;
}

export async function saveBranch(branchId, branchInput) {
  await setDoc(branchDocRef(branchId), {
    ...branchInput,
    updatedAt: serverTimestamp(),
    createdAt: branchInput.createdAt || serverTimestamp(),
  }, { merge: true });
}

export async function updateBranch(branchId, patch) {
  await updateDoc(branchDocRef(branchId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBranch(branchId) {
  await deleteDoc(branchDocRef(branchId));
}

export async function uploadBranchPhotos(branchId, files = [], existingImages = []) {
  const remainingSlots = Math.max(0, MAX_BRANCH_IMAGES - existingImages.length);
  const filesToUpload = Array.from(files).slice(0, remainingSlots);
  const uploadedUrls = [];

  for (let index = 0; index < filesToUpload.length; index += 1) {
    const file = filesToUpload[index];
    const safeName = (file.name || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const imageIndex = existingImages.length + index;
    const storageRef = ref(storage, `branches/${branchId}/image_${imageIndex}.jpg`);
    const result = await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg', customMetadata: { originalName: safeName } });
    uploadedUrls.push(await getDownloadURL(result.ref));
  }

  const nextImages = [...existingImages, ...uploadedUrls].slice(0, MAX_BRANCH_IMAGES);
  await updateBranch(branchId, { images: nextImages });
  return nextImages;
}

export async function deleteBranchImage(branchId, imageUrl) {
  try {
    await deleteObject(ref(storage, imageUrl));
  } catch {
    // Ignore missing storage objects.
  }

  const snapshot = await getDoc(branchDocRef(branchId));
  if (!snapshot.exists()) return [];

  const data = snapshot.data();
  const nextImages = (data.images || []).filter((item) => item !== imageUrl);
  await updateBranch(branchId, { images: nextImages });
  return nextImages;
}

export async function setBranchImages(branchId, images) {
  await updateBranch(branchId, { images: images.slice(0, MAX_BRANCH_IMAGES) });
}

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  limit,
  startAfter,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, db, storage } from '../firebase';

export const TYRES_COLLECTION = 'tyres';
export const REVIEWS_COLLECTION = 'reviews';

const emptySpecifications = {
  width: '',
  aspectRatio: '',
  rimDiameter: '',
  loadIndex: '',
  speedRating: '',
  tyreType: 'tubeless',
  warranty: '',
};

const nowIso = () => new Date().toISOString();

const cleanPayload = (value) => Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

export const normalizeTyre = (tyreId, data = {}) => ({
  id: tyreId,
  name: data.name || '',
  brand: data.brand || '',
  category: data.category || 'car',
  size: data.size || '',
  price: Number(data.price || 0),
  discountPrice: data.discountPrice === '' || data.discountPrice == null ? null : Number(data.discountPrice),
  discount: data.discount === '' || data.discount == null ? null : Number(data.discount),
  discountPercent: Number((data.discountPercent ?? data.discount) || 0),
  stock: Number(data.stock || 0),
  description: data.description || '',
  specifications: { ...emptySpecifications, ...(data.specifications || {}) },
  images: Array.isArray(data.images) ? data.images : [],
  thumbnailIndex: Number.isInteger(data.thumbnailIndex) ? data.thumbnailIndex : 0,
  isActive: data.isActive !== false,
  isFeatured: !!data.isFeatured,
  averageRating: Number(data.averageRating || 0),
  totalReviews: Number(data.totalReviews || 0),
  createdAt: data.createdAt || nowIso(),
  updatedAt: data.updatedAt || nowIso(),
});

export const calculateTyrePricing = (tyre = {}) => {
  const originalPrice = Number(tyre.price || 0);
  const explicitDiscountPercent = Number(tyre.discountPercent || tyre.discount || 0);
  const legacyDiscountPrice = tyre.discountPrice == null || tyre.discountPrice === '' ? null : Number(tyre.discountPrice);

  if (explicitDiscountPercent > 0) {
    const discountedPrice = Math.max(0, Math.round(originalPrice - (originalPrice * explicitDiscountPercent) / 100));
    return {
      originalPrice,
      discountedPrice,
      discountPercent: explicitDiscountPercent,
      hasDiscount: true,
    };
  }

  if (legacyDiscountPrice != null && legacyDiscountPrice < originalPrice) {
    const discountPercent = originalPrice > 0 ? Math.round(((originalPrice - legacyDiscountPrice) / originalPrice) * 100) : 0;
    return {
      originalPrice,
      discountedPrice: legacyDiscountPrice,
      discountPercent,
      hasDiscount: discountPercent > 0,
    };
  }

  return {
    originalPrice,
    discountedPrice: originalPrice,
    discountPercent: 0,
    hasDiscount: false,
  };
};

const normalizeReviewTimestamp = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') return new Date(value);
  return null;
};

export const normalizeReview = (reviewId, data = {}) => ({
  id: reviewId,
  tyreId: data.tyreId || '',
  tyreName: data.tyreName || '',
  tyreBrand: data.tyreBrand || '',
  userId: data.userId || '',
  userName: data.userName || 'User',
  userPhoto: data.userPhoto || '',
  rating: Number(data.rating || 0),
  reviewText: data.reviewText || '',
  verified: !!data.verified,
  createdAt: normalizeReviewTimestamp(data.createdAt),
  updatedAt: normalizeReviewTimestamp(data.updatedAt),
});

export function tyresCollection() {
  return collection(db, TYRES_COLLECTION);
}

export function tyreDocRef(tyreId) {
  return doc(db, TYRES_COLLECTION, tyreId);
}

export function reviewsCollection() {
  return collection(db, REVIEWS_COLLECTION);
}

export function reviewDocRef(reviewId) {
  return doc(db, REVIEWS_COLLECTION, reviewId);
}

export function tyreImagesFolder(tyreId) {
  return `tyres/${tyreId}`;
}

export function makeTyreImagePath(tyreId, index) {
  return `tyres/${tyreId}/image_${index}.jpg`;
}

export function listenTyres(onChange) {
  const q = query(tyresCollection(), orderBy('updatedAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((tyreDoc) => normalizeTyre(tyreDoc.id, tyreDoc.data())));
  });
}

export function listenFeaturedTyres(onChange) {
  try {
    const q = query(tyresCollection(), where('isFeatured', '==', true), where('isActive', '==', true), orderBy('updatedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      onChange(snapshot.docs.slice(0, 6).map((tyreDoc) => normalizeTyre(tyreDoc.id, tyreDoc.data())));
    });
  } catch (err) {
    console.error('listenFeaturedTyres query failed, falling back to client filter:', err);
    const fallbackQ = query(tyresCollection(), where('isActive', '==', true));
    return onSnapshot(fallbackQ, (snapshot) => {
      const items = snapshot.docs.map((tyreDoc) => normalizeTyre(tyreDoc.id, tyreDoc.data()));
      onChange(items.filter((t) => t.isFeatured).slice(0, 6));
    });
  }
}

export function listenTyre(tyreId, onChange) {
  return onSnapshot(tyreDocRef(tyreId), (snapshot) => {
    onChange(snapshot.exists() ? normalizeTyre(snapshot.id, snapshot.data()) : null);
  });
}

export function listenTyreReviews(tyreId, onChange) {
  const q = query(reviewsCollection(), where('tyreId', '==', tyreId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((reviewDoc) => normalizeReview(reviewDoc.id, reviewDoc.data())));
  });
}

export function listenAllReviews(onChange) {
  const q = query(reviewsCollection(), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((reviewDoc) => normalizeReview(reviewDoc.id, reviewDoc.data())));
  });
}

export async function getTyre(tyreId) {
  const snapshot = await getDoc(tyreDocRef(tyreId));
  return snapshot.exists() ? normalizeTyre(snapshot.id, snapshot.data()) : null;
}

export async function listTyresOnce() {
  const snapshot = await getDocs(tyresCollection());
  return snapshot.docs.map((tyreDoc) => normalizeTyre(tyreDoc.id, tyreDoc.data()));
}

export async function listTyresPage({ afterDoc = null, pageSize = 12 } = {}) {
  const constraints = [where('isActive', '==', true), orderBy('updatedAt', 'desc')];

  if (afterDoc) {
    constraints.push(startAfter(afterDoc));
  }

  constraints.push(limit(pageSize));

  try {
    const snapshot = await getDocs(query(tyresCollection(), ...constraints));
    return {
      tyres: snapshot.docs.map((tyreDoc) => normalizeTyre(tyreDoc.id, tyreDoc.data())),
      lastDoc: snapshot.docs.at(-1) || null,
      hasMore: snapshot.size === pageSize,
    };
  } catch (err) {
    console.error('listTyresPage primary query failed, attempting fallback query:', err);
    // Fallback: query only by isActive and limit, then sort client-side by updatedAt
    try {
      const fallbackSnapshot = await getDocs(query(tyresCollection(), where('isActive', '==', true), limit(pageSize)));
      const tyres = fallbackSnapshot.docs.map((tyreDoc) => normalizeTyre(tyreDoc.id, tyreDoc.data()));
      const sorted = tyres.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      return {
        tyres: sorted,
        lastDoc: fallbackSnapshot.docs.at(-1) || null,
        hasMore: fallbackSnapshot.size === pageSize,
      };
    } catch (fallbackErr) {
      console.error('listTyresPage fallback query also failed:', fallbackErr);
      throw fallbackErr;
    }
  }
}

export async function createTyre(tyreInput) {
  const docRef = await addDoc(tyresCollection(), cleanPayload({
    ...tyreInput,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }));
  return docRef.id;
}

export async function saveTyre(tyreId, tyreInput) {
  await setDoc(tyreDocRef(tyreId), cleanPayload({
    ...tyreInput,
    updatedAt: serverTimestamp(),
  }), { merge: true });
}

export async function updateTyre(tyreId, patch) {
  await updateDoc(tyreDocRef(tyreId), cleanPayload({
    ...patch,
    updatedAt: serverTimestamp(),
  }));
}

export async function recalculateTyreReviewStats(tyreId) {
  const reviewSnapshot = await getDocs(query(reviewsCollection(), where('tyreId', '==', tyreId)));
  const reviews = reviewSnapshot.docs.map((reviewDoc) => normalizeReview(reviewDoc.id, reviewDoc.data()));
  const totalReviews = reviews.length;
  const averageRating = totalReviews > 0
    ? reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / totalReviews
    : 0;

  await updateDoc(tyreDocRef(tyreId), {
    averageRating: Number(averageRating.toFixed(1)),
    totalReviews,
    updatedAt: serverTimestamp(),
  });
}

export async function listTyreReviewsPage(tyreId, { afterDoc = null, pageSize = 10 } = {}) {
  const constraints = [where('tyreId', '==', tyreId), orderBy('createdAt', 'desc')];

  if (afterDoc) {
    constraints.push(startAfter(afterDoc));
  }

  constraints.push(limit(pageSize));

  const snapshot = await getDocs(query(reviewsCollection(), ...constraints));
  return {
    reviews: snapshot.docs.map((reviewDoc) => normalizeReview(reviewDoc.id, reviewDoc.data())),
    lastDoc: snapshot.docs.at(-1) || null,
    hasMore: snapshot.size === pageSize,
  };
}

export async function upsertTyreReview(reviewInput) {
  const { tyreId, tyreName = '', tyreBrand = '', userId, userName, userPhoto = '', rating, reviewText, verified = false } = reviewInput;
  const existingSnapshot = await getDocs(query(reviewsCollection(), where('tyreId', '==', tyreId), where('userId', '==', userId), limit(1)));
  const payload = cleanPayload({
    tyreId,
    tyreName,
    tyreBrand,
    userId,
    userName,
    userPhoto,
    rating: Number(rating || 0),
    reviewText: reviewText || '',
    verified: !!verified,
    updatedAt: serverTimestamp(),
  });

  if (!existingSnapshot.empty) {
    await updateDoc(existingSnapshot.docs[0].ref, payload);
    await recalculateTyreReviewStats(tyreId);
    return existingSnapshot.docs[0].id;
  }

  const docRef = await addDoc(reviewsCollection(), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  await recalculateTyreReviewStats(tyreId);
  return docRef.id;
}

export async function deleteTyreReview(reviewId) {
  const snapshot = await getDoc(reviewDocRef(reviewId));
  if (!snapshot.exists()) return null;
  const review = normalizeReview(snapshot.id, snapshot.data());
  await deleteDoc(reviewDocRef(reviewId));
  if (review.tyreId) {
    await recalculateTyreReviewStats(review.tyreId);
  }
  return review;
}

export async function setReviewVerified(reviewId, verified) {
  await updateDoc(reviewDocRef(reviewId), {
    verified: !!verified,
    updatedAt: serverTimestamp(),
  });
}

export async function toggleTyreField(tyreId, field, value) {
  await updateTyre(tyreId, { [field]: value });
}

export async function deleteTyreDocAndImages(tyre) {
  const storageDeletions = (tyre.images || []).map(async (imageUrl) => {
    try {
      const imageRef = ref(storage, imageUrl);
      await deleteObject(imageRef);
    } catch {
      // Ignore if URL is already gone or not a storage object URL.
    }
  });

  await Promise.all(storageDeletions);
  await deleteDoc(tyreDocRef(tyre.id));
}

export async function removeTyreImage(tyreId, imageUrl) {
  try {
    await deleteObject(ref(storage, imageUrl));
  } catch {
    // Ignore missing file errors.
  }

  const snapshot = await getDoc(tyreDocRef(tyreId));
  if (!snapshot.exists()) return;
  const data = snapshot.data();
  const nextImages = (data.images || []).filter((item) => item !== imageUrl);
  const nextThumbnailIndex = Math.min(data.thumbnailIndex || 0, Math.max(nextImages.length - 1, 0));
  await updateDoc(tyreDocRef(tyreId), {
    images: nextImages,
    thumbnailIndex: nextThumbnailIndex,
    updatedAt: nowIso(),
  });
}

export async function uploadTyreImages(tyreId, files, { onProgress } = {}) {
  const uploads = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const safeName = (file.name || 'image.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `tyres/${tyreId}/${Date.now()}-${index}-${safeName}`;
    const storageRef = ref(storage, filePath);
    const result = await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(result.ref);
    uploads.push({ index, url: downloadUrl, path: filePath });

    if (onProgress) {
      onProgress({ uploaded: index + 1, total: files.length, fileName: file.name });
    }
  }

  return uploads;
}

export async function setMainTyreImage(tyreId, thumbnailIndex) {
  await updateDoc(tyreDocRef(tyreId), {
    thumbnailIndex,
    updatedAt: nowIso(),
  });
}

export async function ensureAdminGuard() {
  if (!auth.currentUser) return false;
  const userSnapshot = await getDoc(doc(db, 'users', auth.currentUser.uid));
  return userSnapshot.exists() && userSnapshot.data().role === 'admin';
}

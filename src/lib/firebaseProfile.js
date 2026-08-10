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
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential, updateEmail, updatePassword, updateProfile } from 'firebase/auth';
import { auth, db, storage } from '../firebase';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

const USERS = 'users';
const ORDERS = 'orders';

export const userDocRef = (uid) => doc(db, USERS, uid);
export const addressesCol = (uid) => collection(db, USERS, uid, 'addresses');
export const paymentMethodsCol = (uid) => collection(db, USERS, uid, 'paymentMethods');
export const notificationsCol = (uid) => collection(db, USERS, uid, 'notifications');
export const fcmTokensCol = (uid) => collection(db, USERS, uid, 'fcmTokens');

const nowIso = () => new Date().toISOString();

const cleanPayload = (value) => Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));

const createTrackingSteps = (status) => {
  const flow = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];
  const currentIndex = flow.indexOf(status);
  return flow.map((step, index) => ({
    step,
    timestamp: index <= currentIndex ? nowIso() : null,
    done: index <= currentIndex,
  }));
};

export const normalizeUserDoc = (uid, profile = {}, authUser = null) => ({
  id: uid,
  name: profile.name || authUser?.displayName || '',
  email: profile.email || authUser?.email || '',
  phone: profile.phone || authUser?.phoneNumber || '',
  profilePhoto: profile.profilePhoto || authUser?.photoURL || '',
  createdAt: profile.createdAt || nowIso(),
  isBlocked: profile.isBlocked ?? profile.is_banned ?? false,
  role: profile.role || 'user',
  updatedAt: profile.updatedAt || nowIso(),
});

export async function ensureUserProfile(authUser) {
  if (!authUser?.uid) return null;
  const existing = await getDoc(userDocRef(authUser.uid));
  if (!existing.exists()) {
    const payload = normalizeUserDoc(authUser.uid, {}, authUser);
    await setDoc(userDocRef(authUser.uid), cleanPayload({
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }), { merge: true });
    return payload;
  }
  return existing.data();
}

export function subscribeUserProfile(uid, onChange) {
  return onSnapshot(userDocRef(uid), (snapshot) => {
    const data = snapshot.exists() ? snapshot.data() : {};
    onChange(normalizeUserDoc(uid, data, auth.currentUser));
  });
}

export async function saveUserProfile(uid, values) {
  await updateDoc(userDocRef(uid), cleanPayload({
    ...values,
    updatedAt: nowIso(),
  }));
}

export async function syncAuthProfile({ name, photoURL }) {
  if (!auth.currentUser) return;
  await updateProfile(auth.currentUser, { displayName: name || auth.currentUser.displayName, photoURL: photoURL || auth.currentUser.photoURL || null });
}

export async function changeAuthEmail(currentPassword, nextEmail) {
  if (!auth.currentUser?.email) throw new Error('Missing current user');
  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await updateEmail(auth.currentUser, nextEmail);
}

export async function changeAuthPassword(currentPassword, nextPassword) {
  if (!auth.currentUser?.email) throw new Error('Missing current user');
  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await updatePassword(auth.currentUser, nextPassword);
}

export async function removeAccount(currentPassword) {
  if (!auth.currentUser?.email) throw new Error('Missing current user');
  const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
  await reauthenticateWithCredential(auth.currentUser, credential);
  await deleteUser(auth.currentUser);
}

export async function uploadProfilePhoto(uid, file) {
  const storageRef = ref(storage, `profile-photos/${uid}/${Date.now()}-${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

export async function saveAddress(uid, address) {
  const payload = cleanPayload({
    ...address,
    isDefault: !!address.isDefault,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  if (address.id) {
    await updateDoc(doc(addressesCol(uid), address.id), payload);
    return { id: address.id, ...payload };
  }

  const created = await addDoc(addressesCol(uid), payload);
  return { id: created.id, ...payload };
}

export async function deleteAddress(uid, addressId) {
  await deleteDoc(doc(addressesCol(uid), addressId));
}

export async function setDefaultAddress(uid, addressId) {
  const snapshot = await getDocs(addressesCol(uid));
  const batch = writeBatch(db);
  snapshot.docs.forEach((addressDoc) => {
    batch.update(addressDoc.ref, { isDefault: addressDoc.id === addressId, updatedAt: nowIso() });
  });
  await batch.commit();
}

export async function savePaymentMethod(uid, paymentMethod) {
  const payload = cleanPayload({
    ...paymentMethod,
    isDefault: !!paymentMethod.isDefault,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });

  if (paymentMethod.id) {
    await updateDoc(doc(paymentMethodsCol(uid), paymentMethod.id), payload);
    return { id: paymentMethod.id, ...payload };
  }

  const created = await addDoc(paymentMethodsCol(uid), payload);
  return { id: created.id, ...payload };
}

export async function deletePaymentMethod(uid, paymentMethodId) {
  await deleteDoc(doc(paymentMethodsCol(uid), paymentMethodId));
}

export async function setDefaultPaymentMethod(uid, paymentMethodId) {
  const snapshot = await getDocs(paymentMethodsCol(uid));
  const batch = writeBatch(db);
  snapshot.docs.forEach((item) => {
    batch.update(item.ref, { isDefault: item.id === paymentMethodId, updatedAt: nowIso() });
  });
  await batch.commit();
}

export function listenUserOrders(uid, onChange) {
  const q = query(collection(db, ORDERS), where('userId', '==', uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((orderDoc) => {
      const data = orderDoc.data();
      return {
        id: orderDoc.id,
        ...data,
        createdAt: data.createdAt || nowIso(),
        updatedAt: data.updatedAt || data.createdAt || nowIso(),
        trackingSteps: data.trackingSteps?.length ? data.trackingSteps : createTrackingSteps(data.status || 'placed'),
      };
    }));
  });
}

export async function upsertOrderStatus(orderId, status) {
  await updateDoc(doc(db, ORDERS, orderId), {
    status,
    trackingSteps: createTrackingSteps(status),
    updatedAt: nowIso(),
  });
}

export function listenAllUsers(onChange) {
  const q = query(collection(db, USERS), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((userDoc) => ({ id: userDoc.id, ...normalizeUserDoc(userDoc.id, userDoc.data()) })));
  });
}

export function listenAllOrders(onChange) {
  const q = query(collection(db, ORDERS), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() })));
  });
}

export async function saveNotification(uid, notification) {
  return addDoc(notificationsCol(uid), cleanPayload({
    ...notification,
    isRead: false,
    createdAt: nowIso(),
  }));
}

export async function markNotificationRead(uid, notificationId) {
  await updateDoc(doc(notificationsCol(uid), notificationId), { isRead: true, updatedAt: nowIso() });
}

export async function markAllNotificationsRead(uid) {
  const snapshot = await getDocs(notificationsCol(uid));
  const batch = writeBatch(db);
  snapshot.docs.forEach((notificationDoc) => {
    batch.update(notificationDoc.ref, { isRead: true, updatedAt: nowIso() });
  });
  await batch.commit();
}

export function listenNotifications(uid, onChange) {
  const q = query(notificationsCol(uid), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    onChange(snapshot.docs.map((notificationDoc) => ({ id: notificationDoc.id, ...notificationDoc.data() })));
  });
}

export async function registerFcmToken(uid, token, platform = 'web') {
  const snapshot = await getDocs(fcmTokensCol(uid));
  const existing = snapshot.docs.find((item) => item.data().token === token);
  if (existing) return existing.id;
  const created = await addDoc(fcmTokensCol(uid), {
    token,
    platform,
    createdAt: nowIso(),
  });
  return created.id;
}

export async function removeFcmToken(uid, tokenId) {
  await deleteDoc(doc(fcmTokensCol(uid), tokenId));
}

export async function getAdminDashboardStats() {
  const [usersSnapshot, ordersSnapshot] = await Promise.all([
    getDocs(collection(db, USERS)),
    getDocs(collection(db, ORDERS)),
  ]);

  const orders = ordersSnapshot.docs.map((orderDoc) => ({ id: orderDoc.id, ...orderDoc.data() }));
  const todayKey = new Date().toISOString().slice(0, 10);
  const monthKey = todayKey.slice(0, 7);
  const revenueToday = orders.filter((order) => (order.createdAt || '').startsWith(todayKey)).reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
  const revenueMonth = orders.filter((order) => (order.createdAt || '').startsWith(monthKey)).reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);

  return {
    totalUsers: usersSnapshot.size,
    totalOrders: ordersSnapshot.size,
    revenueToday,
    revenueMonth,
    activeOrders: orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length,
    recentOrders: orders.slice(0, 8),
  };
}

export async function setUserRole(uid, role) {
  await updateDoc(userDocRef(uid), { role, updatedAt: nowIso() });
}

export async function setUserBlocked(uid, isBlocked) {
  await updateDoc(userDocRef(uid), { isBlocked, updatedAt: nowIso() });
}

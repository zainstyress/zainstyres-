import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Navigate, useNavigate } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useCustomToast } from '../context/ToastContext';
import {
  changeAuthEmail,
  changeAuthPassword,
  deleteAddress,
  deletePaymentMethod,
  listenNotifications,
  listenUserOrders,
  markAllNotificationsRead,
  markNotificationRead,
  removeAccount,
  saveAddress,
  saveNotification,
  savePaymentMethod,
  saveUserProfile,
  setDefaultAddress,
  setDefaultPaymentMethod,
  registerFcmToken,
  syncAuthProfile,
  uploadProfilePhoto,
} from '../lib/firebaseProfile';
import {
  Bell,
  Check,
  CreditCard,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Plus,
  Settings,
  ShieldCheck,
  Smartphone,
  User,
  X,
} from 'lucide-react';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: Package },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'addresses', label: 'Addresses', icon: MapPin },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const ORDER_FILTERS = ['all', 'active', 'delivered', 'cancelled'];

const emptyAddress = { label: 'Home', fullAddress: '', city: '', state: '', pincode: '', isDefault: false };
const emptyPayment = { cardToken: '', last4digits: '', cardType: 'Visa', isDefault: false };

const badgeClass = (status) => ({
  placed: 'border-sky-500/20 bg-sky-500/10 text-sky-300',
  confirmed: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
  processing: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
  shipped: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
  delivered: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
  cancelled: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
}[status] || 'border-white/10 bg-white/5 text-zinc-300');

function Shell({ children, onClose, title, description }) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.98, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98, y: 10 }} className="relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0f0f12] shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-white/5 px-6 py-5">
          <div>
            <h3 className="text-xl font-black text-white">{title}</h3>
            <p className="mt-1 text-xs text-zinc-500">{description}</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </div>
        <div className="max-h-[80vh] overflow-y-auto p-6">{children}</div>
      </motion.div>
    </div>
  );
}

function NotificationBell({ unread, onOpen }) {
  return (
    <button onClick={onOpen} className="relative rounded-2xl border border-white/10 bg-white/5 p-3 text-white transition-colors hover:bg-white/10">
      <Bell size={18} />
      {unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
    </button>
  );
}

function AddressCard({ address, onEdit, onDelete, onDefault }) {
  return (
    <div className={`rounded-[24px] border p-5 ${address.isDefault ? 'border-orange-500/30 bg-orange-500/10' : 'border-white/5 bg-white/[0.03]'}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-white">{address.label}</h4>
            {address.isDefault && <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Default</span>}
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{address.fullAddress}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-zinc-500">{address.city}, {address.state} - {address.pincode}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => onDefault(address)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5">Set default</button>
        <button onClick={() => onEdit(address)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5">Edit</button>
        <button onClick={() => onDelete(address)} className="rounded-full border border-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Delete</button>
      </div>
    </div>
  );
}

function PaymentCard({ paymentMethod, onEdit, onDelete, onDefault }) {
  return (
    <div className={`rounded-[24px] border p-5 ${paymentMethod.isDefault ? 'border-orange-500/30 bg-orange-500/10' : 'border-white/5 bg-white/[0.03]'}`}>
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-bold text-white">{paymentMethod.cardType}</h4>
            {paymentMethod.isDefault && <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-400">Default</span>}
          </div>
          <p className="mt-2 text-sm text-zinc-400">Token stored securely</p>
          <p className="mt-1 text-xs uppercase tracking-[0.25em] text-zinc-500">•••• {paymentMethod.last4digits}</p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <button onClick={() => onDefault(paymentMethod)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5">Set default</button>
        <button onClick={() => onEdit(paymentMethod)} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5">Edit</button>
        <button onClick={() => onDelete(paymentMethod)} className="rounded-full border border-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">Delete</button>
      </div>
    </div>
  );
}

function ModalForm({ title, description, value, onClose, onSave, type = 'address' }) {
  const [form, setForm] = useState(value || (type === 'address' ? emptyAddress : emptyPayment));

  useEffect(() => {
    setForm(value || (type === 'address' ? emptyAddress : emptyPayment));
  }, [value, type]);

  const submit = () => onSave(form);

  return (
    <Shell title={title} description={description} onClose={onClose}>
      {type === 'address' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Label</span><input value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
          <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Full Address</span><textarea value={form.fullAddress} onChange={(e) => setForm((prev) => ({ ...prev, fullAddress: e.target.value }))} rows={4} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">City</span><input value={form.city} onChange={(e) => setForm((prev) => ({ ...prev, city: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">State</span><input value={form.state} onChange={(e) => setForm((prev) => ({ ...prev, state: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Pincode</span><input value={form.pincode} onChange={(e) => setForm((prev) => ({ ...prev, pincode: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
          <label className="flex items-center gap-3 pt-7 text-sm text-zinc-300"><input checked={form.isDefault} onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))} type="checkbox" className="h-4 w-4 accent-orange-500" />Set as default</label>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Card Token</span><input value={form.cardToken} onChange={(e) => setForm((prev) => ({ ...prev, cardToken: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" placeholder="Token from Razorpay/Stripe" /></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Last 4 Digits</span><input value={form.last4digits} onChange={(e) => setForm((prev) => ({ ...prev, last4digits: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none" /></label>
          <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Card Type</span><select value={form.cardType} onChange={(e) => setForm((prev) => ({ ...prev, cardType: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none"><option>Visa</option><option>Mastercard</option><option>RuPay</option><option>Amex</option></select></label>
          <label className="flex items-center gap-3 pt-7 text-sm text-zinc-300"><input checked={form.isDefault} onChange={(e) => setForm((prev) => ({ ...prev, isDefault: e.target.checked }))} type="checkbox" className="h-4 w-4 accent-orange-500" />Set as default</label>
        </div>
      )}
      <div className="mt-6 flex gap-3">
        <button onClick={onClose} className="flex-1 rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5">Cancel</button>
        <button onClick={submit} className="flex-1 rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-400">Save</button>
      </div>
    </Shell>
  );
}

function OrderTimeline({ order }) {
  const flow = ['placed', 'confirmed', 'processing', 'shipped', 'delivered'];
  const steps = order?.trackingSteps?.length ? order.trackingSteps : flow.map((step) => ({ step, done: flow.indexOf(step) <= flow.indexOf(order?.status || 'placed'), timestamp: null }));

  return (
    <div className="space-y-3">
      {steps.map((step) => (
        <div key={step.step} className="flex gap-3">
          <div className={`mt-1 h-3 w-3 rounded-full ${step.done ? 'bg-emerald-400' : 'bg-white/20'}`} />
          <div className="flex-1">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{step.step}</p>
              <span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{step.done ? 'Done' : 'Pending'}</span>
            </div>
            <p className="text-xs text-zinc-500">{step.timestamp ? new Date(step.timestamp).toLocaleString() : 'Waiting for update'}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function NotificationDrawer({ notifications, onClose, onMarkRead, onMarkAll }) {
  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md border-l border-white/10 bg-[#0c0c0f] shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-5">
          <div>
            <h3 className="text-lg font-black text-white">Notifications</h3>
            <p className="text-xs text-zinc-500">In-app alerts and order updates</p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-zinc-400 hover:bg-white/5 hover:text-white"><X size={18} /></button>
        </div>
        <div className="border-b border-white/5 px-6 py-4">
          <button onClick={onMarkAll} className="rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5">Mark all read</button>
        </div>
        <div className="max-h-[calc(100vh-126px)] overflow-y-auto p-4">
          {notifications.length === 0 ? <div className="rounded-[20px] border border-white/5 bg-white/[0.03] p-5 text-sm text-zinc-500">No notifications yet.</div> : notifications.map((item) => (
            <button key={item.id} onClick={() => onMarkRead(item)} className={`mb-3 w-full rounded-[22px] border p-4 text-left ${item.isRead ? 'border-white/5 bg-white/[0.03]' : 'border-orange-500/20 bg-orange-500/10'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{item.title || 'Update'}</p>
                  <p className="mt-1 text-xs text-zinc-400">{item.body}</p>
                </div>
                {!item.isRead && <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" />}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ProfileSystem() {
  const { user, logout, loading } = useAuth();
  const { toast } = useCustomToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [addressModal, setAddressModal] = useState(null);
  const [paymentModal, setPaymentModal] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ name: '', phone: '', email: '', currentPassword: '', nextPassword: '', confirmPassword: '', profilePhoto: '' });
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setSettingsForm((prev) => ({ ...prev, name: user.name || '', phone: user.phone || '', email: user.email || '', profilePhoto: user.profilePhoto || '' }));
  }, [user]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const unsubOrders = listenUserOrders(user.id, setOrders);
    const unsubAddresses = onSnapshot(query(collection(db, 'users', user.id, 'addresses'), orderBy('updatedAt', 'desc')), (snapshot) => setAddresses(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    const unsubPayments = onSnapshot(query(collection(db, 'users', user.id, 'paymentMethods'), orderBy('updatedAt', 'desc')), (snapshot) => setPayments(snapshot.docs.map((item) => ({ id: item.id, ...item.data() }))));
    const unsubNotifications = listenNotifications(user.id, setNotifications);

    return () => {
      unsubOrders && unsubOrders();
      unsubAddresses();
      unsubPayments();
      unsubNotifications();
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || typeof window === 'undefined' || !('Notification' in window)) return undefined;

    const registerPush = async () => {
      try {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }

        if (Notification.permission !== 'granted') return;
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
        if (!vapidKey) return;

        const { getMessaging, getToken } = await import('firebase/messaging');
        const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
        const messaging = getMessaging(auth.app);
        const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });

        if (token) await registerFcmToken(user.id, token, 'web');
      } catch {
        // Push is optional; keep the rest of the profile system working without it.
      }
    };

    registerPush();
  }, [user?.id]);

  const unreadCount = notifications.filter((item) => !item.isRead).length;

  const filteredOrders = useMemo(() => {
    if (selectedFilter === 'all') return orders;
    if (selectedFilter === 'active') return orders.filter((order) => !['delivered', 'cancelled'].includes((order.status || '').toLowerCase()));
    return orders.filter((order) => (order.status || '').toLowerCase() === selectedFilter);
  }, [orders, selectedFilter]);

  if (loading) return <div className="min-h-screen bg-[#050505]" />;
  if (!user) return <Navigate to="/login" replace />;

  const totalOrders = orders.length;
  const pendingOrders = orders.filter((order) => !['delivered', 'cancelled'].includes((order.status || '').toLowerCase())).length;
  const recentOrders = orders.slice(0, 3);

  const saveAddressHandler = async (value) => {
    try {
      if (!value.label || !value.fullAddress || !value.city || !value.state || !value.pincode) return toast.error('Please complete the address fields.');
      const saved = await saveAddress(user.id, value);
      if (value.isDefault) await setDefaultAddress(user.id, saved.id);
      setAddressModal(null);
      toast.success(value.id ? 'Address updated' : 'Address added');
    } catch (err) {
      toast.error(err.message || 'Unable to save address');
    }
  };

  const savePaymentHandler = async (value) => {
    try {
      if (!value.cardToken || !value.last4digits) return toast.error('Token and last 4 digits are required.');
      const saved = await savePaymentMethod(user.id, value);
      if (value.isDefault) await setDefaultPaymentMethod(user.id, saved.id);
      setPaymentModal(null);
      toast.success(value.id ? 'Payment method updated' : 'Payment method added');
    } catch (err) {
      toast.error(err.message || 'Unable to save payment method');
    }
  };

  const saveSettingsHandler = async (event) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (settingsForm.nextPassword && settingsForm.nextPassword !== settingsForm.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      let nextPhoto = settingsForm.profilePhoto;
      const file = event.target.profilePhoto?.files?.[0];
      if (file) {
        setPhotoBusy(true);
        nextPhoto = await uploadProfilePhoto(user.id, file);
        setPhotoBusy(false);
      }

      await saveUserProfile(user.id, { name: settingsForm.name, phone: settingsForm.phone, email: settingsForm.email, profilePhoto: nextPhoto });
      await syncAuthProfile({ name: settingsForm.name, photoURL: nextPhoto });

      if (settingsForm.email && settingsForm.email !== user.email) {
        if (!settingsForm.currentPassword) throw new Error('Current password is required to change email');
        await changeAuthEmail(settingsForm.currentPassword, settingsForm.email);
      }

      if (settingsForm.nextPassword) {
        if (settingsForm.nextPassword !== settingsForm.confirmPassword) throw new Error('Passwords do not match');
        if (!settingsForm.currentPassword) throw new Error('Current password is required to change password');
        await changeAuthPassword(settingsForm.currentPassword, settingsForm.nextPassword);
      }

      setSettingsForm((prev) => ({ ...prev, currentPassword: '', nextPassword: '', confirmPassword: '', profilePhoto: nextPhoto }));
      toast.success('Account settings saved');
    } catch (err) {
      toast.error(err.message || 'Unable to save settings');
    } finally {
      setBusy(false);
      setPhotoBusy(false);
    }
  };

  const deleteAccountHandler = async () => {
    if (!window.confirm('Delete this account permanently?')) return;
    try {
      if (!settingsForm.currentPassword) return toast.error('Enter your current password first.');
      await removeAccount(settingsForm.currentPassword);
      toast.success('Account deleted');
      navigate('/');
    } catch (err) {
      toast.error(err.message || 'Unable to delete account');
    }
  };

  const markNotification = async (item) => {
    try {
      if (!item.isRead) await markNotificationRead(user.id, item.id);
      if (item.orderId) {
        const match = orders.find((order) => order.id === item.orderId);
        if (match) setSelectedOrder(match);
      }
      setDrawerOpen(false);
    } catch {
      toast.error('Unable to open notification');
    }
  };

  const seedNotification = async () => {
    try {
      await saveNotification(user.id, { title: 'Welcome back', body: 'This is a sample in-app notification.' });
      toast.success('Notification added');
    } catch {
      toast.error('Unable to create notification');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-[-10%] top-[-10%] h-[28rem] w-[28rem] rounded-full bg-orange-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[24rem] w-[24rem] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-white/5 bg-white/[0.03] px-4 py-5 backdrop-blur-xl lg:min-h-screen lg:w-80 lg:border-b-0 lg:border-r lg:px-6 lg:py-8">
          <div className="flex items-center justify-between lg:block">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">Zain&apos;s Tyres</p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-white">Profile Center</h1>
            </div>
            <NotificationBell unread={unreadCount} onOpen={() => setDrawerOpen(true)} />
          </div>

          <div className="mt-6 rounded-[28px] border border-white/5 bg-white/[0.03] p-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-orange-500/15 text-xl font-black text-orange-400">
                {user.profilePhoto ? <img src={user.profilePhoto} alt="Profile" loading="lazy" decoding="async" className="h-full w-full object-cover" /> : (user.name?.[0] || 'U')}
              </div>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-white">{user.name}</p>
                <p className="truncate text-xs text-zinc-500">{user.email}</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-zinc-500"><ShieldCheck size={14} className="text-orange-400" />{user.role || 'user'}</div>
          </div>

          <nav className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center gap-3 rounded-[20px] border px-4 py-3 text-left transition-all ${active ? 'border-orange-500/30 bg-orange-500/10 text-white' : 'border-white/5 bg-white/[0.03] text-zinc-400 hover:border-white/10 hover:bg-white/[0.06]'}`}>
                  <Icon size={16} className={active ? 'text-orange-400' : 'text-zinc-500'} />
                  <span className="text-sm font-semibold">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="mt-6 grid gap-3">
            <button onClick={seedNotification} className="rounded-[20px] border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5">Seed notification</button>
            <button onClick={logout} className="flex items-center justify-center gap-2 rounded-[20px] border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/15"><LogOut size={16} /> Sign out</button>
          </div>
        </aside>

        <main className="flex-1 px-4 py-6 lg:px-8 lg:py-8">
          <div className="flex flex-col gap-4 rounded-[28px] border border-white/5 bg-white/[0.03] p-5 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-orange-400">Welcome back</p>
              <h2 className="mt-2 text-3xl font-black tracking-tight">Hi {user.name?.split(' ')[0] || 'there'}</h2>
              <p className="mt-1 text-sm text-zinc-500">Orders, saved delivery addresses, tokenized payment methods, and account settings.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={seedNotification} className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5">Add alert</button>
              <NotificationBell unread={unreadCount} onOpen={() => setDrawerOpen(true)} />
            </div>
          </div>

          {activeTab === 'dashboard' && (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">Total Orders</p><p className="mt-3 text-4xl font-black">{totalOrders}</p></div>
                <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">Pending Orders</p><p className="mt-3 text-4xl font-black">{pendingOrders}</p></div>
                <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5"><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">Unread Notifications</p><p className="mt-3 text-4xl font-black">{unreadCount}</p></div>
              </div>
              <div className="grid gap-6 lg:grid-cols-[1.35fr_0.9fr]">
                <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-orange-400">Recent Orders</p><h3 className="mt-2 text-xl font-black">Live order feed</h3></div><button onClick={() => setActiveTab('orders')} className="text-sm font-semibold text-orange-400">View all</button></div>
                  <div className="mt-5 space-y-3">{recentOrders.length === 0 ? <div className="rounded-[20px] border border-white/5 bg-white/[0.03] p-5 text-sm text-zinc-500">No orders yet.</div> : recentOrders.map((order) => <button key={order.id} onClick={() => setSelectedOrder(order)} className={`w-full rounded-[24px] border p-5 text-left transition-all ${selectedOrder?.id === order.id ? 'border-orange-500/30 bg-orange-500/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'}`}><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">Order #{order.id.slice(0, 8)}</p><p className="mt-1 text-lg font-black text-white">₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</p></div><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${badgeClass(order.status || 'placed')}`}>{order.status || 'placed'}</span></div><div className="mt-4 flex items-center justify-between text-xs text-zinc-500"><span>{new Date(order.createdAt).toLocaleDateString()}</span><span>{order.items?.length || 0} items</span></div></button>)}</div>
                </section>
                <section className="rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
                  <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-orange-400">Account Snapshot</p>
                  <div className="mt-4 space-y-4 text-sm text-zinc-400">
                    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4"><User size={16} className="text-orange-400" /> {user.name || 'Unnamed profile'}</div>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4"><Smartphone size={16} className="text-orange-400" /> {user.phone || 'Phone not added'}</div>
                    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-4"><MapPin size={16} className="text-orange-400" /> {addresses.filter((address) => address.isDefault)[0]?.fullAddress || 'No default address'}</div>
                  </div>
                </section>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <section className="mt-6 rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-orange-400">Order Tracking</p><h3 className="mt-2 text-2xl font-black">Step-by-step live tracking</h3></div>
                <div className="flex flex-wrap gap-2">{ORDER_FILTERS.map((filter) => <button key={filter} onClick={() => setSelectedFilter(filter)} className={`rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] ${selectedFilter === filter ? 'border-orange-500/30 bg-orange-500/10 text-white' : 'border-white/10 text-zinc-400 hover:bg-white/5'}`}>{filter}</button>)}</div>
              </div>
              <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-3">{filteredOrders.length === 0 ? <div className="rounded-[20px] border border-white/5 bg-white/[0.03] p-6 text-sm text-zinc-500">No orders match this filter.</div> : filteredOrders.map((order) => <button key={order.id} onClick={() => setSelectedOrder(order)} className={`w-full rounded-[24px] border p-5 text-left transition-all ${selectedOrder?.id === order.id ? 'border-orange-500/30 bg-orange-500/10' : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'}`}><div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">Order #{order.id.slice(0, 8)}</p><p className="mt-1 text-lg font-black text-white">₹{Number(order.totalAmount || 0).toLocaleString('en-IN')}</p></div><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${badgeClass(order.status || 'placed')}`}>{order.status || 'placed'}</span></div><div className="mt-4 flex items-center justify-between text-xs text-zinc-500"><span>{new Date(order.createdAt).toLocaleDateString()}</span><span>{order.items?.length || 0} items</span></div></button>)}</div>
                <div className="rounded-[24px] border border-white/5 bg-white/[0.03] p-5">{selectedOrder ? <><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-zinc-500">Selected Order</p><h4 className="mt-2 text-2xl font-black">Order #{selectedOrder.id.slice(0, 8)}</h4></div><span className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] ${badgeClass(selectedOrder.status || 'placed')}`}>{selectedOrder.status || 'placed'}</span></div><div className="mt-6 space-y-3 rounded-[22px] border border-white/5 bg-[#09090b] p-5">{(selectedOrder.trackingSteps?.length ? selectedOrder.trackingSteps : ['placed', 'confirmed', 'processing', 'shipped', 'delivered'].map((step) => ({ step, done: true }))).map((step) => <div key={step.step} className="flex gap-3"><div className={`mt-1 h-3 w-3 rounded-full ${step.done ? 'bg-emerald-400' : 'bg-white/20'}`} /><div className="flex-1"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold text-white">{step.step}</p><span className="text-[10px] uppercase tracking-[0.25em] text-zinc-500">{step.done ? 'Done' : 'Pending'}</span></div><p className="text-xs text-zinc-500">{step.timestamp ? new Date(step.timestamp).toLocaleString() : 'Waiting for update'}</p></div></div>)}</div></> : <div className="flex min-h-[280px] items-center justify-center rounded-[22px] border border-white/5 bg-white/[0.03] text-sm text-zinc-500">Select an order to inspect the timeline.</div>}</div>
              </div>
            </section>
          )}

          {activeTab === 'addresses' && (
            <section className="mt-6 rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-orange-400">Address Management</p><h3 className="mt-2 text-2xl font-black">Saved delivery addresses</h3></div><button onClick={() => setAddressModal({ ...emptyAddress })} className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-400"><Plus size={16} className="mr-2 inline-block" />Add address</button></div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{addresses.length === 0 ? <div className="rounded-[22px] border border-white/5 bg-white/[0.03] p-6 text-sm text-zinc-500">No saved addresses yet.</div> : addresses.map((address) => <AddressCard key={address.id} address={address} onEdit={setAddressModal} onDelete={async (addr) => { await deleteAddress(user.id, addr.id); toast.success('Address removed'); }} onDefault={async (addr) => { await setDefaultAddress(user.id, addr.id); toast.success('Default address updated'); }} />)}</div>
            </section>
          )}

          {activeTab === 'payments' && (
            <section className="mt-6 rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-orange-400">Payment Methods</p><h3 className="mt-2 text-2xl font-black">Tokenized cards only</h3></div><button onClick={() => setPaymentModal({ ...emptyPayment })} className="rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white hover:bg-orange-400"><Plus size={16} className="mr-2 inline-block" />Add method</button></div>
              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{payments.length === 0 ? <div className="rounded-[22px] border border-white/5 bg-white/[0.03] p-6 text-sm text-zinc-500">No saved payment methods yet.</div> : payments.map((method) => <PaymentCard key={method.id} paymentMethod={method} onEdit={setPaymentModal} onDelete={async (item) => { await deletePaymentMethod(user.id, item.id); toast.success('Payment method removed'); }} onDefault={async (item) => { await setDefaultPaymentMethod(user.id, item.id); toast.success('Default payment method updated'); }} />)}</div>
            </section>
          )}

          {activeTab === 'settings' && (
            <section className="mt-6 rounded-[28px] border border-white/5 bg-white/[0.03] p-5">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.35em] text-orange-400">Account Settings</p><h3 className="mt-2 text-2xl font-black">Profile and security</h3></div>
              <form onSubmit={saveSettingsHandler} className="mt-6 grid gap-5 lg:grid-cols-2">
                <label className="lg:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Display Name</span><input value={settingsForm.name} onChange={(e) => setSettingsForm((prev) => ({ ...prev, name: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none" /></label>
                <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Phone Number</span><input value={settingsForm.phone} onChange={(e) => setSettingsForm((prev) => ({ ...prev, phone: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none" /></label>
                <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Email</span><input value={settingsForm.email} onChange={(e) => setSettingsForm((prev) => ({ ...prev, email: e.target.value }))} className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none" /></label>
                <label className="lg:col-span-2"><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Profile Photo</span><input name="profilePhoto" type="file" accept="image/*" className="w-full rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-zinc-400 file:mr-4 file:rounded-full file:border-0 file:bg-white/5 file:px-4 file:py-2 file:text-white" /></label>
                <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Current Password</span><input value={settingsForm.currentPassword} onChange={(e) => setSettingsForm((prev) => ({ ...prev, currentPassword: e.target.value }))} type="password" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none" /></label>
                <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">New Password</span><input value={settingsForm.nextPassword} onChange={(e) => setSettingsForm((prev) => ({ ...prev, nextPassword: e.target.value }))} type="password" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none" /></label>
                <label><span className="mb-2 block text-xs font-bold uppercase tracking-[0.25em] text-zinc-500">Confirm Password</span><input value={settingsForm.confirmPassword} onChange={(e) => setSettingsForm((prev) => ({ ...prev, confirmPassword: e.target.value }))} type="password" className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-white outline-none" /></label>
                <div className="lg:col-span-2 flex flex-col gap-3 md:flex-row"><button type="submit" disabled={busy} className="rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-400 disabled:opacity-60">{busy ? <Loader2 size={16} className="mr-2 inline-block animate-spin" /> : <Check size={16} className="mr-2 inline-block" />}Save changes</button><button type="button" onClick={deleteAccountHandler} className="rounded-2xl border border-rose-500/20 px-5 py-3 text-sm font-semibold text-rose-300 hover:bg-rose-500/10">Delete account</button></div>
                {photoBusy && <p className="lg:col-span-2 text-xs text-zinc-500">Uploading profile photo...</p>}
              </form>
            </section>
          )}
        </main>
      </div>

      <AnimatePresence>{drawerOpen && <NotificationDrawer notifications={notifications} onClose={() => setDrawerOpen(false)} onMarkRead={markNotification} onMarkAll={async () => { await markAllNotificationsRead(user.id); toast.success('Notifications marked read'); }} />}</AnimatePresence>
      <AnimatePresence>{addressModal && <ModalForm title={addressModal.id ? 'Edit Address' : 'Add Address'} description="Stored under users/{uid}/addresses" value={addressModal} onClose={() => setAddressModal(null)} onSave={saveAddressHandler} type="address" />}</AnimatePresence>
      <AnimatePresence>{paymentModal && <ModalForm title={paymentModal.id ? 'Edit Payment Method' : 'Add Payment Method'} description="Store tokens only - never raw card numbers" value={paymentModal} onClose={() => setPaymentModal(null)} onSave={savePaymentHandler} type="payment" />}</AnimatePresence>
    </div>
  );
}

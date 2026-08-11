import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BellRing, LogOut, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import { io } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['all', 'pending', 'confirmed', 'dispatched', 'delivered'];

const STATUS_LABELS = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  dispatched: 'Dispatched',
  delivered: 'Delivered',
};

const STATUS_STYLES = {
  pending: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  confirmed: 'border-blue-500/30 bg-blue-500/10 text-blue-200',
  dispatched: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-200',
  delivered: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
};

function formatMoney(value) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(value || 0));
}

function formatDateTime(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function toTimestamp(value) {
  if (!value) return 0;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function playAlertTone() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.value = 880;
    gainNode.gain.value = 0.02;

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.18);
    oscillator.onended = () => context.close();
  } catch {
    // Browser blocked audio or the API is unavailable.
  }
}

function normalizeOrder(order) {
  const deliveryAddress = order.deliveryAddress || {};
  const items = Array.isArray(order.items) ? order.items : [];

  return {
    ...order,
    orderId: order.orderId || order.id,
    customerName: order.customerName || '',
    mobileNumber: order.mobileNumber || '',
    deliveryAddress: {
      line1: deliveryAddress.line1 || '',
      line2: deliveryAddress.line2 || '',
      city: deliveryAddress.city || '',
      state: deliveryAddress.state || '',
      pincode: deliveryAddress.pincode || '',
    },
    items: items.map((item) => ({
      productName: item.productName || item.name || '',
      quantity: Number(item.quantity ?? item.qty ?? 1),
      price: Number(item.price ?? 0),
    })),
    subtotal: Number(order.subtotal ?? 0),
    tax: Number(order.tax ?? 0),
    totalAmount: Number(order.totalAmount ?? 0),
    paymentMethod: order.paymentMethod || 'Card',
    status: (order.status || 'pending').toLowerCase(),
  };
}

function StatCard({ label, value, accent }) {
  const accentClasses = {
    rose: 'from-rose-500/20 to-rose-500/5 border-rose-500/20',
    emerald: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20',
    amber: 'from-amber-500/20 to-amber-500/5 border-amber-500/20',
    cyan: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20',
  };

  return (
    <div className={`rounded-[1.75rem] border bg-gradient-to-br ${accentClasses[accent]} p-5 shadow-lg shadow-black/20`}>
      <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-400">{label}</p>
      <p className="mt-4 text-3xl font-black tracking-tight text-white">{value}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const { logout, API } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState('');
  const [badgeCount, setBadgeCount] = useState(0);
  const [banner, setBanner] = useState(null);
  const [flashMap, setFlashMap] = useState({});
  const timersRef = useRef(new Map());

  const loadOrders = useCallback(async ({ announceNewIds = [] } = {}) => {
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/admin/orders`, { credentials: 'include' });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load orders');
      }

      const normalized = (data.orders || []).map(normalizeOrder);
      setOrders(normalized);

      if (announceNewIds.length) {
        setBadgeCount((current) => current + announceNewIds.length);
        setBanner({
          title: 'New order received',
          message: `Order ${announceNewIds[0]} arrived just now.`,
        });
        playAlertTone();
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      loadOrders();
    }, 30000);

    return () => window.clearInterval(interval);
  }, [loadOrders]);

  useEffect(() => {
    const socket = io({ transports: ['websocket'] });

    socket.on('new-order', (order) => {
      const orderId = order?.orderId;
      if (!orderId) return;

      setFlashMap((current) => ({ ...current, [orderId]: Date.now() }));

      const timeoutId = window.setTimeout(() => {
        setFlashMap((current) => {
          const next = { ...current };
          delete next[orderId];
          return next;
        });
        timersRef.current.delete(orderId);
      }, 5000);

      timersRef.current.set(orderId, timeoutId);
      loadOrders({ announceNewIds: [orderId] });
    });

    return () => {
      socket.disconnect();
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    const searchLower = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
      const matchesSearch = !searchLower || order.orderId?.toLowerCase().includes(searchLower) || order.customerName?.toLowerCase().includes(searchLower);
      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const todayOrders = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return orders.filter((order) => toTimestamp(order.createdAt) >= start.getTime());
  }, [orders]);

  const stats = useMemo(() => ({
    totalOrdersToday: todayOrders.length,
    revenueToday: todayOrders.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0),
    pendingCount: orders.filter((order) => order.status === 'pending').length,
    deliveredCount: orders.filter((order) => order.status === 'delivered').length,
  }), [orders, todayOrders]);

  const updateStatus = async (orderId, status) => {
    setUpdatingId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to update order');
      }

      setOrders((current) => current.map((order) => (order.orderId === orderId ? normalizeOrder(data.order) : order)));
      setBanner({ title: 'Status updated', message: `Order ${orderId} is now ${STATUS_LABELS[status]}.` });
    } finally {
      setUpdatingId('');
    }
  };

  const deleteOrder = async (orderId) => {
    const confirmed = window.confirm(`Delete order ${orderId}? This cannot be undone.`);
    if (!confirmed) return;

    setUpdatingId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderId)}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to delete order');
      }

      setOrders((current) => current.filter((order) => order.orderId !== orderId));
    } finally {
      setUpdatingId('');
    }
  };

  return (
    <div className="min-h-screen bg-[#070707] px-4 py-6 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-rose-500/20 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-rose-200">
                <ShieldAlert size={14} /> Admin dashboard
              </div>
              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-5xl">Orders live from the database</h1>
              <p className="mt-2 text-sm text-zinc-400">Realtime order tracking, status updates, and admin controls.</p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <a
                href="/yehlepakadmerachoco"
                className="inline-flex items-center gap-2 rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20"
              >
                Open New Admin
              </a>
              <button
                type="button"
                onClick={() => loadOrders()}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <RefreshCw size={16} /> Refresh
              </button>
              <button
                type="button"
                onClick={logout}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                <LogOut size={16} /> Logout
              </button>
              <div className="relative rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
                <span className="inline-flex items-center gap-2">
                  <BellRing size={16} /> Live alerts
                </span>
                {badgeCount > 0 && (
                  <span className="absolute -right-2 -top-2 inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-rose-500 px-2 text-[11px] font-black text-white">
                    {badgeCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {banner && (
            <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
              <p className="font-semibold">{banner.title}</p>
              <p className="mt-1 text-emerald-100/80">{banner.message}</p>
            </div>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total orders today" value={stats.totalOrdersToday} accent="rose" />
          <StatCard label="Total revenue today" value={formatMoney(stats.revenueToday)} accent="emerald" />
          <StatCard label="Pending orders" value={stats.pendingCount} accent="amber" />
          <StatCard label="Delivered orders" value={stats.deliveredCount} accent="cyan" />
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">Orders</h2>
              <p className="mt-1 text-sm text-zinc-400">Search, filter, and update live orders.</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-600 focus:border-rose-500/40 sm:w-80"
                  placeholder="Search order ID or customer name"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-rose-500/40"
              >
                <option value="all" className="bg-zinc-900">All statuses</option>
                {STATUS_OPTIONS.filter((value) => value !== 'all').map((value) => (
                  <option key={value} value={value} className="bg-zinc-900">
                    {STATUS_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10">
            <table className="min-w-[1280px] w-full border-collapse text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase tracking-[0.25em] text-zinc-400">
                <tr>
                  <th className="px-4 py-4 font-semibold">Order ID</th>
                  <th className="px-4 py-4 font-semibold">Customer</th>
                  <th className="px-4 py-4 font-semibold">Mobile</th>
                  <th className="px-4 py-4 font-semibold">Delivery address</th>
                  <th className="px-4 py-4 font-semibold">Items ordered</th>
                  <th className="px-4 py-4 font-semibold">Total amount</th>
                  <th className="px-4 py-4 font-semibold">Payment method</th>
                  <th className="px-4 py-4 font-semibold">Status</th>
                  <th className="px-4 py-4 font-semibold">Order date & time</th>
                  <th className="px-4 py-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-zinc-400" colSpan={10}>
                      Loading orders...
                    </td>
                  </tr>
                ) : filteredOrders.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-center text-zinc-400" colSpan={10}>
                      No orders found.
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const flashActive = Boolean(flashMap[order.orderId]);

                    return (
                      <tr
                        key={order.orderId}
                        className={`border-t border-white/5 transition ${flashActive ? 'bg-emerald-500/10' : 'hover:bg-white/5'}`}
                      >
                        <td className="px-4 py-4 font-mono text-xs text-rose-300">{order.orderId}</td>
                        <td className="px-4 py-4">
                          <div className="font-semibold text-white">{order.customerName}</div>
                        </td>
                        <td className="px-4 py-4 text-zinc-300">{order.mobileNumber}</td>
                        <td className="px-4 py-4 text-zinc-300">
                          <div className="max-w-[260px] space-y-1">
                            <p>{order.deliveryAddress.line1}</p>
                            {order.deliveryAddress.line2 ? <p>{order.deliveryAddress.line2}</p> : null}
                            <p>{[order.deliveryAddress.city, order.deliveryAddress.state, order.deliveryAddress.pincode].filter(Boolean).join(', ')}</p>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-zinc-300">
                          <div className="max-w-[260px] space-y-1">
                            {order.items.map((item, index) => (
                              <p key={`${order.orderId}-${index}`}>
                                {item.productName} x {item.quantity}
                              </p>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 font-semibold text-white">{formatMoney(order.totalAmount)}</td>
                        <td className="px-4 py-4 text-zinc-300">{order.paymentMethod}</td>
                        <td className="px-4 py-4">
                          <select
                            value={order.status}
                            onChange={(event) => updateStatus(order.orderId, event.target.value)}
                            disabled={updatingId === order.orderId}
                            className={`rounded-2xl border px-3 py-2 text-sm font-semibold outline-none transition ${STATUS_STYLES[order.status] || STATUS_STYLES.pending}`}
                          >
                            {Object.entries(STATUS_LABELS).map(([value, label]) => (
                              <option key={value} value={value} className="bg-zinc-900 text-white">
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-4 text-zinc-400">{formatDateTime(order.createdAt)}</td>
                        <td className="px-4 py-4">
                          <button
                            type="button"
                            onClick={() => deleteOrder(order.orderId)}
                            disabled={updatingId === order.orderId}
                            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
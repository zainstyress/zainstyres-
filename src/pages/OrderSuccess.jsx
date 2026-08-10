import React, { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

export default function OrderSuccess() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const location = useLocation();

  useEffect(() => {
    const preload = location.state?.order;
    if (preload && preload.id === orderId) {
      setOrder(preload);
      setLoading(false);
      return;
    }

    const loadOrder = async () => {
      try {
        const response = await fetch(`/api/orders/public/${orderId}`);
        const data = await response.json();

        if (!response.ok || !data.success || !data.order) {
          throw new Error(data.error || "Order not found");
        }

        setOrder(data.order);
      } catch (error) {
        setErrorMessage(error.message || "Unable to load order details");
      } finally {
        setLoading(false);
      }
    };

    loadOrder();
  }, [location.state, orderId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#080808] text-white px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-zinc-950/80 p-10 text-center shadow-2xl shadow-black/40">
          <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Loading order</p>
          <h1 className="mt-6 text-4xl font-black">Fetching confirmation</h1>
          <p className="mt-4 text-zinc-400">Please wait while we load your saved order from the server.</p>
        </div>
      </main>
    );
  }

  if (!order || errorMessage) {
    return (
      <main className="min-h-screen bg-[#080808] text-white px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-zinc-950/80 p-10 text-center shadow-2xl shadow-black/40">
          <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Order unavailable</p>
          <h1 className="mt-6 text-4xl font-black">We could not confirm your order</h1>
          <p className="mt-4 text-zinc-400">{errorMessage || "The order record is missing on the server. Please contact support or try again."}</p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:justify-center">
            <Link to="/" className="rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-rose-400">Continue shopping</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl space-y-8">
        <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-10 shadow-2xl shadow-black/40">
          <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Order success</p>
          <h1 className="mt-6 text-5xl font-black tracking-tight">Your order is confirmed</h1>
          <p className="mt-4 text-zinc-400">Order ID <span className="font-semibold text-white">{order.orderId || order.id}</span> has been placed successfully.</p>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">Delivery details</p>
              <div className="mt-4 space-y-2 text-white">
                <p className="font-semibold">{order.customerName || order.deliveryAddress?.fullName}</p>
                <p>{order.deliveryAddress?.address1}{order.deliveryAddress?.address2 ? `, ${order.deliveryAddress.address2}` : ""}</p>
                <p>{order.deliveryAddress?.city}, {order.deliveryAddress?.state} - {order.deliveryAddress?.pin}</p>
                <p>Phone: {order.mobile || order.deliveryAddress?.phone}</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-black/40 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">Summary</p>
              <div className="mt-4 space-y-2 text-white">
                <p className="font-semibold">Payment: {order.paymentMethod}</p>
                <p>Status: {order.status}</p>
                <p>Total: {formatCurrency(order.totalAmount || order.total)}</p>
                <p>Timestamp: {order.timestamp || order.createdAt}</p>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-[2rem] border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Items ordered</p>
            <div className="mt-5 space-y-4">
              {(order.items || []).map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-3xl border border-white/10 bg-[#101010] p-4">
                  <div>
                    <p className="font-semibold text-white">{item.name}</p>
                    <p className="text-sm text-zinc-400">Qty {item.qty || item.quantity}</p>
                  </div>
                  <p className="font-semibold text-white">{formatCurrency(Number(item.price || 0) * Number(item.qty || item.quantity || 1))}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:justify-between">
            <Link to="/" className="rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-rose-400">Continue shopping</Link>
            <Link to="/" className="rounded-full border border-white/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:border-rose-500/30">Return home</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { adminWhatsAppNumber, formatMoney, formatOrderStatus, normalizeOrderStatus, toDate } from "./adminUtils";

const statuses = ["all", "pending", "confirmed", "dispatched"];

export default function NewAdminOrders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      setOrders(
        snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .map((order) => ({
            ...order,
            status: normalizeOrderStatus(order.status || order.orderStatus || order.order_status),
            totalAmount: Number(order.totalAmount ?? order.total ?? 0),
          }))
          .sort((left, right) => new Date(right.timestamp || right.createdAt || right.created_at || 0).getTime() - new Date(left.timestamp || left.createdAt || left.created_at || 0).getTime())
      );
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(
    () => (filter === "all" ? orders : orders.filter((order) => order.status === filter)),
    [orders, filter]
  );

  const updateStatus = (id, status) => updateDoc(doc(db, "orders", id), { status });

  return (
    <section>
      <h1>Orders</h1>
      <div className="za-tabs">
        {statuses.map((status) => <button className={filter === status ? "active" : ""} key={status} onClick={() => setFilter(status)}>{status}</button>)}
      </div>
      {!filtered.length ? <p>No orders yet</p> : (
        <table className="za-table">
          <thead><tr><th>Order ID</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map((order) => (
              <>
                <tr key={order.id} onClick={() => setOpen(open === order.id ? null : order.id)}>
                  <td>{order.orderId || order.id}</td><td>{order.customerName || order.name || order.deliveryAddress?.fullName || order.customer?.name}</td><td>{order.items?.length || 0}</td><td>{formatMoney(order.totalAmount)}</td>
                  <td><select value={order.status || "pending"} onChange={(e) => updateStatus(order.id, e.target.value)} onClick={(e) => e.stopPropagation()}>{statuses.filter((s) => s !== "all").map((s) => <option key={s} value={s}>{formatOrderStatus(s)}</option>)}</select></td>
                  <td>{toDate(order.timestamp || order.createdAt || order.created_at)?.toLocaleDateString("en-IN")}</td>
                  <td><a href={`https://wa.me/${order.phone || order.customer?.phone || adminWhatsAppNumber}?text=${encodeURIComponent(`Hi, about your order ${order.id}`)}`} target="_blank" rel="noreferrer">WhatsApp</a></td>
                </tr>
                {open === order.id && (
                  <tr><td colSpan="7"><div className="za-detail"><pre>{JSON.stringify(order, null, 2)}</pre></div></td></tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

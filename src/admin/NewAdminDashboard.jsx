import { useEffect, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { formatMoney, formatOrderStatus, normalizeOrderStatus, toDate } from "./adminUtils";

export default function NewAdminDashboard() {
  const [revenue, setRevenue] = useState(0);
  const [orders, setOrders] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "orders"), (snap) => {
      const normalized = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .map((order) => ({
          ...order,
          status: normalizeOrderStatus(order.status || order.orderStatus || order.order_status),
          totalAmount: Number(order.totalAmount ?? order.total ?? 0),
        }));

      setRevenue(normalized.filter((order) => order.status === "confirmed").reduce((sum, order) => sum + order.totalAmount, 0));
    });
    return () => unsub();
  }, []);

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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const confirmedOrders = orders.filter((order) => order.status === "confirmed");
  const pending = orders.filter((order) => order.status === "pending").length;
  const active = users.filter((user) => {
    if (user.isOnline) return true;
    const seen = toDate(user.lastSeen);
    return !!seen;
  }).length;

  return (
    <section>
      <h1>Dashboard</h1>
      <div className="za-stats">
        <article><span>EST. REVENUE</span><strong>{formatMoney(revenue)}</strong><small>Today</small></article>
        <article><span>TOTAL ORDERS</span><strong>{confirmedOrders.length}</strong><small>{pending} Pending</small></article>
        <article><span>ACTIVE USERS</span><strong>{active}</strong><small>Today / online</small></article>
        <article><span>TOTAL USERS</span><strong>{users.length}</strong><small>All users</small></article>
      </div>

      <div className="za-feed" style={{ marginTop: 24 }}>
        <h2>Confirmed Orders</h2>
        {!confirmedOrders.length ? (
          <p>No confirmed orders yet</p>
        ) : (
          <ul>
            {confirmedOrders.map((order) => (
              <li key={order.id}>
                <strong>{order.orderId || order.id}</strong>
                <span>{order.customerName || order.name || order.deliveryAddress?.fullName || "Unknown customer"}</span>
                <span>{formatOrderStatus(order.status)}</span>
                <span>{formatMoney(order.totalAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

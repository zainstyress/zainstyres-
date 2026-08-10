import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { matchesSearch, toDate } from "./adminUtils";

export default function NewAdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => users.filter((user) => matchesSearch(user, search, ["name", "email"])), [users, search]);

  const changeRole = async (user, role) => {
    if (role === "admin" && !window.confirm("Are you sure you want to make this user an admin?")) return;
    await updateDoc(doc(db, "users", user.id), { role });
  };

  return (
    <section>
      <h1>Users</h1>
      <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" />
      <table className="za-table">
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Orders</th><th>Joined</th><th>Role</th><th>Actions</th></tr></thead>
        <tbody>
          {filtered.map((user) => (
            <>
              <tr key={user.id}>
                <td>{user.name}</td><td>{user.email}</td><td>{user.phone}</td><td>{user.orderCount || user.orders?.length || 0}</td><td>{toDate(user.createdAt)?.toLocaleDateString("en-IN")}</td>
                <td><select value={user.role || "user"} onChange={(e) => changeRole(user, e.target.value)}><option>user</option><option>admin</option></select></td>
                <td><button onClick={() => setOpen(open === user.id ? null : user.id)}>View</button><button onClick={() => updateDoc(doc(db, "users", user.id), { blocked: !user.blocked })}>{user.blocked ? "Unblock" : "Block"}</button></td>
              </tr>
              {open === user.id && <tr><td colSpan="7"><pre>{JSON.stringify(user, null, 2)}</pre></td></tr>}
            </>
          ))}
        </tbody>
      </table>
    </section>
  );
}

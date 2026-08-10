import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import { notify } from "./adminUtils";
import "./newAdmin.css";

const links = [
  ["Dashboard", "/yehlepakadmerachoco"],
  ["Orders", "/yehlepakadmerachoco/orders"],
  ["Users", "/yehlepakadmerachoco/users"],
  ["Inventory", "/yehlepakadmerachoco/inventory"],
  ["Branches", "/yehlepakadmerachoco/branches"],
  ["Reviews", "/yehlepakadmerachoco/reviews"],
  ["Site Settings", "/yehlepakadmerachoco/settings"],
];

export default function NewAdminLayout() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem("cartItems");
    notify("Signed out");
    navigate("/");
  };

  return (
    <div className="za-admin">
      <button className="za-menu" type="button" onClick={() => setOpen(true)}>
        ☰
      </button>
      <div className={open ? "za-backdrop open" : "za-backdrop"} onClick={() => setOpen(false)} />
      <aside className={open ? "za-sidebar open" : "za-sidebar"}>
        <div className="za-brand">
          <strong>ZAINS ADMIN</strong>
          <button type="button" onClick={() => setOpen(false)}>X</button>
        </div>
        <nav>
          {links.map(([label, to]) => (
            <NavLink end={to === "/yehlepakadmerachoco"} key={to} to={to} onClick={() => setOpen(false)}>
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="za-quick">
          <button type="button" onClick={() => navigate("/yehlepakadmerachoco/reviews")}>MANAGE REVIEWS</button>
          <button type="button" onClick={() => navigate("/yehlepakadmerachoco/inventory/add")}>ADD TYRE</button>
          <button type="button" onClick={() => navigate("/yehlepakadmerachoco/branches")}>MANAGE BRANCHES</button>
        </div>
        <button className="za-signout" type="button" onClick={logout}>Sign Out</button>
      </aside>
      <main className="za-main">
        <Outlet />
      </main>
    </div>
  );
}

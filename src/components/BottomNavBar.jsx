import { Link, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";

const tabs = [
  { path: "/", label: "Home", icon: "⌂" },
  { path: "/search", label: "Search", icon: "⌕" },
  { path: "/bag", label: "Bag", icon: "▢", showCount: true },
  { path: "/branches", label: "Branches", icon: "⌖" },
  { path: "/", label: "User", icon: "○" },
];

export default function BottomNavBar() {
  const location = useLocation();
  const { cartCount } = useCart();

  return (
    <nav className="bottom-nav-bar" aria-label="Mobile navigation">
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;

        return (
          <Link
            aria-label={tab.label}
            className={isActive ? "bottom-nav-bar__tab active" : "bottom-nav-bar__tab"}
            key={tab.path}
            style={{ color: isActive ? "#ef4444" : "rgba(255,255,255,0.62)" }}
            to={tab.path}
          >
            <span className="bottom-nav-bar__icon">
              <span aria-hidden="true">{tab.icon}</span>
              {tab.showCount && cartCount > 0 ? (
                <span className="bottom-nav-bar__badge">{cartCount}</span>
              ) : null}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

const addonTypes = ["all", "performance", "care", "utility", "styling"];

export default function AddonsPage() {
  const [addons, setAddons] = useState([]);
  const [activeType, setActiveType] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const addonsQuery =
      activeType === "all"
        ? query(collection(db, "tyres"), where("category", "==", "addon"))
        : query(
            collection(db, "tyres"),
            where("category", "==", "addon"),
            where("type", "==", activeType)
          );

    const unsub = onSnapshot(
      addonsQuery,
      (snapshot) => {
        setAddons(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      () => {
        window.dispatchEvent(
          new CustomEvent("app-toast", {
            detail: { message: "Something went wrong", type: "error" },
          })
        );
        setLoading(false);
      }
    );

    return () => unsub();
  }, [activeType]);

  const visibleTypes = useMemo(() => {
    const found = new Set(addons.map((addon) => addon.type).filter(Boolean));
    return addonTypes.filter((type) => type === "all" || found.has(type));
  }, [addons]);

  return (
    <main className="shop-page addons-page">
      <header className="shop-page__header">
        <h1>Performance Add-ons</h1>
        <div className="shop-page__filters" aria-label="Filter add-ons">
          {visibleTypes.map((type) => (
            <button
              className={activeType === type ? "active" : ""}
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
            >
              {type}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <p>Loading add-ons...</p>
      ) : (
        <section className="shop-grid">
          {addons.map((addon) => (
            <Link className="tyre-card" key={addon.id} to={`/product/${addon.id}`}>
              {addon.image || addon.imageUrl ? (
                <img src={addon.image || addon.imageUrl} alt={addon.name} />
              ) : null}
              <div>
                <h2>{addon.name}</h2>
                {addon.type && <p>{addon.type}</p>}
                <strong>₹{Number(addon.price) || 0}</strong>
              </div>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}

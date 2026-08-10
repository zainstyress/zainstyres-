import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, deleteDoc, doc, onSnapshot } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { db, storage } from "../firebase";
import { formatMoney, matchesSearch, notify } from "./adminUtils";

export default function NewAdminInventory() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [deleteItem, setDeleteItem] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "tyres"), (snap) => {
      setItems(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(
    () => items.filter((item) => matchesSearch(item, search, ["name", "brand", "category", "sku"])),
    [items, search]
  );

  const removeTyre = async () => {
    if (!deleteItem) return;
    const images = deleteItem.images || [];
    await Promise.allSettled(
      images.map((_, index) => deleteObject(ref(storage, `tyres/${deleteItem.id}/image_${index}.jpg`)))
    );
    await deleteDoc(doc(db, "tyres", deleteItem.id));
    notify("Tyre deleted successfully");
    setDeleteItem(null);
  };

  return (
    <section>
      <header className="za-header">
        <h1>Inventory</h1>
        <div>
          <button type="button" onClick={() => navigate("/yehlepakadmerachoco/reviews")}>REVIEWS</button>
          <button type="button" onClick={() => navigate("/yehlepakadmerachoco/inventory/add")}>+ NEW TYRE</button>
        </div>
      </header>
      <label className="za-search">
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, brand, category, SKU" />
        {search && <button type="button" onClick={() => setSearch("")}>X</button>}
      </label>
      <table className="za-table">
        <thead><tr><th>Product</th><th>Brand</th><th>Category</th><th>SKU</th><th>Stock</th><th>Price</th><th>Actions</th></tr></thead>
        <tbody>
          {filtered.map((item) => (
            <tr key={item.id}>
              <td><span className="za-product">{item.images?.[0] ? <img src={item.images[0]} alt={item.name} /> : <i />} {item.name}</span></td>
              <td>{item.brand}</td><td>{item.category}</td><td>{item.sku}</td><td>{item.stockQty ?? item.stock}</td><td>{formatMoney(item.price)}</td>
              <td><button onClick={() => navigate(`/yehlepakadmerachoco/inventory/${item.id}/edit`)}>EDIT</button><button onClick={() => setDeleteItem(item)}>DELETE</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="za-mobile-list">
        {filtered.map((item) => (
          <article key={item.id}>
            {item.images?.[0] ? <img src={item.images[0]} alt={item.name} /> : <i />}
            <div><h2>{item.name}</h2><p>{item.brand}</p><strong>{formatMoney(item.price)}</strong><span>{item.category}</span><small>Stock: {item.stockQty ?? item.stock}</small></div>
            <button onClick={() => navigate(`/yehlepakadmerachoco/inventory/${item.id}/edit`)}>EDIT</button>
            <button onClick={() => setDeleteItem(item)}>DELETE</button>
          </article>
        ))}
      </div>
      {deleteItem && (
        <div className="za-modal">
          <div>
            <h2>Delete {deleteItem.name}?</h2>
            <p>This cannot be undone.</p>
            <button type="button" onClick={() => setDeleteItem(null)}>Cancel</button>
            <button type="button" onClick={removeTyre}>Delete</button>
          </div>
        </div>
      )}
    </section>
  );
}

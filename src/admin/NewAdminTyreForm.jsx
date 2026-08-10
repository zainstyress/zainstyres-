import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../firebase";
import { compressImage, formatMoney, notify } from "./adminUtils";

const empty = {
  name: "", brand: "", category: "Tyres", condition: "New", treadPercent: "",
  size: "", price: "", discount: 0, stockQty: "", description: "",
  width: "", aspectRatio: "", rimDiameter: "", loadIndex: "", speedRating: "",
  tyreType: "Tubeless", warranty: "", isActive: true, isFeatured: false, images: [],
};

export default function NewAdminTyreForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [files, setFiles] = useState([]);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "tyres", id)).then((snap) => {
      if (snap.exists()) setForm((current) => ({ ...current, ...snap.data() }));
    });
  }, [id]);

  const finalPrice = useMemo(() => {
    const price = Number(form.price) || 0;
    const discount = Math.min(90, Math.max(0, Number(form.discount) || 0));
    return Math.round(price - price * (discount / 100));
  }, [form.price, form.discount]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const pickFiles = (incoming) => {
    setFiles((current) => [...current, ...Array.from(incoming)].slice(0, 10));
  };

  const uploadImages = async (tyreId) => {
    const keptImages = form.images || [];
    const uploaded = [];
    for (let index = 0; index < files.length; index += 1) {
      const compressed = await compressImage(files[index]);
      const imageRef = ref(storage, `tyres/${tyreId}/image_${keptImages.length + index}.jpg`);
      const task = uploadBytesResumable(imageRef, compressed);
      await new Promise((resolve, reject) => {
        task.on("state_changed", (snap) => {
          setProgress((current) => ({ ...current, [index]: Math.round((snap.bytesTransferred / snap.totalBytes) * 100) }));
        }, reject, resolve);
      });
      uploaded.push(await getDownloadURL(imageRef));
    }
    return [...keptImages, ...uploaded];
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.name || !form.brand || !form.price || !form.stockQty) {
      notify("Please fill required fields");
      return;
    }
    const tyreId = id || doc(db, "tyres").id;
    const images = await uploadImages(tyreId);
    await setDoc(doc(db, "tyres", tyreId), {
      ...form,
      price: Number(form.price),
      discount: Number(form.discount) || 0,
      salePrice: finalPrice,
      stockQty: Number(form.stockQty),
      images,
      updatedAt: serverTimestamp(),
      createdAt: form.createdAt || serverTimestamp(),
    }, { merge: true });
    notify("Tyre saved successfully!");
    navigate("/yehlepakadmerachoco/inventory");
  };

  return (
    <form className="za-form" onSubmit={save}>
      <h1>{id ? "Edit Tyre" : "Add Tyre"}</h1>
      <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Product name" />
      <input required value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Brand" />
      <select value={form.category} onChange={(e) => set("category", e.target.value)}><option>Tyres</option><option>Accessories</option><option>Other</option></select>
      <select value={form.condition} onChange={(e) => set("condition", e.target.value)}><option>New</option><option>Used</option></select>
      {form.condition === "Used" && <input value={form.treadPercent} onChange={(e) => set("treadPercent", e.target.value)} placeholder="Tread %" />}
      <input value={form.size} onChange={(e) => set("size", e.target.value)} placeholder="Size e.g. 185/65 R15" />
      <input required type="number" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="Price" />
      <input min="0" max="90" type="number" value={form.discount} onChange={(e) => set("discount", e.target.value)} placeholder="Discount %" />
      <p>{formatMoney(form.price)} -> {formatMoney(finalPrice)} (-{form.discount || 0}%)</p>
      <input required type="number" value={form.stockQty} onChange={(e) => set("stockQty", e.target.value)} placeholder="Stock quantity" />
      <textarea value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Description" />
      {["width", "aspectRatio", "rimDiameter", "loadIndex", "speedRating", "tyreType", "warranty"].map((key) => (
        <input key={key} value={form[key]} onChange={(e) => set(key, e.target.value)} placeholder={key} />
      ))}
      <label><input checked={form.isActive} type="checkbox" onChange={(e) => set("isActive", e.target.checked)} /> Active</label>
      <label><input checked={form.isFeatured} type="checkbox" onChange={(e) => set("isFeatured", e.target.checked)} /> Featured</label>
      <label className="za-upload">Upload images<input multiple accept="image/*" type="file" onChange={(e) => pickFiles(e.target.files)} /></label>
      <label className="za-upload">Camera<input accept="image/*" capture="environment" type="file" onChange={(e) => pickFiles(e.target.files)} /></label>
      <div className="za-image-grid">
        {(form.images || []).map((image, index) => <img alt="" key={image} src={image} onClick={() => set("images", [image, ...form.images.filter((_, i) => i !== index)])} />)}
        {files.map((file, index) => <span key={file.name}>{file.name}<small>{progress[index] || 0}%</small><button type="button" onClick={() => setFiles(files.filter((_, i) => i !== index))}>X</button></span>)}
      </div>
      <div className="za-form-actions"><button type="button" onClick={() => navigate("/yehlepakadmerachoco/inventory")}>Cancel</button><button type="submit">Save</button></div>
    </form>
  );
}

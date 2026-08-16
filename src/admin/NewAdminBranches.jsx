import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";
import { compressImage, notify } from "./adminUtils";
import BranchPhotoManager from "../components/BranchPhotoManager";

export default function NewAdminBranches() {
  const [branches, setBranches] = useState([]);
  const [photoBranch, setPhotoBranch] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "branches"), (snap) => {
      setBranches(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const setBranch = (id, key, value) => setBranches((current) => current.map((b) => b.id === id ? { ...b, [key]: value } : b));

  const upload = async (branch, files) => {
    const next = [...(branch.images || [])];
    for (const file of Array.from(files).slice(0, 10 - next.length)) {
      const image = await compressImage(file);
      const imageRef = ref(storage, `branches/${branch.id}/image_${next.length}.jpg`);
      await uploadBytes(imageRef, image);
      next.push(await getDownloadURL(imageRef));
    }
    setBranch(branch.id, "images", next);
  };

  const save = async (branch) => {
    await setDoc(doc(db, "branches", branch.id), branch, { merge: true });
    notify("Branch saved");
  };

  return (
    <section>
      <h1>Branches</h1>
      <div className="za-branch-grid">
        {branches.map((branch) => (
          <article key={branch.id}>
            <input value={branch.name || ""} onChange={(e) => setBranch(branch.id, "name", e.target.value)} placeholder="Branch name" />
            <input value={branch.address || ""} onChange={(e) => setBranch(branch.id, "address", e.target.value)} placeholder="Address" />
            <input value={branch.city || ""} onChange={(e) => setBranch(branch.id, "city", e.target.value)} placeholder="City" />
            <input value={branch.phone || ""} onChange={(e) => setBranch(branch.id, "phone", e.target.value)} placeholder="Phone" />
            <input value={branch.timings || ""} onChange={(e) => setBranch(branch.id, "timings", e.target.value)} placeholder="Timings" />
            <input value={branch.mapsUrl || ""} onChange={(e) => setBranch(branch.id, "mapsUrl", e.target.value)} placeholder="Google Maps link" />
            <input value={(branch.services || []).join(", ")} onChange={(e) => setBranch(branch.id, "services", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="Services" />
            <label><input checked={!!branch.isActive} type="checkbox" onChange={(e) => setBranch(branch.id, "isActive", e.target.checked)} /> Active</label>
            <label><input checked={!!branch.isPrimary} type="checkbox" onChange={(e) => setBranch(branch.id, "isPrimary", e.target.checked)} /> Primary</label>
            <input multiple accept="image/*" type="file" onChange={(e) => upload(branch, e.target.files)} />
            <div className="za-image-grid">{(branch.images || []).map((image) => <img key={image} alt="" src={image} />)}</div>
            <button type="button" onClick={() => setPhotoBranch(branch)}>
              📷 MANAGE PHOTOS ({branch.images?.length || 0}/10)
            </button>
            <button onClick={() => save(branch)}>SAVE</button>
          </article>
        ))}
      </div>
      {photoBranch && (
        <BranchPhotoManager
          branchId={photoBranch.id}
          branchName={photoBranch.name}
          onClose={() => setPhotoBranch(null)}
        />
      )}
    </section>
  );
}

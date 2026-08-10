import { useEffect, useMemo, useRef, useState } from "react";
import { arrayRemove, arrayUnion, doc, onSnapshot, updateDoc } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../firebase";
import { compressImage } from "../admin/adminUtils";

const MAX_PHOTOS = 10;

function notify(message) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message } }));
}

export default function BranchPhotoManager({ branchId, branchName, onClose }) {
  const [branch, setBranch] = useState(null);
  const [uploads, setUploads] = useState([]);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    if (!branchId) return undefined;

    const unsub = onSnapshot(doc(db, "branches", branchId), (snap) => {
      setBranch(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });

    return () => unsub();
  }, [branchId]);

  const images = branch?.images || [];
  const remainingSlots = Math.max(0, MAX_PHOTOS - images.length);
  const title = branch?.name || branchName || "Branch";

  const uploadFiles = async (fileList) => {
    const files = Array.from(fileList || []).slice(0, remainingSlots);
    if (!files.length) return;

    for (const file of files) {
      const localId = `${file.name}-${Date.now()}-${Math.random()}`;
      const previewUrl = URL.createObjectURL(file);
      setUploads((current) => [...current, { id: localId, previewUrl, progress: 0 }]);

      try {
        const compressed = await compressImage(file, 1200, 0.85);
        const imageRef = ref(storage, `branches/${branchId}/image_${Date.now()}.jpg`);
        const task = uploadBytesResumable(imageRef, compressed);

        await new Promise((resolve, reject) => {
          task.on(
            "state_changed",
            (snap) => {
              const progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setUploads((current) =>
                current.map((item) => (item.id === localId ? { ...item, progress } : item))
              );
            },
            reject,
            resolve
          );
        });

        const url = await getDownloadURL(imageRef);
        await updateDoc(doc(db, "branches", branchId), {
          images: arrayUnion(url),
          thumbnailIndex: images.length === 0 ? 0 : branch?.thumbnailIndex || 0,
        });
        notify("Photo added successfully!");
      } catch {
        notify("Something went wrong");
      } finally {
        URL.revokeObjectURL(previewUrl);
        setUploads((current) => current.filter((item) => item.id !== localId));
      }
    }
  };

  const deletePhoto = async (imageUrl, index) => {
    if (!window.confirm("Delete this photo?")) return;

    try {
      await deleteObject(ref(storage, imageUrl));
    } catch {
      // If the file was already removed from Storage, still clean the Firestore URL.
    }

    const thumbnailIndex = branch?.thumbnailIndex || 0;
    const nextIndex =
      thumbnailIndex === index
        ? 0
        : thumbnailIndex > index
          ? thumbnailIndex - 1
          : thumbnailIndex;

    await updateDoc(doc(db, "branches", branchId), {
      images: arrayRemove(imageUrl),
      thumbnailIndex: nextIndex,
    });
    notify("Photo deleted");
  };

  const setMainPhoto = async (index) => {
    await updateDoc(doc(db, "branches", branchId), { thumbnailIndex: index });
    notify("Main photo updated");
  };

  const visibleUploads = useMemo(() => uploads.slice(0, remainingSlots), [uploads, remainingSlots]);

  if (!branchId) return null;

  return (
    <div className="branch-photo-manager" role="dialog" aria-modal="true">
      <div className="branch-photo-manager__panel">
        <header className="branch-photo-manager__header">
          <div>
            <h2>Branch Photos - {title}</h2>
            <p>{images.length} / {MAX_PHOTOS} photos</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close photo manager">
            X
          </button>
        </header>

        <section>
          <h3>Existing Photos</h3>
          {images.length ? (
            <div className="branch-photo-manager__grid">
              {images.map((imageUrl, index) => {
                const isMain = index === (branch?.thumbnailIndex || 0);

                return (
                  <article className={isMain ? "is-main" : ""} key={imageUrl}>
                    <img src={imageUrl} alt={`${title} ${index + 1}`} />
                    <button
                      className="branch-photo-manager__star"
                      type="button"
                      onClick={() => setMainPhoto(index)}
                      aria-label="Set as main photo"
                    >
                      ★
                    </button>
                    <button
                      className="branch-photo-manager__delete"
                      type="button"
                      onClick={() => deletePhoto(imageUrl, index)}
                      aria-label="Delete photo"
                    >
                      X
                    </button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="branch-photo-manager__placeholder">No branch photos yet</div>
          )}
        </section>

        {remainingSlots > 0 && (
          <section>
            <h3>Add More Photos</h3>
            <div className="branch-photo-manager__actions">
              <button type="button" onClick={() => fileInputRef.current?.click()}>
                UPLOAD FROM DEVICE
              </button>
              <button type="button" onClick={() => cameraInputRef.current?.click()}>
                TAKE PHOTO
              </button>
            </div>
            <input
              accept="image/*"
              hidden
              multiple
              ref={fileInputRef}
              type="file"
              onChange={(event) => uploadFiles(event.target.files)}
            />
            <input
              accept="image/*"
              capture="environment"
              hidden
              multiple
              ref={cameraInputRef}
              type="file"
              onChange={(event) => uploadFiles(event.target.files)}
            />
          </section>
        )}

        {visibleUploads.length > 0 && (
          <section>
            <h3>Uploading</h3>
            <div className="branch-photo-manager__grid">
              {visibleUploads.map((upload) => (
                <article key={upload.id}>
                  <img src={upload.previewUrl} alt="" />
                  <div className="branch-photo-manager__progress">
                    <span style={{ width: `${upload.progress}%` }} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

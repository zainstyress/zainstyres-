import { useState } from "react";

export default function BranchPhotoGallery({ branch }) {
  const images = branch?.images || [];
  const [activeIndex, setActiveIndex] = useState(branch?.thumbnailIndex || 0);
  const activeImage = images[activeIndex] || images[branch?.thumbnailIndex || 0];

  if (!images.length) {
    return <div className="branch-photo-gallery__placeholder">Branch photo coming soon</div>;
  }

  return (
    <div className="branch-photo-gallery">
      <img
        className="branch-photo-gallery__main"
        src={activeImage}
        alt={branch?.name || "Branch"}
      />
      <div className="branch-photo-gallery__thumbs">
        {images.map((image, index) => (
          <button
            className={index === activeIndex ? "active" : ""}
            key={image}
            type="button"
            onClick={() => setActiveIndex(index)}
          >
            <img src={image} alt={`${branch?.name || "Branch"} ${index + 1}`} />
          </button>
        ))}
      </div>
    </div>
  );
}

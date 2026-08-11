// Resolves an image path returned by the backend into a full URL.
// Backend sometimes returns absolute URLs (https://...) and sometimes
// relative paths (/uploads/...). Relative paths need the API base
// prefixed, otherwise the browser requests them from the frontend's
// own domain instead of the backend that actually serves the file.
export function resolveImageUrl(path, apiBase = '') {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  if (!apiBase) return path;
  return `${apiBase}${path.startsWith('/') ? '' : '/'}${path}`;
}

// Normalizes a product/tyre object's image fields (image + images[])
// in place-safe (returns a new object) way so every consumer downstream
// (cards, galleries, cart, checkout) already has resolved URLs.
export function normalizeProductImages(product, apiBase = '') {
  if (!product) return product;
  return {
    ...product,
    image: resolveImageUrl(product.image, apiBase),
    images: Array.isArray(product.images)
      ? product.images.map((img) => resolveImageUrl(img, apiBase))
      : product.images,
  };
}

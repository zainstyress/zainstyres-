export const adminWhatsAppNumber = "91XXXXXXXXXX";

export function formatMoney(value) {
  const amount = Number(value) || 0;
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  return amount.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export function notify(message) {
  window.dispatchEvent(new CustomEvent("app-toast", { detail: { message } }));
}

export function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

export function toDate(value) {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  return new Date(value);
}

export function matchesSearch(item, query, keys) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return keys.some((key) => String(item[key] || "").toLowerCase().includes(needle));
}

export function normalizeOrderStatus(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "pending";
  if (["pending", "placed", "order placed", "processing", "packed"].includes(raw)) return "pending";
  if (["confirmed", "paid", "confirmed payment", "success"].includes(raw)) return "confirmed";
  if (["dispatched", "shipped", "out for delivery", "delivered"].includes(raw)) return "dispatched";
  return raw;
}

export function formatOrderStatus(value) {
  const normalized = normalizeOrderStatus(value);
  if (normalized === "confirmed") return "Confirmed";
  if (normalized === "dispatched") return "Dispatched";
  return "Pending";
}

export async function compressImage(file, maxSize = 800, quality = 0.8) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" })),
      "image/jpeg",
      quality
    );
  });
}

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "";

const STATES = [
  "Maharashtra",
  "Delhi",
  "Karnataka",
  "Tamil Nadu",
  "Gujarat",
  "Uttar Pradesh",
  "West Bengal",
  "Punjab",
];

const STEP_LABELS = ["Cart Review", "Delivery Details", "Order Summary", "Payment"];
const PAYMENT_METHODS = [
  { key: "UPI", label: "UPI" },
  { key: "CARD", label: "Debit / Credit Card" },
  { key: "NETBANKING", label: "Net Banking" },
  { key: "COD", label: "Cash on Delivery" },
];

function formatCurrency(value) {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
}

function estimateDeliveryDate() {
  const next = new Date();
  next.setDate(next.getDate() + 4);
  return next.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function readSavedCart() {
  try {
    const raw = localStorage.getItem("cartItems");
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map((item) => ({
            id: item.id || item.productId || item._id,
            name: item.name || item.title || "Item",
            image: item.image || item.imageUrl || item.images?.[0] || "",
            price: Number(item.price || item.unitPrice || 0),
            qty: Number(item.qty || item.quantity || 1),
          }))
          .filter((item) => item.id && item.price > 0 && item.qty > 0)
      : [];
  } catch {
    return [];
  }
}

function readSavedDeliveryDetails() {
  try {
    const raw = sessionStorage.getItem('deliveryDetails') || null;
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export default function CheckoutNew({ cart: initialCart = [] }) {
  const navigate = useNavigate();
  
  // Read saved delivery details to determine starting step
  const savedDeliveryDetails = readSavedDeliveryDetails();
  const startingStep = savedDeliveryDetails ? 3 : 1; // Start at Order Summary if coming from DeliveryDetailsPage
  
  const [step, setStep] = useState(startingStep);
  const [cart, setCart] = useState(() => {
    const fallback = readSavedCart();
    return initialCart.length ? initialCart.map((item) => ({
      id: item.id || item.productId || item._id,
      name: item.name || item.title || "Item",
      image: item.image || item.imageUrl || item.images?.[0] || "",
      price: Number(item.price || item.unitPrice || 0),
      qty: Number(item.quantity || item.qty || 1),
    })) : fallback;
  });
  const [formData, setFormData] = useState({
    fullName: savedDeliveryDetails?.fullName || "",
    phone: savedDeliveryDetails?.phone || "",
    address1: savedDeliveryDetails?.address1 || "",
    address2: savedDeliveryDetails?.address2 || "",
    city: savedDeliveryDetails?.city || "",
    state: savedDeliveryDetails?.state || STATES[0],
    pin: savedDeliveryDetails?.pin || "",
  });
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [cardInfo, setCardInfo] = useState({ number: "", name: "", expiry: "", cvv: "" });
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("SBI");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!initialCart.length) return;
    setCart(initialCart.map((item) => ({
      id: item.id || item.productId || item._id,
      name: item.name || item.title || "Item",
      image: item.image || item.imageUrl || item.images?.[0] || "",
      price: Number(item.price || item.unitPrice || 0),
      qty: Number(item.quantity || item.qty || 1),
    })));
  }, [initialCart]);

  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.qty, 0), [cart]);
  const tax = useMemo(() => Math.round(subtotal * 0.18), [subtotal]);
  const total = subtotal + tax;
  const estimatedDelivery = estimateDeliveryDate();

  const validateDelivery = () => {
    if (!formData.fullName.trim()) return "Full name is required.";
    if (!/^[0-9]{10}$/.test(formData.phone.trim())) return "Enter a valid 10-digit mobile number.";
    if (!formData.address1.trim()) return "Address line 1 is required.";
    if (!formData.city.trim()) return "City is required.";
    if (!formData.pin.trim() || !/^[0-9]{6}$/.test(formData.pin.trim())) return "Enter a valid 6-digit pincode.";
    return "";
  };

  const validatePayment = () => {
    if (paymentMethod === "CARD") {
      if (!cardInfo.number.replace(/\s+/g, "").match(/^\d{16}$/)) return "Enter a valid 16-digit card number.";
      if (!cardInfo.name.trim()) return "Cardholder name is required.";
      if (!cardInfo.expiry.trim().match(/^(0[1-9]|1[0-2])\/(\d{2})$/)) return "Enter expiry in MM/YY format.";
      if (!cardInfo.cvv.trim().match(/^\d{3,4}$/)) return "Enter a valid CVV.";
    }
    if (paymentMethod === "UPI" && !upiId.trim()) return "Enter a valid UPI ID.";
    if (paymentMethod === "NETBANKING" && !bankName.trim()) return "Select a bank.";
    return "";
  };

  const updateCartQty = (itemId, nextQty) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === itemId ? { ...item, qty: Math.max(1, Number(nextQty)) } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const removeCartItem = (itemId) => setCart((prev) => prev.filter((item) => item.id !== itemId));

  const handleProceedTo = (targetStep) => {
    setErrorMessage("");
    if (targetStep === 2) {
      if (!cart.length) {
        setErrorMessage("Your cart is empty. Add items before checkout.");
        return;
      }
      setStep(2);
      return;
    }
    if (targetStep === 3) {
      const deliveryError = validateDelivery();
      if (deliveryError) {
        setErrorMessage(deliveryError);
        return;
      }
      setStep(3);
      return;
    }
    if (targetStep === 4) setStep(4);
  };

  const handlePlaceOrder = async () => {
    const paymentError = validatePayment();
    if (paymentError) {
      setErrorMessage(paymentError);
      return;
    }

    const confirmationPayload = {
      customerName: formData.fullName.trim(),
      mobileNumber: formData.phone.trim(),
      deliveryAddress: {
        line1: formData.address1.trim(),
        line2: formData.address2.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pin.trim(),
      },
      items: cart.map((item) => ({
        productName: item.name,
        price: Number(item.price || 0),
        quantity: Number(item.qty || 1),
      })),
      subtotal,
      tax,
      totalAmount: total,
      paymentMethod: paymentMethod === 'COD' ? 'Cash on Delivery' : paymentMethod === 'UPI' ? 'UPI' : 'Card',
    };

    try {
      const response = await fetch(`${API}/api/orders/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(confirmationPayload),
      });
      const data = await response.json();

      if (!response.ok || !data.success || !data.orderId) {
        throw new Error(data.error || 'Unable to save order');
      }

      if (typeof clearCart === 'function') clearCart();
      sessionStorage.removeItem('deliveryDetails');
      navigate(`/order-confirmation/${data.orderId}`);
    } catch (error) {
      setErrorMessage(error.message || 'Unable to save your order. Please try again.');
    }
  };

  return (
    <main className="min-h-screen bg-[#080808] text-white px-4 py-24 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-[2rem] border border-white/10 bg-zinc-950/70 p-6 shadow-2xl shadow-black/50 backdrop-blur-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-rose-500">Secure checkout</p>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Complete your order in 4 easy steps</h1>
              <p className="max-w-3xl text-zinc-400">Review your cart, confirm delivery details, review your order, and pay securely when ready.</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-[#0f0f0f]/80 p-4 text-right">
              <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Step {step} of 4</p>
              <p className="mt-2 text-lg font-semibold text-white">{STEP_LABELS[step - 1]}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-4">
            {STEP_LABELS.map((label, index) => {
              const stepNumber = index + 1;
              const isActive = stepNumber === step;
              const isCompleted = stepNumber < step;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => { if (isCompleted) setStep(stepNumber); }}
                  className={`rounded-3xl border p-4 text-left transition ${
                    isActive ? "border-rose-500 bg-rose-500/10 text-white" : "border-white/10 bg-white/5 text-zinc-300 hover:border-white/20"
                  } ${!isCompleted && !isActive ? "cursor-default opacity-80" : "cursor-pointer"}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${isActive ? "border-rose-500 bg-rose-500 text-black" : "border-zinc-700 bg-zinc-900 text-zinc-400"}`}>
                      {isCompleted ? "✓" : stepNumber}
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Step {stepNumber}</p>
                      <p className="text-sm font-semibold">{label}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid gap-8 xl:grid-cols-[1.45fr_0.95fr]">
          <section className="space-y-8">
            {step === 1 && (
              <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Cart review</p>
                    <h2 className="text-3xl font-black">Your bag</h2>
                  </div>
                  <p className="text-sm text-zinc-400">Update quantities, remove items, then proceed.</p>
                </div>
                {cart.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-white/10 bg-white/5 p-8 text-center text-zinc-300">
                    <p className="mb-4 text-xl font-semibold">Your cart is empty.</p>
                    <Link to="/shop" className="inline-flex rounded-full bg-rose-500 px-6 py-3 text-sm font-semibold text-black transition hover:bg-rose-400">Continue shopping</Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid gap-4">
                      {cart.map((item) => (
                        <div key={item.id} className="grid gap-4 rounded-3xl border border-white/10 bg-[#111111] p-5 sm:grid-cols-[4fr_1.4fr_1fr]">
                          <div className="flex items-center gap-4">
                            <div className="h-24 w-24 overflow-hidden rounded-3xl bg-zinc-900">
                              {item.image ? <img src={item.image} alt={item.name} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-zinc-500">No image</div>}
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-white">{item.name}</h3>
                              <p className="mt-2 text-sm text-zinc-400">{formatCurrency(item.price)}</p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 rounded-3xl bg-zinc-900 p-3">
                              <button type="button" onClick={() => updateCartQty(item.id, item.qty - 1)} className="h-10 w-10 rounded-full border border-white/10 text-xl text-white transition hover:bg-white/5">−</button>
                              <span className="min-w-[2rem] text-center text-lg font-semibold">{item.qty}</span>
                              <button type="button" onClick={() => updateCartQty(item.id, item.qty + 1)} className="h-10 w-10 rounded-full border border-white/10 text-xl text-white transition hover:bg-white/5">+</button>
                            </div>
                            <button type="button" onClick={() => removeCartItem(item.id)} className="text-sm font-semibold uppercase tracking-[0.3em] text-rose-500 hover:text-rose-300">Remove</button>
                          </div>
                          <div className="flex flex-col items-start justify-between text-right sm:items-end">
                            <span className="text-sm text-zinc-400">Line total</span>
                            <p className="text-xl font-bold text-white">{formatCurrency(item.price * item.qty)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-3xl bg-zinc-900 p-4 text-sm text-zinc-400">
                          <p className="uppercase tracking-[0.35em] text-zinc-500">Items</p>
                          <p className="mt-2 text-lg font-semibold text-white">{cart.reduce((sum, item) => sum + item.qty, 0)}</p>
                        </div>
                        <div className="rounded-3xl bg-zinc-900 p-4 text-sm text-zinc-400">
                          <p className="uppercase tracking-[0.35em] text-zinc-500">Subtotal</p>
                          <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(subtotal)}</p>
                        </div>
                        <div className="rounded-3xl bg-zinc-900 p-4 text-sm text-zinc-400">
                          <p className="uppercase tracking-[0.35em] text-zinc-500">Tax (18%)</p>
                          <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(tax)}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">Grand total</p>
                        <p className="mt-2 text-3xl font-black text-white">{formatCurrency(total)}</p>
                      </div>
                      <button type="button" onClick={() => handleProceedTo(2)} className="inline-flex items-center justify-center rounded-full bg-rose-500 px-8 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-rose-400">Proceed to Delivery Details</button>
                    </div>
                  </div>
                )}
              </section>
            )}

            {step === 2 && (
              <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Delivery information</p>
                    <h2 className="text-3xl font-black">Where should we deliver?</h2>
                  </div>
                  <p className="text-sm text-zinc-400">Required fields must be completed before continuing.</p>
                </div>
                <div className="mt-8 grid gap-5 sm:grid-cols-2">
                  <label className="space-y-2 text-sm">
                    <span className="block uppercase tracking-[0.35em] text-zinc-500">Full name</span>
                    <input value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="Full name" required />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="block uppercase tracking-[0.35em] text-zinc-500">Mobile number</span>
                    <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="9876543210" inputMode="numeric" required />
                  </label>
                  <label className="sm:col-span-2 space-y-2 text-sm">
                    <span className="block uppercase tracking-[0.35em] text-zinc-500">Address line 1</span>
                    <input value={formData.address1} onChange={(e) => setFormData({ ...formData, address1: e.target.value })} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="House, street, landmark" required />
                  </label>
                  <label className="sm:col-span-2 space-y-2 text-sm">
                    <span className="block uppercase tracking-[0.35em] text-zinc-500">Address line 2</span>
                    <input value={formData.address2} onChange={(e) => setFormData({ ...formData, address2: e.target.value })} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="Apartment, building, sector (optional)" />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="block uppercase tracking-[0.35em] text-zinc-500">City</span>
                    <input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="City" required />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="block uppercase tracking-[0.35em] text-zinc-500">State</span>
                    <select value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500">
                      {STATES.map((state) => (<option key={state} value={state}>{state}</option>))}
                    </select>
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="block uppercase tracking-[0.35em] text-zinc-500">Pincode</span>
                    <input value={formData.pin} onChange={(e) => setFormData({ ...formData, pin: e.target.value })} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="400001" inputMode="numeric" required />
                  </label>
                </div>
                {errorMessage && <div className="mt-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{errorMessage}</div>}
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => setStep(1)} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:border-white/30">Back to cart</button>
                  <button type="button" onClick={() => handleProceedTo(3)} className="rounded-full bg-rose-500 px-8 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-rose-400">Continue to Order Summary</button>
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Order summary</p>
                    <h2 className="text-3xl font-black">Confirm before payment</h2>
                  </div>
                  <p className="text-sm text-zinc-400">Review delivery address and items before you pay.</p>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-3xl border border-white/10 bg-[#101010] p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">Delivery address</p>
                        <p className="mt-3 text-lg font-semibold text-white">{formData.fullName}</p>
                        <p className="mt-2 text-sm text-zinc-400">{formData.address1}{formData.address2 ? `, ${formData.address2}` : ""}</p>
                        <p className="mt-1 text-sm text-zinc-400">{formData.city}, {formData.state} - {formData.pin}</p>
                        <p className="mt-1 text-sm text-zinc-400">{formData.phone}</p>
                      </div>
                      <button type="button" onClick={() => setStep(2)} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:border-rose-500/30">Edit address</button>
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-[#101010] p-6">
                    <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">Delivery window</p>
                    <p className="mt-3 text-3xl font-black text-white">{estimatedDelivery}</p>
                    <p className="mt-3 text-sm leading-6 text-zinc-400">We’ll process your order immediately and deliver it within the estimated time frame.</p>
                  </div>
                </div>
                <div className="mt-8 space-y-4 rounded-3xl border border-white/10 bg-black/40 p-6">
                  <div className="grid gap-4">
                    {cart.map((item) => (
                      <div key={item.id} className="grid gap-3 sm:grid-cols-[4fr_1fr] items-center">
                        <div>
                          <p className="text-base font-semibold text-white">{item.name}</p>
                          <p className="text-sm text-zinc-400">Qty {item.qty}</p>
                        </div>
                        <p className="text-right text-base font-semibold text-white">{formatCurrency(item.price * item.qty)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-6 grid gap-3 rounded-3xl border border-white/10 bg-zinc-900 p-5 text-sm text-zinc-400">
                  <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                  <div className="flex justify-between"><span>Taxes</span><span>{formatCurrency(tax)}</span></div>
                  <div className="flex justify-between text-white"><span className="font-semibold">Grand Total</span><span className="font-semibold">{formatCurrency(total)}</span></div>
                </div>
                {errorMessage && <div className="rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{errorMessage}</div>}
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => setStep(2)} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:border-white/30">Back to address</button>
                  <button type="button" onClick={() => handleProceedTo(4)} className="rounded-full bg-rose-500 px-8 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-rose-400">Confirm & Proceed to Payment</button>
                </div>
              </section>
            )}

            {step === 4 && (
              <section className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Payment</p>
                    <h2 className="text-3xl font-black">Choose a payment option</h2>
                  </div>
                  <p className="text-sm text-zinc-400">Your payment choice appears only after the address is confirmed.</p>
                </div>
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {PAYMENT_METHODS.map((option) => (
                    <button key={option.key} type="button" onClick={() => setPaymentMethod(option.key)} className={`rounded-3xl border p-4 text-left transition ${paymentMethod === option.key ? "border-rose-500 bg-rose-500/10 text-white" : "border-white/10 bg-zinc-900 text-zinc-300 hover:border-white/20"}`}>
                      <p className="text-sm uppercase tracking-[0.35em] text-zinc-500">{option.label}</p>
                      {paymentMethod === option.key && <p className="mt-3 text-base font-semibold text-white">Selected</p>}
                    </button>
                  ))}
                </div>
                <div className="mt-6 rounded-3xl border border-white/10 bg-black/40 p-6">
                  {paymentMethod === "CARD" && (
                    <div className="grid gap-4">
                      <label className="space-y-2 text-sm">
                        <span className="block uppercase tracking-[0.35em] text-zinc-500">Card number</span>
                        <input value={cardInfo.number} onChange={(e) => { const digits = e.target.value.replace(/\D/g, "").slice(0, 16); const formatted = digits.replace(/(\d{4})(?=\d)/g, "$1 "); setCardInfo({ ...cardInfo, number: formatted }); }} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="4242 4242 4242 4242" />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="block uppercase tracking-[0.35em] text-zinc-500">Cardholder name</span>
                        <input value={cardInfo.name} onChange={(e) => setCardInfo({ ...cardInfo, name: e.target.value })} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="Name on card" />
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-2 text-sm">
                          <span className="block uppercase tracking-[0.35em] text-zinc-500">Expiry</span>
                          <input value={cardInfo.expiry} onChange={(e) => setCardInfo({ ...cardInfo, expiry: e.target.value })} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="MM/YY" />
                        </label>
                        <label className="space-y-2 text-sm">
                          <span className="block uppercase tracking-[0.35em] text-zinc-500">CVV</span>
                          <input type="password" value={cardInfo.cvv} onChange={(e) => setCardInfo({ ...cardInfo, cvv: e.target.value })} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="123" />
                        </label>
                      </div>
                    </div>
                  )}
                  {paymentMethod === "UPI" && (
                    <div className="space-y-4">
                      <label className="space-y-2 text-sm">
                        <span className="block uppercase tracking-[0.35em] text-zinc-500">UPI ID</span>
                        <input value={upiId} onChange={(e) => setUpiId(e.target.value)} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500" placeholder="username@bank" />
                      </label>
                      <p className="text-sm text-zinc-400">Pay securely using Google Pay, PhonePe, Paytm, or any UPI app.</p>
                    </div>
                  )}
                  {paymentMethod === "NETBANKING" && (
                    <div className="space-y-4">
                      <label className="space-y-2 text-sm">
                        <span className="block uppercase tracking-[0.35em] text-zinc-500">Bank</span>
                        <select value={bankName} onChange={(e) => setBankName(e.target.value)} className="w-full rounded-3xl border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-rose-500">
                          {['SBI', 'HDFC', 'ICICI', 'Axis', 'Kotak', 'PNB'].map((bank) => (<option key={bank} value={bank}>{bank}</option>))}
                        </select>
                      </label>
                      <p className="text-sm text-zinc-400">You will be redirected to your bank’s secure payment page.</p>
                    </div>
                  )}
                  {paymentMethod === "COD" && (
                    <div className="rounded-3xl border border-rose-500/20 bg-rose-500/10 p-5 text-sm text-rose-100">
                      <p className="font-semibold">Cash on Delivery selected</p>
                      <p className="mt-2 text-zinc-300">Pay with cash at the time of delivery. A small handling fee may apply.</p>
                    </div>
                  )}
                </div>
                {errorMessage && <div className="mt-6 rounded-3xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">{errorMessage}</div>}
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <button type="button" onClick={() => setStep(3)} className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-white transition hover:border-white/30">Back to summary</button>
                  <button type="button" onClick={handlePlaceOrder} className="inline-flex items-center justify-center rounded-full bg-rose-500 px-8 py-3 text-sm font-semibold uppercase tracking-[0.25em] text-black transition hover:bg-rose-400">Confirm Order</button>
                </div>
              </section>
            )}
          </section>
          <aside className="space-y-6">
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Order summary</p>
              <div className="mt-5 space-y-4">
                <div className="flex justify-between text-sm text-zinc-400"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
                <div className="flex justify-between text-sm text-zinc-400"><span>Tax</span><span>{formatCurrency(tax)}</span></div>
                <div className="flex justify-between text-base font-semibold text-white border-t border-white/10 pt-4"><span>Total</span><span>{formatCurrency(total)}</span></div>
              </div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Estimated delivery</p>
              <p className="mt-4 text-2xl font-black text-white">{estimatedDelivery}</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">Orders are typically processed within 24 hours and delivered in 3-5 working days.</p>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-zinc-950/80 p-6">
              <p className="text-sm uppercase tracking-[0.35em] text-rose-500">Need help?</p>
              <p className="mt-3 text-sm leading-6 text-zinc-400">Contact customer support if you need to update delivery instructions or choose a different payment option.</p>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

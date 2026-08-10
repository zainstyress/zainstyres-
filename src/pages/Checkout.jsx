import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Google Fonts: Rajdhani & DM Sans
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;700&family=DM+Sans:wght@400;500;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);

const STYLES = `
  body { font-family: 'DM Sans', sans-serif; background-color: #0f0f0f; color: #fff; }
  .font-rajdhani { font-family: 'Rajdhani', sans-serif; }
  .card-dark { background-color: #1a1a1a; border: 1px solid #2a2a2a; }
  .text-accent { color: #e74c3c; }
  .bg-accent { background-color: #e74c3c; }
  .border-accent { border-color: #e74c3c; }
  .input-field { background-color: #242424; border: 1px solid #333; border-radius: 8px; padding: 12px 16px; width: 100%; color: #fff; font-size: 14px; outline: none; transition: border 0.3s; }
  .input-field:focus { border-color: #e74c3c; }
  .btn-accent { background-color: #e74c3c; color: #fff; font-weight: 700; border-radius: 8px; padding: 16px; width: 100%; transition: opacity 0.3s; }
  .btn-accent:hover { opacity: 0.9; }
  .step-node { width: 32px; height: 32px; border-radius: 50%; display: flex; items-center; justify-content: center; font-weight: bold; font-size: 14px; }
  .step-active { background-color: #e74c3c; color: #fff; }
  .step-inactive { background-color: #333; color: #777; }
  .tab-btn { flex: 1; padding: 12px; font-size: 12px; font-weight: 700; border-radius: 8px; border: 1px solid #333; text-align: center; cursor: pointer; transition: all 0.3s; }
  .tab-active { background-color: #e74c3c15; border-color: #e74c3c; color: #e74c3c; }
  .custom-scrollbar::-webkit-scrollbar { width: 6px; }
  .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = STYLES;
document.head.appendChild(styleSheet);

export default function Checkout() {
  const navigate = useNavigate();
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '', phone: '', altPhone: '', address: '', city: '', state: 'Maharashtra', pin: '', saveAddress: false
  });
  
  const [deliveryType, setDeliveryType] = useState('standard');
  const [paymentMode, setPaymentMode] = useState('card');
  const [cardData, setCardData] = useState({ number: '', name: '', expiry: '', cvv: '' });
  const [upiId, setUpiId] = useState('');
  const [addons, setAddons] = useState({ installation: false, balancing: false, disposal: false });
  const [giftToggle, setGiftToggle] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');

  // Coupon State
  const [coupon, setCoupon] = useState('');
  const [couponStatus, setCouponStatus] = useState({ msg: '', type: '' });
  const [discount, setDiscount] = useState(0);

  // Delivery Config
  const deliveryOptions = {
    standard: { price: 0, eta: '3–5 working days', fill: '30%' },
    express: { price: 299, eta: '1–2 working days', fill: '70%' },
    sameday: { price: 599, eta: 'Expected by 8:00 PM today', fill: '95%' }
  };

  const states = ["Maharashtra", "Delhi", "Karnataka", "Tamil Nadu", "Gujarat", "Uttar Pradesh", "West Bengal", "Punjab"];

  // Calculation
  const subtotal = 17750;
  const deliveryPrice = deliveryOptions[deliveryType].price;
  const addonPrice = (addons.installation ? 499 : 0) + (addons.balancing ? 349 : 0) + (addons.disposal ? 198 : 0);
  const currentSubtotal = subtotal + addonPrice;
  const gst = (currentSubtotal + deliveryPrice) * 0.18;
  const total = currentSubtotal + deliveryPrice + gst - discount;

  const handleCardFormat = (e) => {
    let value = e.target.value.replace(/\D/g, '').substring(0, 16);
    value = value.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardData({ ...cardData, number: value });
  };

  const applyCoupon = () => {
    if (coupon.toUpperCase() === 'ZAIN10') {
      const d = currentSubtotal * 0.10;
      setDiscount(d);
      setCouponStatus({ msg: 'Coupon ZAIN10 applied! (10% OFF)', type: 'success' });
    } else if (coupon.toUpperCase() === 'FIRST50') {
      setDiscount(500);
      setCouponStatus({ msg: 'Coupon FIRST50 applied! (₹500 OFF)', type: 'success' });
    } else {
      setDiscount(0);
      setCouponStatus({ msg: 'Invalid coupon code', type: 'error' });
    }
  };

  const handlePlaceOrder = (e) => {
    e.preventDefault();
    if (!formData.fullName || !formData.phone || !formData.address || !formData.city || !formData.pin) {
      alert('Please fill all required deployment fields!');
      return;
    }
    const id = 'ZT' + Math.random().toString().slice(2, 10);
    setOrderId(id);
    setOrderPlaced(true);
    window.scrollTo(0, 0);
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-6">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card-dark p-12 rounded-3xl text-center max-w-lg w-full">
          <div className="w-20 h-20 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
             <span className="text-accent text-4xl">✓</span>
          </div>
          <h2 className="text-4xl font-rajdhani font-bold mb-4 uppercase italic">Order Confirmed!</h2>
          <p className="text-zinc-400 mb-8 leading-relaxed">Thank you, <span className="text-white font-bold">{formData.fullName}</span>. Your high-performance units have been successfully logged. Your Order ID is <span className="text-accent font-bold">#{orderId}</span>.</p>
          <button onClick={() => navigate('/')} className="btn-accent uppercase italic font-rajdhani text-xl tracking-tighter">CONTINUE SHOPPING</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f0f0f] pt-12 pb-24 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        
        {/* Header & Progress */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-8">
           <h1 className="text-3xl font-rajdhani font-bold tracking-widest italic">ZAIN'S <span className="text-accent">TYRES</span></h1>
           <div className="flex items-center gap-10">
              <div className="flex items-center gap-3">
                 <div className="step-node step-inactive">✓</div>
                 <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Cart</span>
              </div>
              <div className="h-[1px] w-12 bg-zinc-800" />
              <div className="flex items-center gap-3">
                 <div className="step-node step-active">2</div>
                 <span className="text-xs font-bold text-accent uppercase tracking-widest">Checkout</span>
              </div>
              <div className="h-[1px] w-12 bg-zinc-800" />
              <div className="flex items-center gap-3">
                 <div className="step-node step-inactive">3</div>
                 <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Confirm</span>
              </div>
           </div>
        </div>

        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Left Column: Forms */}
          <div className="lg:col-span-7 space-y-8">
            
            {/* Section 1: Address */}
            <div className="card-dark p-8 rounded-2xl">
              <div className="flex items-center gap-4 mb-8">
                <span className="text-2xl">📍</span>
                <h3 className="text-xl font-rajdhani font-bold uppercase tracking-tighter italic">Delivery Address</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Full Name</p>
                  <input required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="input-field" placeholder="Mohammed Zain" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Phone Number</p>
                  <input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="input-field" placeholder="+91 98765 43210" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Alternate Phone (Optional)</p>
                  <input value={formData.altPhone} onChange={e => setFormData({...formData, altPhone: e.target.value})} className="input-field" placeholder="Optional" />
                </div>
                <div className="md:col-span-2">
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Street Address</p>
                  <input required value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="input-field" placeholder="Shop No., Street, Area" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">City</p>
                  <input required value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} className="input-field" placeholder="Mumbai" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">State</p>
                    <select value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})} className="input-field appearance-none">
                      {states.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Pin Code</p>
                    <input required value={formData.pin} onChange={e => setFormData({...formData, pin: e.target.value})} className="input-field" placeholder="400001" />
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-8 border-t border-zinc-800">
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Delivery Type</p>
                <select value={deliveryType} onChange={e => setDeliveryType(e.target.value)} className="input-field appearance-none mb-6">
                  <option value="standard">Standard (3–5 days) — Free</option>
                  <option value="express">Express (1–2 days) — ₹299</option>
                  <option value="sameday">Same Day (by 8PM) — ₹599</option>
                </select>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input type="checkbox" checked={formData.saveAddress} onChange={e => setFormData({...formData, saveAddress: e.target.checked})} className="w-5 h-5 accent-accent" />
                  <span className="text-xs text-zinc-400 group-hover:text-white transition-colors">Save this address for future orders</span>
                </label>
              </div>
            </div>

            {/* Section 2: Payment */}
            <div className="card-dark p-8 rounded-2xl">
              <div className="flex items-center gap-4 mb-8">
                <span className="text-2xl">💳</span>
                <h3 className="text-xl font-rajdhani font-bold uppercase tracking-tighter italic">Payment Method</h3>
              </div>
              
              <div className="flex flex-wrap gap-2 mb-8">
                {['card', 'upi', 'netbanking', 'emi', 'cod'].map(m => (
                  <button key={m} type="button" onClick={() => setPaymentMode(m)} className={`tab-btn uppercase italic tracking-tighter ${paymentMode === m ? 'tab-active' : ''}`}>
                    {m === 'netbanking' ? 'Net Banking' : m === 'cod' ? 'Cash on Delivery' : m}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {paymentMode === 'card' && (
                  <motion.div key="card" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Card Number</p>
                      <input value={cardData.number} onChange={handleCardFormat} className="input-field tracking-widest font-bold" placeholder="4242 4242 4242 4242" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="md:col-span-2 lg:col-span-1">
                        <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Cardholder Name</p>
                        <input value={cardData.name} onChange={e => setCardData({...cardData, name: e.target.value})} className="input-field" placeholder="As on card" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Expiry</p>
                          <input value={cardData.expiry} onChange={e => setCardData({...cardData, expiry: e.target.value})} className="input-field text-center" placeholder="MM/YY" />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">CVV</p>
                          <input value={cardData.cvv} onChange={e => setCardData({...cardData, cvv: e.target.value})} type="password" className="input-field text-center" placeholder="•••" />
                        </div>
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer mt-4">
                      <input type="checkbox" className="w-5 h-5 accent-accent" />
                      <span className="text-xs text-zinc-400">Save card securely for faster checkout</span>
                    </label>
                  </motion.div>
                )}

                {paymentMode === 'upi' && (
                  <motion.div key="upi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">UPI ID</p>
                    <input value={upiId} onChange={e => setUpiId(e.target.value)} className="input-field" placeholder="username@upi" />
                    <p className="text-[10px] text-zinc-600 mt-3 italic tracking-widest font-bold uppercase">Pay via GPay, PhonePe, Paytm, BHIM</p>
                  </motion.div>
                )}

                {paymentMode === 'netbanking' && (
                  <motion.div key="nb" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Select Your Bank</p>
                    <select className="input-field appearance-none">
                      <option>SBI</option><option>HDFC</option><option>ICICI</option><option>Axis</option><option>Kotak</option><option>PNB</option>
                    </select>
                  </motion.div>
                )}

                {paymentMode === 'emi' && (
                  <motion.div key="emi" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                    <select className="input-field appearance-none"><option>Select Bank</option><option>HDFC Bank</option><option>ICICI Bank</option></select>
                    <select className="input-field appearance-none"><option>Select Tenure</option><option>3 Months (₹{(total/3).toFixed(0)}/mo)</option><option>6 Months (₹{(total/6).toFixed(0)}/mo)</option></select>
                  </motion.div>
                )}

                {paymentMode === 'cod' && (
                  <motion.div key="cod" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-6 bg-accent/10 border border-accent/20 rounded-2xl">
                     <div className="flex items-center gap-3 text-accent mb-2">
                        <span className="font-bold">✓ Cash on Delivery Ready</span>
                     </div>
                     <p className="text-xs text-zinc-400 leading-relaxed">Pay with cash when your unit is deployed. Note: A ₹49 secure handling fee applies to all COD requests.</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Section 3: Add-ons */}
            <div className="card-dark p-8 rounded-2xl">
              <div className="flex items-center gap-4 mb-8">
                <span className="text-2xl">🎁</span>
                <h3 className="text-xl font-rajdhani font-bold uppercase tracking-tighter italic">Add-ons & Special Requests</h3>
              </div>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-4">
                      <div className={`w-10 h-6 rounded-full relative cursor-pointer transition-colors ${giftToggle ? 'bg-accent' : 'bg-zinc-700'}`} onClick={() => setGiftToggle(!giftToggle)}>
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${giftToggle ? 'left-5' : 'left-1'}`} />
                      </div>
                      <span className="text-xs font-bold text-zinc-300 uppercase tracking-widest">Send as a gift (include gift message)</span>
                   </div>
                </div>
                {giftToggle && (
                  <motion.textarea initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 80 }} className="input-field text-sm" placeholder="Write your message here..." value={giftMessage} onChange={e => setGiftMessage(e.target.value)} />
                )}

                <div className="space-y-4 pt-4 border-t border-zinc-800">
                   {[
                     { id: 'installation', label: 'Professional tyre installation', price: 499 },
                     { id: 'balancing', label: 'Wheel balancing & alignment', price: 349 },
                     { id: 'disposal', label: 'Old tyre disposal service', price: 99, perUnit: true }
                   ].map(add => (
                     <label key={add.id} className="flex items-center gap-4 cursor-pointer group">
                        <input type="checkbox" checked={addons[add.id]} onChange={e => setAddons({...addons, [add.id]: e.target.checked})} className="w-5 h-5 accent-accent" />
                        <span className="text-xs text-zinc-400 group-hover:text-white transition-colors uppercase tracking-widest font-bold">
                          {add.label} — <span className="text-white">₹{add.price}</span> {add.perUnit ? 'per tyre' : '(at your location)'}
                        </span>
                     </label>
                   ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Order Summary (Sticky) */}
          <div className="lg:col-span-5">
             <div className="sticky top-24 space-y-6">
                <div className="card-dark p-8 rounded-3xl shadow-2xl">
                   <div className="flex items-center gap-4 mb-8">
                      <span className="text-2xl">🛒</span>
                      <h3 className="text-xl font-rajdhani font-bold uppercase tracking-tighter italic">Order Summary</h3>
                   </div>

                   {/* Items */}
                   <div className="space-y-4 mb-8">
                      {[
                        { name: 'MRF Nylogrip Zapper', specs: '185/65 R15', qty: 2, price: 7490, icon: '🎡' },
                        { name: 'Apollo Alnac 4G', specs: '195/55 R16', qty: 2, price: 10260, icon: '🎡' }
                      ].map((item, i) => (
                        <div key={i} className="flex gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
                           <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center text-2xl">{item.icon}</div>
                           <div className="flex-1">
                              <h4 className="text-sm font-bold text-white uppercase italic tracking-tighter leading-none mb-1">{item.name}</h4>
                              <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{item.specs} · Qty: {item.qty}</p>
                           </div>
                           <p className="text-sm font-bold text-white">₹{item.price.toLocaleString()}</p>
                        </div>
                      ))}
                   </div>

                   {/* Coupon */}
                   <div className="flex gap-2 mb-2">
                      <input value={coupon} onChange={e => setCoupon(e.target.value)} className="input-field text-[10px] tracking-widest font-bold uppercase" placeholder="COUPON CODE" />
                      <button type="button" onClick={applyCoupon} className="px-6 bg-[#333] hover:bg-[#444] rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">Apply</button>
                   </div>
                   {couponStatus.msg && (
                     <p className={`text-[9px] font-bold uppercase tracking-[0.2em] mb-8 ${couponStatus.type === 'success' ? 'text-green-500' : 'text-accent'}`}>{couponStatus.msg}</p>
                   )}

                   {/* Pricing Breakdown */}
                   <div className="space-y-4 py-6 border-y border-zinc-800 text-xs font-bold uppercase tracking-widest mb-8">
                      <div className="flex justify-between text-zinc-500"><span>Subtotal</span><span className="text-white">₹{currentSubtotal.toLocaleString()}</span></div>
                      <div className="flex justify-between text-zinc-500"><span>Delivery</span><span className={deliveryPrice === 0 ? 'text-green-500' : 'text-white'}>{deliveryPrice === 0 ? 'FREE' : '₹'+deliveryPrice}</span></div>
                      <div className="flex justify-between text-zinc-500"><span>GST (18%)</span><span className="text-white">₹{gst.toFixed(0).toLocaleString()}</span></div>
                      {discount > 0 && (
                        <div className="flex justify-between text-accent"><span>Discount</span><span>-₹{discount.toFixed(0).toLocaleString()}</span></div>
                      )}
                   </div>

                   <div className="flex justify-between items-end mb-8">
                      <span className="text-2xl font-rajdhani font-bold italic uppercase tracking-tighter">Total</span>
                      <span className="text-4xl font-rajdhani font-bold italic uppercase tracking-tighter text-white">₹{total.toFixed(0).toLocaleString()}</span>
                   </div>

                   <button type="submit" className="btn-accent text-xl uppercase italic font-rajdhani tracking-tighter shadow-2xl shadow-accent/20">PLACE ORDER →</button>
                   
                   <p className="text-center text-[9px] text-zinc-600 mt-6 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                      🔒 256-bit SSL · Secured by Razorpay
                   </p>

                   {/* Badges */}
                   <div className="grid grid-cols-2 gap-4 mt-8 pt-8 border-t border-zinc-800">
                      {[
                        { label: 'Genuine Tyres', icon: '✅' },
                        { label: 'Easy Returns', icon: '🔄' },
                        { label: '24/7 Support', icon: '📞' },
                        { label: 'Best Price', icon: '🏷️' }
                      ].map(b => (
                        <div key={b.label} className="flex items-center gap-2 text-[8px] font-bold text-zinc-500 uppercase tracking-widest">
                           <span>{b.icon}</span> {b.label}
                        </div>
                      ))}
                   </div>

                   {/* ETA Box */}
                   <div className="mt-8 p-5 bg-black/40 rounded-2xl border border-white/5 overflow-hidden">
                      <div className="flex items-center gap-3 mb-4">
                         <span className="text-lg">🚚</span>
                         <div>
                            <p className="text-[10px] font-bold text-white uppercase tracking-widest italic leading-none mb-1">Estimated Delivery</p>
                            <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">{deliveryOptions[deliveryType].eta}</p>
                         </div>
                      </div>
                      <div className="h-1 bg-zinc-800 rounded-full relative overflow-hidden">
                         <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: deliveryOptions[deliveryType].fill }}
                           className="absolute inset-0 bg-accent"
                         />
                      </div>
                   </div>
                </div>
             </div>
          </div>

        </form>
      </div>
    </div>
  );
}

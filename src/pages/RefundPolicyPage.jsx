import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function RefundPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-zinc-100">
      <div className="max-w-3xl mx-auto px-6 py-16 md:py-24">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-10 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} /> Back
        </button>

        <h1 className="text-3xl md:text-5xl font-black italic uppercase tracking-tighter text-white mb-3">
          Refund & <span className="text-rose-600">Return Policy</span>
        </h1>
        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-14">Last updated: August 2026</p>

        <div className="space-y-10 text-sm leading-relaxed text-zinc-400">
          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">1. Order Cancellation</h2>
            <p>
              Orders can be cancelled free of charge before they are dispatched. Once an order has been dispatched,
              it cannot be cancelled and standard return terms will apply instead.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">2. Returns — New Products</h2>
            <p>
              Brand new, unused products may be returned within 7 days of delivery if they are damaged, defective,
              or not as described. The product must be unused, in its original packaging, and accompanied by proof
              of purchase.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">3. Returns — Used Products</h2>
            <p>
              Used tyres and accessories are sold as-is based on the condition described on the product listing.
              Returns for used products are only accepted if the item received is materially different from its
              description or arrives damaged in transit. Please inspect your order upon delivery and report any
              issues within 48 hours.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">4. Non-Returnable Items</h2>
            <p>
              Products that have been installed, mounted, or show signs of use beyond inspection cannot be returned,
              as tyre condition and safety cannot be guaranteed once fitted to a vehicle.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">5. Refund Process</h2>
            <p>
              Once a return is received and inspected, we will notify you of the approval or rejection of your
              refund. Approved refunds will be processed to your original payment method within 5–7 business days.
              For Cash on Delivery orders, refunds will be issued via bank transfer or UPI.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">6. How to Request a Return</h2>
            <p>
              To initiate a return or report an issue with your order, please contact us with your order number and
              a description of the issue using the contact details listed on our{' '}
              <button type="button" onClick={() => navigate('/')} className="text-rose-500 hover:text-rose-400 underline underline-offset-4">
                homepage
              </button>{' '}
              or via WhatsApp.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
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
          Terms & <span className="text-rose-600">Conditions</span>
        </h1>
        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-14">Last updated: August 2026</p>

        <div className="space-y-10 text-sm leading-relaxed text-zinc-400">
          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">1. Acceptance of Terms</h2>
            <p>
              By accessing and using this website, you accept and agree to be bound by these Terms & Conditions.
              If you do not agree to these terms, please do not use our website.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">2. Products & Pricing</h2>
            <p>
              We make every effort to display accurate product descriptions, pricing, and stock availability.
              However, errors may occasionally occur. We reserve the right to correct any errors, inaccuracies,
              or omissions, and to change or update information at any time without prior notice.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">3. Orders & Payment</h2>
            <p>
              By placing an order, you confirm that all information provided is accurate and complete. We accept
              payment via Cash on Delivery, UPI, and Card as available at checkout. Orders are only confirmed once
              payment has been successfully processed (for prepaid orders) or the order has been accepted (for
              Cash on Delivery orders).
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">4. Delivery</h2>
            <p>
              Delivery timelines provided at checkout are estimates and not guaranteed. We are not liable for
              delays caused by circumstances beyond our reasonable control, including courier delays, weather,
              or incorrect address details provided by the customer.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">5. User Accounts</h2>
            <p>
              You are responsible for maintaining the confidentiality of your account credentials and for all
              activities that occur under your account. Notify us immediately of any unauthorized use of your account.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">6. Limitation of Liability</h2>
            <p>
              We shall not be liable for any indirect, incidental, or consequential damages arising from the use
              of our products or website, to the maximum extent permitted by applicable law.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">7. Governing Law</h2>
            <p>
              These Terms & Conditions are governed by the laws of India. Any disputes arising from the use of
              this website shall be subject to the exclusive jurisdiction of the courts in Jammu and Kashmir, India.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">8. Changes to Terms</h2>
            <p>
              We reserve the right to update these Terms & Conditions at any time. Continued use of the website
              after changes are posted constitutes your acceptance of the revised terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

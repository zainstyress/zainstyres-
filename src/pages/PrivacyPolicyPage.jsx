import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
          Privacy <span className="text-rose-600">Policy</span>
        </h1>
        <p className="text-xs text-zinc-600 uppercase tracking-widest font-bold mb-14">Last updated: August 2026</p>

        <div className="space-y-10 text-sm leading-relaxed text-zinc-400">
          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">1. Information We Collect</h2>
            <p>
              When you use our website, place an order, or create an account, we may collect information including
              your name, email address, phone number, delivery address, and payment details. We also automatically
              collect certain technical information such as your IP address and browser type to help us operate
              and secure the site.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">2. How We Use Your Information</h2>
            <p>
              We use the information you provide to process and deliver your orders, communicate order updates,
              respond to your queries, improve our products and services, and comply with legal obligations.
              We do not sell your personal information to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">3. Payment Information</h2>
            <p>
              Payments made on this website are processed through secure, PCI-DSS compliant third-party payment
              gateways. We do not store your full card, UPI, or banking details on our servers.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">4. Sharing of Information</h2>
            <p>
              We may share your information with trusted third parties who assist us in operating our website,
              conducting our business, or servicing you (such as payment processors, delivery partners, and SMS/email
              providers), so long as those parties agree to keep this information confidential.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">5. Cookies</h2>
            <p>
              We use cookies to keep you logged in, remember your cart, and understand how visitors use our site.
              You can choose to disable cookies through your browser settings, though some parts of the site may
              not function properly as a result.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">6. Your Rights</h2>
            <p>
              You may request access to, correction of, or deletion of your personal information by contacting us
              using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-white font-black uppercase tracking-widest text-xs mb-3">7. Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us using the details listed on our{' '}
              <button type="button" onClick={() => navigate('/')} className="text-rose-500 hover:text-rose-400 underline underline-offset-4">
                homepage
              </button>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, ShieldCheck, Mail, Lock, Eye, EyeOff, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCustomToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup,
  RecaptchaVerifier,
  signInWithPhoneNumber
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

const Auth = () => {
  // Steps: 'identifier' | 'password' | 'otp' | 'signup'
  const [step, setStep] = useState('identifier');
  
  const [identifier, setIdentifier] = useState(''); // Email or Phone
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState(null);

  const { API } = useAuth();
  const { toast } = useCustomToast();
  const navigate = useNavigate();

  // --- Handlers ---

  const handleContinue = async (e) => {
    e.preventDefault();
    if (!identifier.trim()) return toast.error('Please enter your mobile number or email');

    // Basic regex for email detection
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier);
    const isPhone = /^\+?[0-9]{7,15}$/.test(identifier.replace(/\s+/g, ''));

    if (isEmail) {
      setStep('password');
    } else if (isPhone) {
      // Trigger OTP
      handleSendOTP();
    } else {
      toast.error('Please enter a valid email or phone number');
    }
  };

  const setupRecaptcha = () => {
    if (window.recaptchaVerifier) window.recaptchaVerifier.clear();
    window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
      callback: () => { console.log('Recaptcha resolved'); }
    });
  };

  const handleSendOTP = async () => {
    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const cleanPhone = identifier.replace(/\s+/g, '');
      const formatPh = cleanPhone.startsWith('+') ? cleanPhone : `+91${cleanPhone}`;
      
      const confirmation = await signInWithPhoneNumber(auth, formatPh, appVerifier);
      setConfirmationResult(confirmation);
      setStep('otp');
      toast.success('OTP sent to your phone!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Phone sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!verificationCode) return;
    setLoading(true);
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName || 'Phone User',
          email: user.email || '',
          phone: user.phoneNumber,
          profilePhoto: user.photoURL || '',
          role: 'user',
          isBlocked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      toast.success('Signed in successfully!');
      navigate('/');
    } catch (err) {
      console.error(err);
      toast.error('Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, identifier, password);
      
      // Sync with backend (optional but good for cookies/session)
      try {
        await fetch(`${API}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier, password }),
        });
      } catch (e) { console.error('Backend sync failed', e); }

      toast.success('Welcome back!');
      if (identifier === 'admin@zaintyres.com') navigate('/yehlepakadmerachoco');
      else navigate('/');
    } catch (err) {
      console.error('Auth Error:', err);
      let message = 'Authentication failed';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') message = 'Incorrect password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!identifier || !password || !name) return toast.error('Please fill all fields');
    if (password.length < 8) return toast.error('Password must be at least 8 characters');
    
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, identifier, password);
      
      await updateProfile(userCredential.user, { displayName: name });

      await setDoc(doc(db, 'users', userCredential.user.uid), {
        name: name,
        email: identifier,
        profilePhoto: '',
        role: 'user',
        isBlocked: false,
        login_count: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Sync with backend
      try {
        await fetch(`${API}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: identifier, password }),
        });
      } catch (e) { console.error('Backend sync failed', e); }

      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      console.error('Auth Error:', err);
      let message = 'Registration failed';
      if (err.code === 'auth/email-already-in-use') message = 'Email already in use. Please sign in instead.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (!userDoc.exists()) {
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName,
          email: user.email,
          profilePhoto: user.photoURL || '',
          role: 'user',
          isBlocked: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      toast.success('Signed in with Google!');
      navigate('/');
    } catch (err) {
      console.error('Google Auth Error:', err);
      toast.error(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  // --- Animation Variants ---
  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="min-h-screen flex flex-col items-center pt-10 pb-20 bg-[#0a0a0a] text-white font-['Inter'] relative overflow-hidden px-4">
      <div id="recaptcha-container"></div>
      
      {/* Abstract Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-rose-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rose-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Logo */}
      <div className="mb-6 z-10 cursor-pointer" onClick={() => navigate('/')}>
        <h1 className="text-3xl font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-zinc-400">ZAINS<span className="text-rose-600">TYRES</span></h1>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-[350px] z-10">
        <div className="bg-[#1a1a1a]/80 backdrop-blur-xl border border-white/10 p-6 sm:p-8 rounded-2xl shadow-2xl">
          <AnimatePresence mode="wait">
            
            {/* STEP 0: Identifier */}
            {step === 'identifier' && (
              <motion.div key="identifier" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <h2 className="text-[28px] font-normal mb-4">Sign in</h2>
                <form onSubmit={handleContinue} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-200 mb-1">Email or mobile phone number</label>
                    <input
                      type="text"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.2)] transition-all text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Continue'}
                  </button>
                </form>

                <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
                  By continuing, you agree to Zains Tyres' <span className="text-rose-500 hover:underline cursor-pointer">Conditions of Use</span> and <span className="text-rose-500 hover:underline cursor-pointer">Privacy Notice</span>.
                </p>

                <div className="mt-6 border-t border-white/10 pt-4">
                  <button className="text-sm font-bold text-zinc-300 hover:text-rose-500 flex items-center gap-1 group">
                    <ChevronRight size={14} className="text-zinc-500 group-hover:text-rose-500" />
                    Need help?
                  </button>
                </div>

                <div className="mt-4 border-t border-white/10 pt-4">
                  <p className="text-sm font-bold text-zinc-300 mb-1">Buying for work?</p>
                  <button className="text-sm text-rose-500 hover:underline">Create a free business account</button>
                </div>
              </motion.div>
            )}

            {/* STEP 1: Password */}
            {step === 'password' && (
              <motion.div key="password" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <h2 className="text-[28px] font-normal mb-2">Sign in</h2>
                <p className="text-sm text-zinc-300 flex items-center gap-2 mb-4">
                  {identifier} <button onClick={() => setStep('identifier')} className="text-rose-500 hover:underline text-xs font-bold">Change</button>
                </p>
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-bold text-zinc-200">Password</label>
                      <button type="button" className="text-sm text-rose-500 hover:underline">Forgot password?</button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-3 py-2 pr-10 outline-none focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.2)] transition-all text-sm"
                      />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white">
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Sign in'}
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 2: OTP */}
            {step === 'otp' && (
              <motion.div key="otp" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <h2 className="text-[28px] font-normal mb-2">Verify phone</h2>
                <p className="text-sm text-zinc-300 flex items-center gap-2 mb-4">
                  {identifier} <button onClick={() => setStep('identifier')} className="text-rose-500 hover:underline text-xs font-bold">Change</button>
                </p>
                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-200 mb-1">Enter OTP</label>
                    <input
                      type="text"
                      required
                      placeholder="123456"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-rose-500 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.2)] transition-all text-sm tracking-widest text-center"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-lg shadow-sm transition-all disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Verify Code'}
                  </button>
                  <button type="button" onClick={handleSendOTP} disabled={loading} className="w-full text-center text-sm text-rose-500 hover:underline mt-2">
                    Resend OTP
                  </button>
                </form>
              </motion.div>
            )}

            {/* STEP 3: Signup */}
            {step === 'signup' && (
              <motion.div key="signup" variants={pageVariants} initial="initial" animate="animate" exit="exit">
                <div className="flex items-center gap-2 mb-4 cursor-pointer text-zinc-400 hover:text-white" onClick={() => setStep('identifier')}>
                  <ChevronLeft size={20} /> <span className="text-sm font-bold">Back</span>
                </div>
                <h2 className="text-[28px] font-normal mb-4">Create account</h2>
                <form onSubmit={handleSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-zinc-200 mb-1">Your name</label>
                    <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="First and last name" className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-rose-500 transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-200 mb-1">Email</label>
                    <input type="email" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-rose-500 transition-all text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-zinc-200 mb-1">Password</label>
                    <input type={showPassword ? 'text' : 'password'} required placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#0a0a0a] border border-white/20 rounded-lg px-3 py-2 outline-none focus:border-rose-500 transition-all text-sm" />
                    <p className="text-xs text-zinc-500 mt-1 flex items-center gap-1"><ShieldCheck size={12}/> Passwords must be at least 8 characters.</p>
                  </div>
                  <button type="submit" disabled={loading} className="w-full bg-rose-600 hover:bg-rose-500 text-white font-medium py-2 rounded-lg shadow-sm transition-all disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin mx-auto" size={20} /> : 'Verify email'}
                  </button>
                </form>
                <p className="text-xs text-zinc-400 mt-4 leading-relaxed">
                  By creating an account, you agree to Zains Tyres' <span className="text-rose-500 hover:underline cursor-pointer">Conditions of Use</span> and <span className="text-rose-500 hover:underline cursor-pointer">Privacy Notice</span>.
                </p>
                <div className="mt-6 border-t border-white/10 pt-4 text-sm text-zinc-300">
                  Already have an account? <button onClick={() => setStep('identifier')} className="text-rose-500 hover:underline font-bold">Sign in</button>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Separator / Alternative Login (Only on identifier screen) */}
        {step === 'identifier' && (
          <>
            <div className="flex items-center gap-4 mt-6 mb-4">
              <div className="h-[1px] flex-1 bg-white/10" />
              <span className="text-xs text-zinc-500">New to Zains Tyres?</span>
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>
            <button 
              onClick={() => { setStep('signup'); setIdentifier(''); setPassword(''); }}
              className="w-full bg-[#1a1a1a] hover:bg-[#252525] border border-white/20 text-white font-medium py-2 rounded-lg shadow-sm transition-all text-sm"
            >
              Create your Zains Tyres account
            </button>

            <div className="flex items-center gap-4 mt-6 mb-4">
              <div className="h-[1px] flex-1 bg-white/10" />
              <span className="text-xs text-zinc-500">Or continue with</span>
              <div className="h-[1px] flex-1 bg-white/10" />
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-white hover:bg-zinc-200 text-black font-medium py-2 rounded-lg flex items-center justify-center gap-3 transition-all text-sm shadow-xl"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5.04c1.94 0 3.51.67 4.7 1.77l3.54-3.54C18.18 1.48 15.31.5 12 .5 7.37.5 3.4 3.14 1.48 6.97l4.23 3.28C6.7 7.42 9.14 5.04 12 5.04z" />
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.89 3.02c2.28-2.1 3.53-5.2 3.53-8.84z" />
                <path fill="#FBBC05" d="M5.71 14.75c-.24-.72-.38-1.49-.38-2.25s.14-1.53.38-2.25L1.48 6.97c-.95 1.93-1.48 4.12-1.48 6.53s.53 4.6 1.48 6.53l4.23-3.28z" />
                <path fill="#34A853" d="M12 23.5c3.24 0 5.95-1.08 7.93-2.91l-3.89-3.02c-1.08.73-2.47 1.16-4.04 1.16-3.11 0-5.74-2.11-6.68-4.96l-4.23 3.28c1.92 3.83 5.89 6.47 10.23 6.47z" />
              </svg>
              Google
            </button>
          </>
        )}

      </div>

      {/* Amazon Style Footer Links */}
      <div className="mt-auto pt-8 flex gap-6 text-xs text-rose-500 font-medium pb-8 z-10">
        <a href="#" className="hover:underline hover:text-white transition-colors">Conditions of Use</a>
        <a href="#" className="hover:underline hover:text-white transition-colors">Privacy Notice</a>
        <a href="#" className="hover:underline hover:text-white transition-colors">Help</a>
      </div>
      <p className="text-[10px] text-zinc-500 z-10 mb-4">© 2024-2026, ZainsTyres.com, Inc. or its affiliates</p>
    </div>
  );
};

export default Auth;

import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import {
  X,
  Lock,
  Mail,
  User,
  Sparkles,
  Phone,
  MapPin,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { loginAs, signupAs, loginWithGoogleFast, completeGoogleSignUp, currentUser } = useStore();
  const [tab, setTab] = useState<'login' | 'signup'>('signup');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');

  // Google sign up details completion step
  const [googleStepUser, setGoogleStepUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
  } | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleFastAuth = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const result = await loginWithGoogleFast();
      if (result.needsDetails && result.googleUser) {
        // Need to collect full name, phone, delivery address
        setGoogleStepUser(result.googleUser);
        setName(result.googleUser.displayName || '');
        setEmail(result.googleUser.email || '');
      } else {
        // Logged in directly
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Google Sign-In failed. Please try again or use standard sign up.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleStepUser) return;
    setError(null);

    if (!name.trim()) {
      setError('Please provide your Full Name.');
      return;
    }
    if (!phone.trim()) {
      setError('Please provide your Contact Phone number for courier delivery.');
      return;
    }
    if (!address.trim()) {
      setError('Please provide your Delivery Address.');
      return;
    }

    setIsLoading(true);
    try {
      await completeGoogleSignUp({
        uid: googleStepUser.uid,
        displayName: name.trim(),
        email: googleStepUser.email,
        phone: phone.trim(),
        address: address.trim(),
      });
      setGoogleStepUser(null);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to complete profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email / Gmail address.');
      return;
    }

    if (tab === 'signup') {
      if (!name.trim()) {
        setError('Please enter your Full Name.');
        return;
      }
      if (!password || password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (!phone.trim()) {
        setError('Please enter your Contact Phone number.');
        return;
      }
      if (!address.trim()) {
        setError('Please enter your Delivery Address.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (tab === 'login') {
        await loginAs(email, password);
      } else {
        await signupAs({
          name: name.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          address: address.trim(),
          provider: 'email',
        });
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg bg-stone-900/95 border border-orange-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-xl text-stone-100 my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title & Branding */}
        <div className="text-center mb-5 space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>EXINS Customer Registration</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {googleStepUser
              ? 'Complete Your Customer Details'
              : tab === 'login'
              ? 'Sign In to JKsur+'
              : 'Create Customer Account'}
          </h2>
          <p className="text-xs text-stone-400">
            {googleStepUser
              ? 'One last step: confirm your contact phone & address for orders'
              : 'JKsur+ Novaliches Quezon City — Fashion Showcase & Inventory'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/40 text-red-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Google Step: Needs Full Name, Phone, and Delivery Address */}
        {googleStepUser ? (
          <form onSubmit={handleCompleteGoogleProfile} className="space-y-3.5 animate-fade-in">
            <div className="p-3 rounded-2xl bg-stone-950/80 border border-orange-500/30 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center p-1 shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                </div>
                <div className="truncate">
                  <p className="font-semibold text-white truncate">{googleStepUser.email}</p>
                  <p className="text-[10px] text-emerald-400">Google Verified</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGoogleStepUser(null)}
                className="text-[11px] text-stone-400 hover:text-stone-200 underline cursor-pointer"
              >
                Change
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Full Name *
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Maria Santos"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950/70 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Contact Phone *
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                <input
                  type="tel"
                  required
                  placeholder="e.g. 0917-123-4567 or +63 9XX XXX XXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950/70 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-300 mb-1">
                Delivery Address *
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                <textarea
                  required
                  rows={2}
                  placeholder="House/Unit #, Street, Barangay, City/Municipality, Province"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-950/70 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Save & Complete Sign Up</span>
            </button>
          </form>
        ) : (
          <>
            {/* Fast Sign Up with Google Button */}
            <div className="mb-4">
              <button
                type="button"
                onClick={handleGoogleFastAuth}
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-3 cursor-pointer border border-stone-200 active:scale-98"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>
                  {tab === 'signup'
                    ? 'Fast Sign Up with Google'
                    : 'Fast Sign In with Google'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 h-px bg-stone-800" />
              <span className="text-[11px] text-stone-400 uppercase tracking-wider font-semibold">
                Or continue with email
              </span>
              <div className="flex-1 h-px bg-stone-800" />
            </div>

            {/* Tab switch */}
            <div className="flex p-1 bg-stone-950/60 rounded-xl mb-4 border border-orange-500/20">
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  tab === 'signup'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Sign Up (New Account)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError(null);
                }}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition cursor-pointer ${
                  tab === 'login'
                    ? 'bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-md'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                Sign In
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              {tab === 'signup' && (
                <div>
                  <label className="block text-xs font-semibold text-stone-300 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Maria Santos"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950/70 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Gmail / Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="email"
                    required
                    placeholder="yourname@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950/70 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-300 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                  <input
                    type="password"
                    required
                    placeholder={tab === 'signup' ? 'Create a secure password (min. 6 chars)' : '••••••••'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950/70 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                </div>
              </div>

              {tab === 'signup' && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Contact Phone *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 0917-123-4567"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-stone-950/70 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-300 mb-1">
                      Delivery Address *
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-stone-400" />
                      <textarea
                        required
                        rows={2}
                        placeholder="House/Unit #, Street, Barangay, City, Province"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-xl bg-stone-950/70 border border-orange-500/20 text-stone-100 placeholder:text-stone-500 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-700 hover:from-orange-500 hover:to-amber-600 text-white font-bold text-sm shadow-lg shadow-orange-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                <span>
                  {tab === 'login' ? 'Sign In' : 'Create & Save Customer Account'}
                </span>
              </button>
            </form>
          </>
        )}

        {/* Current user badge */}
        <div className="mt-5 pt-3.5 border-t border-stone-800 text-center">
          <p className="text-[11px] text-stone-400">
            Current status:{' '}
            <span className="font-semibold text-orange-400">
              {currentUser.displayName || 'Guest Visitor'}
            </span>{' '}
            (
            <span className="capitalize">{currentUser.role || 'guest'}</span>
            )
          </p>
        </div>
      </div>
    </div>
  );
};

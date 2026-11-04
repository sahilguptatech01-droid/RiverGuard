import { useState, type FormEvent } from 'react';
import { AlertCircle, ArrowRight, Loader2, Waves, CheckCircle2 } from 'lucide-react';
import { errorMessage } from '@/lib/pollution';

type AuthScreenProps = {
  onSignIn: (email: string, password: string) => Promise<void>;
  onSignUp: (fullName: string, email: string, password: string) => Promise<{ signedIn: boolean }>;
};

type Mode = 'signin' | 'signup';

const HERO_IMAGE =
  'https://images.pexels.com/photos/5526877/pexels-photo-5526877.jpeg?auto=compress&cs=tinysrgb&h=650&w=940';

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-600/20';

export default function AuthScreen({ onSignIn, onSignUp }: AuthScreenProps) {
  const [mode, setMode] = useState<Mode>('signin');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail || password.length < 6) {
      setError('Enter a valid email and a password of at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'signin') {
        await onSignIn(trimmedEmail, password);
      } else {
        if (!fullName.trim()) {
          setError('Please enter your full name.');
          return;
        }
        const { signedIn } = await onSignUp(fullName.trim(), trimmedEmail, password);
        if (!signedIn) {
          setNotice('Account created. Sign in with your new password to continue.');
          setMode('signin');
          setPassword('');
        }
      }
    } catch (caught) {
      setError(friendlyAuthError(errorMessage(caught, 'Something went wrong. Please try again.')));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-screen bg-slate-50 lg:grid-cols-2">
      <div className="relative hidden overflow-hidden lg:block">
        <img src={HERO_IMAGE} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/60 to-teal-900/30" />
        <div className="relative flex h-full flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
              <Waves className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold tracking-tight">RiverGuard</span>
          </div>
          <div className="max-w-md">
            <p className="text-sm font-medium uppercase tracking-widest text-teal-200">River pollution intelligence</p>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.2]">
              See where rivers are under pressure, and act before it spreads.
            </h1>
            <p className="mt-4 text-base leading-relaxed text-slate-200">
              Citizen reports become live hotspot maps, trend analytics and priority alerts for the teams that protect our waterways.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-white">
              <Waves className="h-5 w-5" />
            </div>
            <span className="text-lg font-semibold text-slate-900">RiverGuard</span>
          </div>

          <h2 className="text-2xl font-semibold leading-[1.2] text-slate-900">
            {mode === 'signin' ? 'Sign in to RiverGuard' : 'Create your account'}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            {mode === 'signin'
              ? 'Officials see the hotspot dashboard. Citizens report and track complaints.'
              : 'Create an account to report pollution in your area.'}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-lg bg-slate-200/70 p-1">
            {(['signin', 'signup'] as Mode[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => switchMode(option)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  mode === option ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label htmlFor="full-name" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <input
                  id="full-name"
                  className={inputClass}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  maxLength={120}
                  autoComplete="name"
                  required
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                id="email"
                type="email"
                className={inputClass}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={inputClass}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                minLength={6}
                required
              />
            </div>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg bg-red-50 px-3.5 py-3 text-sm text-red-700 ring-1 ring-red-600/20">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {notice && (
              <div role="status" className="flex items-start gap-2 rounded-lg bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 ring-1 ring-emerald-600/20">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{notice}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="group flex w-full items-center justify-center gap-2 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {mode === 'signin' ? 'Sign in' : 'Create account'}
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'The email or password is incorrect.';
  if (lower.includes('already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Try signing in instead.';
  }
  if (lower.includes('failed to fetch') || lower.includes('network')) {
    return 'Network error. Check your connection and try again.';
  }
  return message;
}

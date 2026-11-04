import { useState } from 'react';
import { LogOut, Waves, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import AuthScreen from '@/components/auth/AuthScreen';
import CitizenPortal from '@/components/citizen/CitizenPortal';
import GovDashboard from '@/components/gov/GovDashboard';
import { errorMessage } from '@/lib/pollution';

export default function App() {
  const auth = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);

  if (auth.loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-6 w-6 animate-spin text-teal-700" />
      </div>
    );
  }

  if (!auth.user) {
    return <AuthScreen onSignIn={auth.signIn} onSignUp={auth.signUp} />;
  }

  if (!auth.role) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-6 text-center">
        <AlertTriangle className="h-8 w-8 text-amber-600" />
        <p className="max-w-md text-sm leading-relaxed text-slate-700">
          {auth.profileError ?? 'Your account is not ready yet. Please try again shortly.'}
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              await auth.signOut();
            } catch (caught) {
              setSignOutError(errorMessage(caught, 'Could not sign out.'));
            }
          }}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Sign out
        </button>
        {signOutError && <p className="text-sm text-red-700">{signOutError}</p>}
      </div>
    );
  }

  const isOfficial = auth.role === 'official' || auth.role === 'super_admin';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {isOfficial ? (
        <GovDashboard
          userId={auth.user.id}
          fullName={auth.fullName}
          role={auth.role}
          onSignOut={auth.signOut}
        />
      ) : (
        <CitizenPortal
          userId={auth.user.id}
          fullName={auth.fullName}
          onSignOut={auth.signOut}
        />
      )}
    </div>
  );
}

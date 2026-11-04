import { useCallback, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AppRole } from '@/lib/types';

export type AuthState = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: AppRole | null;
  fullName: string;
  profileError: string | null;
};

const INITIAL_STATE: AuthState = {
  loading: true,
  session: null,
  user: null,
  role: null,
  fullName: '',
  profileError: null,
};

async function loadProfile(user: User): Promise<Pick<AuthState, 'role' | 'fullName' | 'profileError'>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();
  if (error) {
    return { role: null, fullName: '', profileError: error.message };
  }
  if (!data) {
    return { role: null, fullName: '', profileError: 'Your account profile could not be found. Please contact an administrator.' };
  }
  return { role: data.role as AppRole, fullName: (data.full_name as string) ?? '', profileError: null };
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(INITIAL_STATE);

  useEffect(() => {
    let active = true;

    const applySession = (session: Session | null) => {
      (async () => {
        if (!session?.user) {
          if (active) setState({ ...INITIAL_STATE, loading: false });
          return;
        }
        const profile = await loadProfile(session.user);
        if (active) {
          setState({ loading: false, session, user: session.user, ...profile });
        }
      })();
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUp = useCallback(async (fullName: string, email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) throw error;
    return { signedIn: data.session !== null };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  return { ...state, signIn, signUp, signOut };
}

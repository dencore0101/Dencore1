import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { logError } from '@/lib/errorLogger';
import { bootstrapClinic } from '@/lib/clinic';
import type { Profile } from '@/types/db';

interface SignUpResult {
  needsEmailConfirmation: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_TIMEOUT_MS = 15_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<T>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
    }),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async (uid: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('clinic_memberships')
      .select(
        `id, clinic_id, user_id, role, created_at,
         clinic:clinics(id, name, slug, created_at, updated_at)`,
      )
      .eq('user_id', uid)
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;

    const membership = {
      id: data.id,
      clinic_id: data.clinic_id,
      user_id: data.user_id,
      role: data.role,
      created_at: data.created_at,
    };
    const clinic = Array.isArray(data.clinic) ? data.clinic[0] : data.clinic;

    if (!clinic) return null;

    localStorage.setItem('clinic_id', clinic.id);
    return { clinic, membership, role: data.role };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const p = await loadProfile(user.id);
    setProfile(p);
  }, [user, loadProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id).then((p) => {
          setProfile(p);
          setLoading(false);
        });
      } else {
        setLoading(false);
      }
    });

    // IMPORTANT: this callback must be synchronous and must NOT await any
    // Supabase calls. The SDK's _notifyAllSubscribers awaits all callbacks,
    // so any async Supabase operation here would deadlock the auth state.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProfile(null);
        setLoading(false);
        localStorage.removeItem('clinic_id');
      }
    });

    return () => authListener.subscription.unsubscribe();
  }, [loadProfile]);

  // Load profile when user changes (separate effect to avoid deadlock in onAuthStateChange)
  useEffect(() => {
    if (user && !profile) {
      loadProfile(user.id).then(async (p) => {
        if (!p) {
          // No clinic membership — check if there's a pending clinic bootstrap
          const pendingClinicName = localStorage.getItem('pending_clinic_name');
          if (pendingClinicName) {
            try {
              await bootstrapClinic(pendingClinicName);
              localStorage.removeItem('pending_clinic_name');
              const freshProfile = await loadProfile(user.id);
              setProfile(freshProfile);
            } catch (err) {
              logError({
                module: 'Auth',
                operation: 'pendingBootstrap',
                message: err instanceof Error ? err.message : 'Bootstrap failed',
                severity: 'critical',
              });
            }
          }
        } else {
          setProfile(p);
        }
        setLoading(false);
      });
    }
  }, [user, profile, loadProfile]);

  const signIn = async (email: string, password: string) => {
    const { error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      AUTH_TIMEOUT_MS,
      'Sign in',
    );
    if (error) {
      logError({ module: 'Auth', operation: 'signIn', message: error.message, severity: 'warning' });
      throw error;
    }
  };

  const signUp = async (email: string, password: string): Promise<SignUpResult> => {
    const { data, error } = await withTimeout(
      supabase.auth.signUp({ email, password }),
      AUTH_TIMEOUT_MS,
      'Sign up',
    );

    if (error) {
      logError({ module: 'Auth', operation: 'signUp', message: error.message, severity: 'warning' });
      throw error;
    }

    // If email confirmation is enabled, no session is returned
    return { needsEmailConfirmation: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    localStorage.removeItem('clinic_id');
  };

  return (
    <AuthContext.Provider
      value={{ session, user, profile, loading, signIn, signUp, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

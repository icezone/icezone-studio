import { create } from 'zustand';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient, User, Session, AuthError, Provider } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialize: () => Promise<void>;
  signInWithOAuth: (provider: Provider) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient();
  }
  return _supabase;
}

export const useAuthStore = create<AuthState>((set) => {
  return {
    user: null,
    session: null,
    loading: true,

    async initialize() {
      const supabase = getSupabase();
      const { data: { session } } = await supabase.auth.getSession();
      set({
        user: session?.user ?? null,
        session,
        loading: false,
      });

      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          user: session?.user ?? null,
          session,
        });
      });
    },

    async signInWithOAuth(provider: Provider) {
      const { error } = await getSupabase().auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${typeof window !== 'undefined' ? window.location.origin : ''}/callback`,
        },
      });
      return { error };
    },

    async signUp(email: string, password: string) {
      const { error } = await getSupabase().auth.signUp({ email, password });
      return { error };
    },

    async signIn(email: string, password: string) {
      const { error } = await getSupabase().auth.signInWithPassword({ email, password });
      return { error };
    },

    async signOut() {
      await getSupabase().auth.signOut();
      set({ user: null, session: null });
    },
  };
});

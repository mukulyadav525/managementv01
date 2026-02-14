import { create } from 'zustand';
import { User } from '@/types';
import { supabase } from '@/config/supabase';
import { toCamel, toSnake } from '@/services/supabase.service';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<User> & { societyName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => void;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true, error: null });
      console.log('authStore: Attempting sign in:', email);

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        console.log('authStore: Sign in success, UID:', authData.user.id);
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('uid', authData.user.id)
          .single();

        if (userError) {
          console.error('authStore: Profile fetch error during sign in:', userError.message, userError.code);
          set({ loading: false });
          if (userError.code === 'PGRST116') {
            throw new Error('Profile record not found. This can happen if your registration was incomplete due to database permissions. Please delete your user from Supabase and try again with the new RLS policies.');
          }
          throw userError;
        } else if (userData) {
          console.log('authStore: Profile fetched successfully:', userData);
          set({ user: toCamel(userData) as User, loading: false });
        } else {
          console.warn('authStore: No profile data returned');
          set({ loading: false });
          throw new Error('User profile record is missing. Please re-register.');
        }
      }
    } catch (error: any) {
      console.error('authStore: Sign in error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, userData: Partial<User> & { societyName?: string }) => {
    try {
      set({ loading: true, error: null });
      console.log('authStore: [SIGNUP] Starting registration for:', email);

      // 1. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user || !authData.session) {
        if (!authData.session && authData.user) {
          throw new Error('Email confirmation required. Please disable it in Supabase settings.');
        }
        throw new Error('Signup failed: No session returned. Check Supabase configuration.');
      }

      const uid = authData.user.id;
      let societyId = userData.societyId || '';

      // 2. Create User Profile
      const newUser: User = {
        uid: uid,
        email,
        name: userData.name || '',
        phone: userData.phone || '',
        role: userData.role || 'tenant',
        societyId: societyId,
        flatIds: userData.flatIds || [],
        status: 'active',
        createdAt: new Date().toISOString() as any,
        updatedAt: new Date().toISOString() as any,
      };

      console.log('authStore: [SIGNUP] Creating profile for UID:', uid);
      const { error: dbError } = await supabase
        .from('users')
        .insert([toSnake(newUser)]);

      if (dbError) {
        console.error('authStore: [SIGNUP] Profile creation error:', dbError);
        throw new Error(`Profile creation failed: ${dbError.message}`);
      }

      // 3. Admin Flow: Society Creation
      if (userData.role === 'admin' && userData.societyName) {
        console.log('authStore: [SIGNUP] Setting up new society:', userData.societyName);

        societyId = userData.societyName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

        const newSociety = {
          id: societyId,
          name: userData.societyName,
          total_flats: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: socError } = await supabase.from('societies').insert([newSociety]);
        if (socError) {
          console.error('authStore: [SIGNUP] Society creation error:', socError);
          throw socError;
        }

        // Link user to society
        console.log('authStore: [SIGNUP] Linking admin to society:', societyId);
        const { error: updateError } = await supabase
          .from('users')
          .update({ society_id: societyId })
          .eq('uid', uid);

        if (updateError) {
          console.error('authStore: [SIGNUP] Admin linking error:', updateError);
          throw updateError;
        }

        newUser.societyId = societyId;
      }

      // Final successfully registration state
      set({ user: newUser, loading: false });
      console.log('authStore: [SIGNUP] Process complete for:', uid);

    } catch (error: any) {
      console.error('authStore: [SIGNUP] Critical error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, error: null, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  initializeAuth: async () => {
    console.log('authStore: Initializing auth listener and checking initial session');

    try {
      // 1. Check initial session once to avoid stuck loading if listener is slow
      const { data: { session }, error: initialError } = await supabase.auth.getSession();

      if (initialError) {
        console.error('authStore: Initial session fetch error:', initialError.message);
        set({ loading: false, error: initialError.message });
      } else if (session?.user) {
        console.log('authStore: Initial session found for UID:', session.user.id);
        const { data: userData } = await supabase
          .from('users')
          .select('*')
          .eq('uid', session.user.id)
          .single();

        if (userData) {
          set({ user: toCamel(userData) as User, loading: false });
        } else {
          set({ loading: false });
        }
      } else {
        console.log('authStore: No initial session found');
        set({ loading: false });
      }

      // 2. Setup listener for future changes
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('authStore: Auth state change event:', event, session?.user?.id);

        if (session?.user) {
          const currentState = useAuthStore.getState();
          // Only fetch if session is different from current user to avoid loops
          if (currentState.user?.uid !== session.user.id) {
            const { data: userData } = await supabase
              .from('users')
              .select('*')
              .eq('uid', session.user.id)
              .single();

            if (userData) {
              set({ user: toCamel(userData) as User, loading: false });
            }
          }
        } else {
          set({ user: null, loading: false });
        }
      });

      // 3. Absolute safety timeout
      setTimeout(() => {
        if (useAuthStore.getState().loading) {
          console.warn('authStore: Initialization timed out, forcing loading to false');
          set({ loading: false });
        }
      }, 5000);

    } catch (e: any) {
      console.error('authStore: Initialization error:', e);
      set({ loading: false, error: e.message });
    }
  },

  setUser: (user: User | null) => set({ user, loading: false }),
}));

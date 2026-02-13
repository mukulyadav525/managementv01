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
      console.log('authStore: [SIGNUP] Starting resetup process for:', email);

      // 1. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        set({ loading: false });
        throw authError;
      }

      if (!authData.user || !authData.session) {
        set({ loading: false });
        // Handling the "Email Confirmation" case as a success but with a specific state
        if (!authData.session && authData.user) {
          throw new Error('Email confirmation required. Please disable it in Supabase for seeding to work.');
        }
        throw new Error('Signup failed: No user or session. Check your Supabase settings.');
      }

      const uid = authData.user.id;
      let societyId = userData.societyId || '';

      // 2. Create User Profile IMMEDIATELY (Profile-First Strategy)
      // This ensures the user can login even if seeding fails
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

      console.log('authStore: [SIGNUP] Creating user profile for UID:', uid);
      const { error: dbError } = await supabase
        .from('users')
        .insert([toSnake(newUser)]);

      if (dbError) {
        console.error('authStore: [SIGNUP] Profile insertion error:', dbError.message, dbError.code);
        set({ loading: false });
        throw new Error(`Critical: Profile creation failed. Please try again. (${dbError.message})`);
      }

      // 3. Admin Flow: Society Creation (No Seeding)
      if (userData.role === 'admin' && userData.societyName) {
        console.log('authStore: [SIGNUP] Creating new society:', userData.societyName);

        // Generate a random ID for society
        societyId = userData.societyName.toLowerCase().replace(/\s+/g, '-') + '-' + Math.random().toString(36).substring(2, 7);

        const newSociety = {
          id: societyId,
          name: userData.societyName,
          total_flats: 10,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: socError } = await supabase.from('societies').insert([newSociety]);
        if (socError) throw socError;

        // Update user's society_id now that we have it
        await supabase.from('users').update({ society_id: societyId }).eq('uid', uid);
        newUser.societyId = societyId;

        console.log('authStore: [SIGNUP] Society created with ID:', societyId);
      }

      set({ user: newUser, loading: false });
      console.log('authStore: [SIGNUP] Registration complete for UID:', uid);

    } catch (error: any) {
      console.error('authStore: [SIGNUP] Error:', error);
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

  initializeAuth: () => {
    console.log('authStore: Initializing auth listener');
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('authStore: Auth state changed:', event, session?.user?.id);

      if (session?.user) {
        try {
          // If we already have a user in state that matches the session, 
          // don't bother fetching again unless it's a forced refresh
          const currentState = useAuthStore.getState();
          if (currentState.user?.uid === session.user.id && !currentState.loading) {
            console.log('authStore: User already in state, skipping fetch');
            return;
          }

          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('uid', session.user.id)
            .single();

          if (userError) {
            console.error('authStore: Profile fetch error in listener for UID:', session.user.id, userError.message, userError.code);
            set({ loading: false });
            if (userError.code === 'PGRST116') {
              set({ error: 'User profile not found. Please re-register or contact support.' });
            }
          } else if (userData) {
            console.log('authStore: Profile fetched in listener for UID:', session.user.id);
            set({ user: toCamel(userData) as User, loading: false });
          } else {
            console.warn('authStore: No profile returned in listener for UID:', session.user.id);
            set({ error: 'User profile record is missing.', loading: false });
          }
        } catch (e) {
          console.error('authStore: Error in listener:', e);
          set({ loading: false });
        }
      } else {
        set({ user: null, loading: false });
      }
    });
  },

  setUser: (user: User | null) => set({ user, loading: false }),
}));

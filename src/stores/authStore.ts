import { create } from 'zustand';
import { User } from '@/types';
import { supabase } from '@/config/supabase';
import { toCamel, toSnake } from '@/services/supabase.service';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<User> & { societyName?: string }) => Promise<void>;
  completeProfile: (userData: Partial<User> & { societyName?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => void;
  setUser: (user: User | null) => void;
  needsCompletion: boolean;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
}


export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,
  needsCompletion: false,

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
          if (userError.code === 'PGRST116') {
            console.log('authStore: User authenticated but no profile found. Needs completion.');
            set({ user: null, loading: false, needsCompletion: true });
            return;
          }
          console.error('authStore: Profile fetch error during sign in:', userError.message, userError.code);
          set({ loading: false });
          throw userError;
        } else if (userData) {
          console.log('authStore: Profile fetched successfully:', userData);
          const user = toCamel(userData) as User;

          // Validate role
          const validRoles = ['admin', 'owner', 'tenant', 'security', 'staff'];
          if (!user.role || !validRoles.includes(user.role)) {
            console.error('authStore: Invalid or missing role in profile:', user.role);
            set({ user: null, loading: false, needsCompletion: true }); // Treat as incomplete to force profile update/fix
            return;
          }

          set({ user, loading: false, needsCompletion: false });
        } else {
          console.warn('authStore: No profile data returned');
          set({ loading: false, needsCompletion: true });
        }
      }
    } catch (error: any) {
      console.error('authStore: Sign in error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  signInWithGoogle: async () => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('authStore: Google Sign in error:', error);
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

      await useAuthStore.getState().completeProfile(userData);

    } catch (error: any) {
      console.error('authStore: [SIGNUP] Critical error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  completeProfile: async (userData: Partial<User> & { societyName?: string }) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) throw new Error('No authenticated user found');

    const uid = authUser.id;
    const email = authUser.email || '';
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

    console.log('authStore: [completeProfile] Creating profile for UID:', uid);

    // Check if profile already exists to avoid duplicate key error
    const { data: existingProfile } = await supabase.from('users').select('uid').eq('uid', uid).single();

    let dbError;
    if (existingProfile) {
      const { error } = await supabase.from('users').update(toSnake(newUser)).eq('uid', uid);
      dbError = error;
    } else {
      const { error } = await supabase.from('users').insert([toSnake(newUser)]);
      dbError = error;
    }

    if (dbError) {
      console.error('authStore: [completeProfile] Profile creation error:', dbError);
      throw new Error(`Profile creation failed: ${dbError.message}`);
    }

    // 3. Admin Flow: Society Creation
    if (userData.role === 'admin' && userData.societyName) {
      console.log('authStore: [completeProfile] Setting up new society:', userData.societyName);

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
        console.error('authStore: [completeProfile] Society creation error:', socError);
        throw socError;
      }

      // Link user to society
      console.log('authStore: [completeProfile] Linking admin to society:', societyId);
      const { error: updateError } = await supabase
        .from('users')
        .update({ society_id: societyId })
        .eq('uid', uid);

      if (updateError) {
        console.error('authStore: [completeProfile] Admin linking error:', updateError);
        throw updateError;
      }

      newUser.societyId = societyId;
    }

    // Final successfully registration state
    set({ user: newUser, loading: false, needsCompletion: false });
    console.log('authStore: [completeProfile] Process complete for:', uid);
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null, error: null, loading: false, needsCompletion: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  initializeAuth: async () => {
    console.log('authStore: Initializing auth listener and checking initial session');

    // 1. Absolute safety timeout - ensures app loads even if Supabase is slow
    const safetyTimeout = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        console.warn('authStore: Initialization timed out, forcing loading to false');
        set({ loading: false });
      }
    }, 5000);

    try {
      // 2. Setup listener for future changes immediately
      supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('authStore: Auth state change event:', event, session?.user?.id);

        if (session?.user) {
          const currentState = useAuthStore.getState();
          // Only fetch if session is different from current user to avoid loops
          if (currentState.user?.uid !== session.user.id) {
            try {
              const { data: userData, error } = await supabase
                .from('users')
                .select('*')
                .eq('uid', session.user.id)
                .single();

              if (error) throw error;

              if (userData) {
                set({ user: toCamel(userData) as User, loading: false, needsCompletion: false });
                clearTimeout(safetyTimeout);
              } else {
                set({ loading: false, needsCompletion: true });
                clearTimeout(safetyTimeout);
              }
            } catch (err) {
              console.error('authStore: Error fetching user profile on state change:', err);
              // Don't clear safety timeout here, let it handle the fallback if needed
              // or set loading false if we're sure it's a hard failure
              set({ loading: false });
            }
          }
        } else {
          set({ user: null, loading: false, needsCompletion: false });
          clearTimeout(safetyTimeout);
        }
      });

      // 3. Check initial session asynchronously to avoid blocking
      (async () => {
        try {
          const { data: { session }, error: initialError } = await supabase.auth.getSession();

          if (initialError) {
            console.error('authStore: Initial session fetch error:', initialError.message);
            set({ loading: false, error: initialError.message });
            clearTimeout(safetyTimeout);
          } else if (session?.user) {
            console.log('authStore: Initial session found for UID:', session.user.id);
            const { data: userData, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('uid', session.user.id)
              .single();

            if (profileError) {
              if (profileError.code === 'PGRST116') {
                console.log('authStore: Session found but no profile. Incomplete state.');
                set({ loading: false, needsCompletion: true });
              } else {
                console.error('authStore: Profile fetch error:', profileError.message);
                set({ loading: false });
              }
            } else if (userData) {
              set({ user: toCamel(userData) as User, loading: false, needsCompletion: false });
            }
            clearTimeout(safetyTimeout);
          } else {
            console.log('authStore: No initial session found');
            set({ loading: false });
            clearTimeout(safetyTimeout);
          }
        } catch (e: any) {
          console.error('authStore: Internal error checking session:', e);
          set({ loading: false });
          clearTimeout(safetyTimeout);
        }
      })();

    } catch (e: any) {
      console.error('authStore: Initialization setup error:', e);
      set({ loading: false, error: e.message });
      clearTimeout(safetyTimeout);
    }
  },


  setUser: (user: User | null) => set({ user, loading: false, needsCompletion: false }),

  resetPassword: async (email: string) => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/update-password',
      });
      if (error) throw error;
      set({ loading: false });
    } catch (error: any) {
      console.error('authStore: Reset password error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  updatePassword: async (password: string) => {
    try {
      set({ loading: true, error: null });
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      set({ loading: false });
    } catch (error: any) {
      console.error('authStore: Update password error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },
}));

import { create } from 'zustand';
import { User } from '@/types';
import { supabase } from '@/config/supabase';
import { toCamel, toSnake } from '@/services/supabase.service';
import { EmailService } from '@/services/email.service';

interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string, userData: Partial<User> & { societyName?: string, societyType?: string }) => Promise<void>;
  completeProfile: (userData: Partial<User> & { societyName?: string, societyType?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  initializeAuth: () => void;
  setUser: (user: User | null) => void;
  needsCompletion: boolean;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  registerByAdmin: (email: string, password: string, userData: Partial<User>) => Promise<string>;
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

          // Fetch societyType
          if (user.societyId) {
            const { data: socData } = await supabase
              .from('societies')
              .select('society_type')
              .eq('id', user.societyId)
              .single();
            if (socData) {
              user.societyType = socData.society_type;
            }
          }

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
      const redirectUrl = window.location.origin.replace(/\/$/, '') + '/login';
      console.log('authStore: Starting Google Sign In with redirect:', redirectUrl);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('authStore: Google Sign in error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, userData: Partial<User> & { societyName?: string, societyType?: string }) => {
    try {
      set({ loading: true, error: null });
      console.log('authStore: [SIGNUP] Starting registration for:', email);

      // 1. Auth Signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
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

  completeProfile: async (userData: Partial<User> & { societyName?: string, societyType?: string }) => {
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
        society_type: userData.societyType || 'tower',
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
    console.log('authStore: [INIT] Starting auth system...');

    // 1. Set full loading state
    set({ loading: true, error: null });

    // 2. Safety Timeout (ensure the app always loads even if Supabase/Network is slow)
    const safetyTimeout = setTimeout(() => {
      const state = useAuthStore.getState();
      if (state.loading) {
        console.warn('authStore: [INIT] Safety timeout reached! Forcing loading: false');
        set({ loading: false });
      }
    }, 6000); // 6 seconds for robustness

    // Helper function to fetch and sync profile
    const syncProfile = async (uid: string) => {
      try {
        const { data: userData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('uid', uid)
          .single();

        if (profileError) {
          if (profileError.code === 'PGRST116') {
            console.log('authStore: [INIT] No profile found for UID:', uid);
            set({ user: null, loading: false, needsCompletion: true });
          } else {
            console.error('authStore: [INIT] Profile fetch error:', profileError.message);
            set({ loading: false });
          }
        } else if (userData) {
          console.log('authStore: [INIT] Profile synced successfully');
          const user = toCamel(userData) as User;

          if (user.societyId) {
            const { data: socData } = await supabase
              .from('societies')
              .select('society_type')
              .eq('id', user.societyId)
              .single();
            if (socData) {
              user.societyType = socData.society_type;
            }
          }

          set({ user, loading: false, needsCompletion: false });
        }
      } catch (err) {
        console.error('authStore: [INIT] Critical sync error:', err);
        set({ loading: false });
      } finally {
        clearTimeout(safetyTimeout);
      }
    };

    // 3. Setup Auth Listener (Future proof)
    supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`authStore: [INIT_EVENT] ${event}`, session?.user?.id || 'No session');

      if (event === 'SIGNED_OUT') {
        set({ user: null, loading: false, needsCompletion: false });
        clearTimeout(safetyTimeout);
      } else if (session?.user) {
        // Only fetch if session changed or not loaded
        const current = useAuthStore.getState();
        if (!current.user || current.user.uid !== session.user.id) {
          await syncProfile(session.user.id);
        } else {
          set({ loading: false });
          clearTimeout(safetyTimeout);
        }
      } else {
        set({ loading: false });
        clearTimeout(safetyTimeout);
      }
    });

    // 4. Initial Session Check (Immediate)
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('authStore: [INIT] getSession error:', sessionError.message);
        set({ loading: false });
        clearTimeout(safetyTimeout);
        return;
      }

      if (session?.user) {
        await syncProfile(session.user.id);
      } else {
        console.log('authStore: [INIT] No initial session found');
        set({ loading: false });
        clearTimeout(safetyTimeout);
      }
    } catch (e: any) {
      console.error('authStore: [INIT] Session check exploded:', e);
      set({ loading: false });
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

  registerByAdmin: async (email: string, password: string, userData: Partial<User>) => {
    try {
      set({ loading: true, error: null });
      console.log('authStore: [ADMIN_REG] Starting registration for:', email);

      // Create a temporary client WITHOUT session persistence to avoid logging out the admin
      const { createClient } = await import('@supabase/supabase-js');
      const tempSupabase = createClient(
        import.meta.env.VITE_SUPABASE_URL,
        import.meta.env.VITE_SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
          }
        }
      );

      // 1. Auth Signup via temp client
      const { data: authData, error: authError } = await tempSupabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('User creation failed: No user returned.');
      }

      const uid = authData.user.id;
      console.log('authStore: [ADMIN_REG] Auth user created with UID:', uid);

      // 2. Create User Profile via main supabase client (which has admin's session)
      const newUserProfile: any = {
        uid: uid,
        email,
        name: userData.name || '',
        phone: userData.phone || '',
        role: userData.role || 'tenant',
        societyId: userData.societyId,
        flatIds: userData.flatIds || [],
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Only add optional staff fields if they exist to avoid schema errors
      if (userData.staffType) newUserProfile.staffType = userData.staffType;
      if (userData.staffRole) newUserProfile.staffRole = userData.staffRole;

      const { error: dbError } = await supabase.from('users').insert([toSnake(newUserProfile)]);

      if (dbError) {
        console.error('authStore: [ADMIN_REG] Profile creation error:', dbError);
        throw new Error(`Profile creation failed: ${dbError.message}`);
      }

      // 3. Send automated email (non-blocking)
      console.log('authStore: [ADMIN_REG] Dispatching email to:', email);
      EmailService.sendRegistrationEmail(email, password, userData.name || 'New User')
        .then(() => console.log('authStore: [ADMIN_REG] Email process initiated'))
        .catch(err => console.error('authStore: [ADMIN_REG] Email dispatch failed:', err));

      console.log('authStore: [ADMIN_REG] Process complete for:', uid);
      set({ loading: false });
      return uid; // Return the actual UID for use in the UI
    } catch (error: any) {
      console.error('authStore: [ADMIN_REG] Critical error:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },
}));

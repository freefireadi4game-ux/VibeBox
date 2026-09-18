import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { UserProfile } from '../types';
import {
  getSupabaseClient,
  isSupabaseConfigured,
  fetchUserProfileFromCloud,
  upsertUserProfileToCloud,
} from '../services/supabase';

export type AuthModalView = 'login' | 'signup' | 'forgot';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  role: 'admin' | 'user';
  isAdmin: boolean;
  isLoading: boolean;
  isConfigured: boolean;

  // Auth Operations
  signUp: (
    email: string,
    password: string,
    metadata?: { username?: string; full_name?: string }
  ) => Promise<{ success: boolean; error?: string; message?: string }>;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ success: boolean; error?: string }>;
  refreshProfile: () => Promise<void>;

  // Modal Controls
  isAuthModalOpen: boolean;
  authModalView: AuthModalView;
  openAuthModal: (view?: AuthModalView) => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: AuthModalView) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modal state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalView, setAuthModalView] = useState<AuthModalView>('login');

  const isConfigured = isSupabaseConfigured();

  // Helper to load or construct profile from public.profiles
  const loadProfile = useCallback(async (authUser: User) => {
    try {
      const isDesignatedAdmin =
        authUser.email?.toLowerCase() === 'freefireadi4game@gmail.com' ||
        authUser.user_metadata?.role === 'admin';

      const cloudProfile = await fetchUserProfileFromCloud(authUser.id);
      if (cloudProfile) {
        cloudProfile.email = cloudProfile.email || authUser.email;
        // If profile exists, check if role needs promotion for the admin account
        if (isDesignatedAdmin && cloudProfile.role !== 'admin') {
          cloudProfile.role = 'admin';
          upsertUserProfileToCloud(cloudProfile).catch(console.warn);
        }
        setProfile(cloudProfile);
      } else {
        // Fallback or initialize profile from user metadata
        const determinedRole = isDesignatedAdmin ? 'admin' : (authUser.user_metadata?.role || 'user');
        const fallbackProfile: UserProfile = {
          id: authUser.id,
          email: authUser.email,
          username:
            authUser.user_metadata?.username ||
            authUser.user_metadata?.display_name ||
            authUser.email?.split('@')[0] ||
            'VibeListener',
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || '',
          avatar_url: authUser.user_metadata?.avatar_url || '',
          role: determinedRole,
          created_at: authUser.created_at,
          updated_at: new Date().toISOString(),
        };
        setProfile(fallbackProfile);
        // Attempt to create the row in public.profiles table with proper role
        upsertUserProfileToCloud(fallbackProfile).catch(console.warn);
      }
    } catch (err) {
      console.warn('AuthContext: Failed to load profile:', err);
    }
  }, []);

  // Initialize session & register listener
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    // Get initial session
    client.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (!isMounted) return;
      if (error) {
        console.warn('AuthContext: Error getting initial session:', error.message);
      }
      setSession(initialSession);
      setUser(initialSession?.user ?? null);
      if (initialSession?.user) {
        loadProfile(initialSession.user);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;
      setSession(currentSession);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await loadProfile(currentUser);
      } else {
        setProfile(null);
      }
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      metadata?: { username?: string; full_name?: string }
    ) => {
      const client = getSupabaseClient();
      if (!client) {
        return { success: false, error: 'Supabase is not configured in this environment.' };
      }

      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: metadata?.username?.trim() || email.split('@')[0],
              full_name: metadata?.full_name?.trim() || '',
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          // If session is immediately active (e.g. email confirmation disabled)
          if (data.session) {
            await loadProfile(data.user);
            return { success: true, message: 'Account created successfully!' };
          } else {
            // Confirmation email sent
            return {
              success: true,
              message: 'Check your email to confirm your account and complete registration.',
            };
          }
        }

        return { success: true, message: 'Account created.' };
      } catch (err: any) {
        return { success: false, error: err.message || 'An unexpected error occurred during sign up.' };
      }
    },
    [loadProfile]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const client = getSupabaseClient();
      if (!client) {
        return { success: false, error: 'Supabase is not configured in this environment.' };
      }

      try {
        const { data, error } = await client.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          return { success: false, error: error.message };
        }

        if (data.user) {
          setUser(data.user);
          setSession(data.session);
          await loadProfile(data.user);
        }

        return { success: true };
      } catch (err: any) {
        return { success: false, error: err.message || 'An unexpected error occurred during sign in.' };
      }
    },
    [loadProfile]
  );

  const signOut = useCallback(async () => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      await client.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (err) {
      console.warn('AuthContext: Error during signOut:', err);
    }
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) return { success: false, error: 'No authenticated user' };

      try {
        const updatedProfile: UserProfile = {
          ...(profile || { id: user.id }),
          ...updates,
          id: user.id,
          updated_at: new Date().toISOString(),
        };

        const success = await upsertUserProfileToCloud(updatedProfile);
        if (success) {
          setProfile(updatedProfile);
          return { success: true };
        } else {
          return { success: false, error: 'Could not update profile on Supabase.' };
        }
      } catch (err: any) {
        return { success: false, error: err.message || 'Error updating profile.' };
      }
    },
    [user, profile]
  );

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user);
    }
  }, [user, loadProfile]);

  const openAuthModal = useCallback((view: AuthModalView = 'login') => {
    setAuthModalView(view);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  const role: 'admin' | 'user' =
    profile?.role === 'admin' ||
    user?.user_metadata?.role === 'admin' ||
    user?.email?.toLowerCase() === 'freefireadi4game@gmail.com'
      ? 'admin'
      : 'user';

  const isAdmin = role === 'admin';

  const value = {
    user,
    session,
    profile,
    role,
    isAdmin,
    isLoading,
    isConfigured,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
    isAuthModalOpen,
    authModalView,
    openAuthModal,
    closeAuthModal,
    setAuthModalView,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { UserProfile } from '@/types';
import { ErrorHandler, ErrorUtils } from './error-handler';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return;
      }

      if (data) {
        console.log('Profile fetched successfully:', { id: data.id, email: data.email, role: data.role });
        setProfile(data as UserProfile);
      } else {
        console.log('No profile found for user:', userId);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          await fetchProfile(session.user.id);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        await fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      // Validate inputs
      const emailValidation = ErrorUtils.validateEmail(email);
      if (!emailValidation) {
        return { error: ErrorHandler.createError('validation', 'Please enter a valid email address') };
      }

      const passwordValidation = ErrorUtils.validateRequired(password, 'Password');
      if (!passwordValidation.isValid) {
        return { error: ErrorHandler.createError('validation', passwordValidation.message!) };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: ErrorUtils.sanitizeInput(email),
        password,
      });
      
      if (error) {
        const appError = ErrorHandler.handleError(error, 'signIn');
        return { error: appError };
      }
      
      return { error: null };
    } catch (error) {
      const appError = ErrorHandler.handleError(error, 'signIn');
      return { error: appError };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      // Validate inputs
      const emailValidation = ErrorUtils.validateEmail(email);
      if (!emailValidation) {
        return { error: ErrorHandler.createError('validation', 'Please enter a valid email address') };
      }

      const passwordValidation = ErrorUtils.validatePassword(password);
      if (!passwordValidation.isValid) {
        return { error: ErrorHandler.createError('validation', passwordValidation.message!) };
      }

      const { error } = await supabase.auth.signUp({
        email: ErrorUtils.sanitizeInput(email),
        password,
      });
      
      if (error) {
        const appError = ErrorHandler.handleError(error, 'signUp');
        return { error: appError };
      }
      
      return { error: null };
    } catch (error) {
      const appError = ErrorHandler.handleError(error, 'signUp');
      return { error: appError };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      // Don't throw error for sign out - user should still be signed out
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  const isAdmin = profile?.is_admin === true || profile?.role === 'admin';

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        isAdmin,
        signIn,
        signUp,
        signOut,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

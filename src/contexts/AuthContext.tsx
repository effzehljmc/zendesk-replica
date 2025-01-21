import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../db';
import { fetchUserProfile, createUserProfile } from '../services/database';

export type Role = {
  id: string;
  name: 'admin' | 'agent' | 'customer';
  description: string;
};

type Profile = {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string;
  roles: Role[];
};

type AuthContextType = {
  user: any;
  profile: Profile | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions and sets the user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id)
          .then(setProfile)
          .catch(console.error);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserProfile(session.user.id)
          .then(setProfile)
          .catch(console.error);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    setLoading(false);
  }, [user]);

  const signUp = async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;

    if (data.user) {
      await createUserProfile(data.user.id, email, fullName);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;

    // Wait for the session to be established
    const session = await supabase.auth.getSession();
    if (!session.data.session?.user) {
      throw new Error('Failed to establish session');
    }

    // Fetch and set the user profile
    const userProfile = await fetchUserProfile(session.data.session.user.id);
    setUser(session.data.session.user);
    setProfile(userProfile);
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUser(null);
    setProfile(null);
  };

  const value = {
    user,
    profile,
    signIn,
    signUp,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 
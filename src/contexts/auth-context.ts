import { createContext } from 'react';
import { User } from '@supabase/supabase-js';

export type Role = {
  id: string;
  name: 'admin' | 'agent' | 'customer';
  description: string | null;
};

export interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  full_name: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  roles: Role[];
}

export type AuthContextType = {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateProfile: (data: Partial<Omit<UserProfile, 'roles' | 'created_at' | 'updated_at'>>) => Promise<void>;
  hasRole: (roleName: Role['name']) => boolean;
  hasAnyRole: (roleNames: Role['name'][]) => boolean;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined); 
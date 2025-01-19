import { supabase } from '../db';
import { Role } from '../contexts/AuthContext';

type DatabaseRole = {
  id: string;
  name: string;
  description: string;
};

export async function fetchUserProfile(userId: string) {
  // First get the user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('auth_user_id', userId)
    .single();

  if (profileError) throw profileError;
  if (!profile) return null;

  // Then get their roles
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select(`
      roles (
        id,
        name,
        description
      )
    `)
    .eq('user_id', profile.id);

  if (rolesError) throw rolesError;
  if (!userRoles) return { ...profile, roles: [] };

  // Safe type assertion after runtime check
  const roles = userRoles.map(ur => {
    const role = ur.roles as unknown as DatabaseRole;
    return {
      id: role.id,
      name: role.name as Role['name'],
      description: role.description,
    };
  });

  return {
    ...profile,
    roles,
  };
}

export async function createUserProfile(authUserId: string, email: string, fullName: string) {
  // Create the profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert([
      {
        auth_user_id: authUserId,
        email,
        full_name: fullName,
      },
    ])
    .select()
    .single();

  if (profileError) throw profileError;

  // Get the customer role
  const { data: customerRole, error: roleError } = await supabase
    .from('roles')
    .select()
    .eq('name', 'customer')
    .single();

  if (roleError) throw roleError;

  // Assign the customer role
  const { error: userRoleError } = await supabase
    .from('user_roles')
    .insert([
      {
        user_id: profile.id,
        role_id: customerRole.id,
      },
    ]);

  if (userRoleError) throw userRoleError;

  return profile;
}

export async function updateUserProfile(userId: string, data: any) {
  const { error } = await supabase
    .from('profiles')
    .update(data)
    .eq('auth_user_id', userId);

  if (error) throw error;
} 
import { supabase } from '@/lib/supabase';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

async function checkRoles() {
  try {
    // Check roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*');

    if (rolesError) throw rolesError;
    
    console.log('Current roles:', roles);

    // Check user_roles
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role_id,
        profiles!user_id (
          email,
          full_name
        ),
        roles!role_id (
          name
        )
      `);

    if (userRolesError) throw userRolesError;

    console.log('\nUser role assignments:', userRoles);

  } catch (error) {
    console.error('Error:', error);
  }
}

checkRoles(); 
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

async function assignAgentRole() {
  try {
    // Get your user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'lukas.maechtel@gauntletai.com')
      .single();

    if (profileError) throw profileError;
    if (!profile) throw new Error('Profile not found');

    // Get the agent role
    const { data: agentRole, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', 'agent')
      .single();

    if (roleError) throw roleError;
    if (!agentRole) throw new Error('Agent role not found');

    // Assign the agent role
    const { error: assignError } = await supabase
      .from('user_roles')
      .insert({
        user_id: profile.id,
        role_id: agentRole.id,
      });

    if (assignError) throw assignError;

    console.log('Successfully assigned agent role to your user');

  } catch (error) {
    console.error('Error:', error);
  }
}

assignAgentRole(); 
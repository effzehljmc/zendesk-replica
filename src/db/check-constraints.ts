import { supabase } from '@/lib/supabase';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

async function main() {
  try {
    // First, check existing constraints
    const { data: constraints, error: checkError } = await supabase
      .rpc('exec', {
        query: `
          SELECT * FROM information_schema.table_constraints 
          WHERE table_name = 'tickets' AND table_schema = 'public';
        `
      });

    if (checkError) {
      throw checkError;
    }

    console.log('Current constraints:', constraints);

    // Apply the constraints if they don't exist
    const { error: alterError } = await supabase
      .rpc('exec', {
        query: `
          -- Drop existing constraints if any
          ALTER TABLE IF EXISTS public.tickets 
          DROP CONSTRAINT IF EXISTS fk_tickets_customer,
          DROP CONSTRAINT IF EXISTS fk_tickets_assigned_to;

          -- Add foreign key constraints
          ALTER TABLE public.tickets 
          ADD CONSTRAINT fk_tickets_customer 
          FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

          ALTER TABLE public.tickets 
          ADD CONSTRAINT fk_tickets_assigned_to 
          FOREIGN KEY (assigned_to_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
        `
      });

    if (alterError) {
      throw alterError;
    }

    console.log('Constraints applied successfully');

    // Verify the constraints were added
    const { data: newConstraints, error: verifyError } = await supabase
      .rpc('exec', {
        query: `
          SELECT * FROM information_schema.table_constraints 
          WHERE table_name = 'tickets' AND table_schema = 'public';
        `
      });

    if (verifyError) {
      throw verifyError;
    }

    console.log('Updated constraints:', newConstraints);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main(); 
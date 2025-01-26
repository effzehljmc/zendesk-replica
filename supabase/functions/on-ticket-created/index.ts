// @deno-types="https://deno.land/x/types/deno.ns.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { generateEmbedding } from '../_shared/openai.ts'
import { matchKBArticles, storeAISuggestion } from '../_shared/kb.ts'

interface Ticket {
  id: string
  title: string
  description: string
  status: string
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyTicket(supabaseClient: any, ticketId: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabaseClient
        .from('tickets')
        .select('id, title, description, status')
        .eq('id', ticketId)
        .single();

      if (error) throw error;
      if (data) return data;

      // If no data but no error, wait and retry
      console.log(`Attempt ${i + 1}: Ticket not found, waiting before retry...`);
      await sleep(1000); // Wait 1 second between retries
    } catch (error) {
      if (i === retries - 1) throw error;
      console.error(`Attempt ${i + 1} failed:`, error);
      await sleep(1000);
    }
  }
  throw new Error(`Ticket not found after ${retries} attempts`);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Received request:', req.url);
    console.log('Environment variables check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasOpenAIKey: !!Deno.env.get('OPENAI_API_KEY')
    });
    
    const ticket = (await req.json()) as Ticket
    console.log('Processing ticket:', JSON.stringify(ticket, null, 2));

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('Supabase client created, checking ticket:', ticket.id);

    // Verify ticket with retries
    const ticketData = await verifyTicket(supabaseClient, ticket.id);
    console.log('Ticket found:', JSON.stringify(ticketData, null, 2));

    try {
      const { data: embedding, error: embeddingError } = await generateEmbedding(ticket.title + ' ' + ticket.description)
      if (embeddingError) {
        console.error('Error generating embedding:', embeddingError);
        throw embeddingError;
      }
      console.log('Generated embedding successfully');

      const { data: matches, error: matchError } = await matchKBArticles(supabaseClient, embedding)
      if (matchError) {
        console.error('Error matching KB articles:', matchError);
        throw matchError;
      }
      console.log('Matched KB articles:', matches);

      if (matches && matches.length > 0) {
        // Update queue status before storing suggestion
        const { error: queueError } = await supabaseClient
          .from('ai_suggestion_queue')
          .update({ status: 'processing' })
          .eq('ticket_id', ticket.id)
          .is('processed_at', null)

        if (queueError) {
          console.error('Error updating queue:', queueError);
          throw queueError;
        }

        const { error: suggestionError } = await storeAISuggestion(supabaseClient, ticket.id, matches[0])
        if (suggestionError) {
          console.error('Error storing AI suggestion:', suggestionError);
          throw suggestionError;
        }

        // Mark as processed
        await supabaseClient
          .from('ai_suggestion_queue')
          .update({ 
            status: 'completed',
            processed_at: new Date().toISOString()
          })
          .eq('ticket_id', ticket.id)
          .is('processed_at', null)

        console.log('Stored AI suggestion successfully');
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (error) {
      // Mark as failed in queue
      await supabaseClient
        .from('ai_suggestion_queue')
        .update({ 
          status: 'failed',
          processed_at: new Date().toISOString()
        })
        .eq('ticket_id', ticket.id)
        .is('processed_at', null)

      console.error('Error in main try block:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error in outer try block:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
}) 
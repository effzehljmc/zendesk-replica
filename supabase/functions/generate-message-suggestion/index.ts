import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.1.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestBody {
  ticket_id: string
  message_id: string
  suggestion_id: string
  system_user_id: string
}

// Add retry helper
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        console.log(`Attempt ${attempt}/${maxAttempts} to find suggestion...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
      return await operation()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`, error)
    }
  }
  throw new Error('Should not reach here')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const startTime = new Date().toISOString()
    const requestBody = await req.clone().json()
    console.log('Received request at', startTime, ':', requestBody)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found')
    }

    const { ticket_id, message_id, suggestion_id, system_user_id }: RequestBody = await req.json()

    // Single quick check for the suggestion
    const { data: suggestion, error: suggestionError } = await supabaseClient
        .from('ai_suggestions')
        .select('id, status, suggested_response, metadata')
        .eq('id', suggestion_id)
      .single()
      
    if (suggestionError || !suggestion) {
      console.error('Error finding suggestion:', suggestionError)
      throw new Error(`Cannot find suggestion with ID ${suggestion_id}`)
    }

    if (suggestion.status !== 'pending' || suggestion.suggested_response !== 'Processing...') {
      console.error('Suggestion in unexpected state:', suggestion)
      throw new Error(`Suggestion ${suggestion_id} is not in expected state`)
    }

    // Get ticket details and message history
    const { data: ticket, error: ticketError } = await supabaseClient
      .from('tickets')
      .select('*, messages:ticket_messages(*)')
      .eq('id', ticket_id)
      .single()

    if (ticketError) {
      console.error('Error fetching ticket:', ticketError)
      throw ticketError
    }

    // Format message history for context
    const messageHistory = ticket.messages
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map((msg) => `${msg.is_ai_generated ? 'Agent' : 'Customer'}: ${msg.content}`)
      .join('\n')

    // Generate AI suggestion
    const prompt = `You are a helpful customer service agent. Based on the ticket information and message history below, suggest a helpful response to the customer's latest message.

Ticket Title: ${ticket.title}
Ticket Description: ${ticket.description}

Message History:
${messageHistory}

Provide a concise, professional, and helpful response that addresses the customer's needs.`

    console.log('Sending request to OpenAI')
    
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 150,
      }),
    })

    const response = await completion.json()
    if (!response.choices?.[0]?.message?.content) {
      throw new Error('Invalid response from OpenAI')
    }

    const suggestedResponse = response.choices[0].message.content.trim()

    // Log the current state before update
    const { data: currentState } = await supabaseClient
      .from('ai_suggestions')
      .select('*')
      .eq('id', suggestion_id)
      .single()
    
    console.log('Current suggestion state before update:', currentState)

    // Update the suggestion with the generated response - only check ID
    const { data: updateResult, error: updateError } = await supabaseClient
      .from('ai_suggestions')
      .update({
        suggested_response: suggestedResponse,
        status: 'completed',
        confidence_score: 0.9,
        metadata: {
          ...suggestion.metadata,
          completion_time: new Date().toISOString(),
          model: 'gpt-3.5-turbo'
        }
      })
      .eq('id', suggestion_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating suggestion:', updateError)
      throw updateError
    }

    console.log('Successfully updated suggestion:', updateResult)

    return new Response(
      JSON.stringify({ success: true, data: updateResult }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in edge function:', error)
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
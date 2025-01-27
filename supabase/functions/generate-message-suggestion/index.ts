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
  system_user_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log request
    console.log('Received request:', await req.clone().json())

    // Log environment variables (without exposing sensitive values)
    console.log('Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasOpenAIKey: !!Deno.env.get('OPENAI_API_KEY')
    })

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Switch to direct fetch like generate-response
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found')
    }

    const { ticket_id, message_id, system_user_id }: RequestBody = await req.json()

    console.log('Processing message:', { ticket_id, message_id, system_user_id })

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

    console.log('Retrieved ticket:', { 
      id: ticket.id, 
      messageCount: ticket.messages?.length 
    })

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
    
    // Use direct fetch like generate-response
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'system', content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      }),
    })

    const response = await completion.json()
    console.log('OpenAI response received')

    const suggestedResponse = response.choices[0].message?.content

    if (!suggestedResponse) {
      console.error('No suggestion in response:', response)
      throw new Error('No suggestion generated')
    }

    // Store the suggestion
    const { data: suggestion, error: suggestionError } = await supabaseClient
      .from('ai_suggestions')
      .insert({
        ticket_id,
        suggested_response: suggestedResponse,
        confidence_score: 0.9,
        system_user_id,
        metadata: {
          message_id,
          model: 'gpt-4',
          prompt,
        },
      })
      .select()
      .single()

    if (suggestionError) {
      console.error('Error storing suggestion:', suggestionError)
      throw suggestionError
    }

    console.log('Suggestion stored successfully:', suggestion.id)

    return new Response(JSON.stringify(suggestion), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Function error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
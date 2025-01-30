import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai'
import { Langfuse, observeOpenAI } from 'https://esm.sh/langfuse'

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

// Initialize LangFuse client
console.error('Initializing Langfuse with:', {
  baseUrl: Deno.env.get('LANGFUSE_HOST'),
  hasSecretKey: !!Deno.env.get('LANGFUSE_SECRET_KEY'),
  hasPublicKey: !!Deno.env.get('LANGFUSE_PUBLIC_KEY')
});

const langfuse = new Langfuse({
  secretKey: Deno.env.get('LANGFUSE_SECRET_KEY') ?? '',
  publicKey: Deno.env.get('LANGFUSE_PUBLIC_KEY') ?? '',
  baseUrl: Deno.env.get('LANGFUSE_HOST'),
});

// Add retry helper
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        console.error(`Attempt ${attempt}/${maxAttempts} to find suggestion...`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
      }
      return await operation()
    } catch (error) {
      if (attempt === maxAttempts) throw error
      console.error(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`, error)
    }
  }
  throw new Error('Should not reach here')
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  let trace;
  try {
    const startTime = new Date().toISOString()
    const requestBody = await req.clone().json()
    console.log('Received request at', startTime, ':', requestBody)

    // Get ticket details first to include in trace
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: ticket } = await supabaseClient
      .from('tickets')
      .select(`
        *,
        messages:ticket_messages(
          id,
          content,
          is_ai_generated,
          created_at
        )
      `)
      .eq('id', requestBody.ticket_id)
      .single();

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    // Get the triggering message
    const triggerMessage = ticket.messages.find(m => m.id === requestBody.message_id);
    if (!triggerMessage) {
      throw new Error('Trigger message not found');
    }

    // Start a new trace for this suggestion generation
    trace = langfuse.trace({
      name: 'generate-message-suggestion',
      id: requestBody.suggestion_id,
      input: {
        ticket_context: {
          id: ticket.id,
          title: ticket.title,
          description: ticket.description,
          priority: ticket.priority,
          customer_message: triggerMessage.content,
          conversation_history: ticket.messages
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map(msg => ({
              content: msg.content,
              is_ai_generated: msg.is_ai_generated,
              created_at: msg.created_at,
              type: msg.is_ai_generated ? 'agent' : 'customer'
            }))
        },
        system_user_id: requestBody.system_user_id
      }
    });

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not found')
    }

    const { ticket_id, message_id, suggestion_id, system_user_id }: RequestBody = await req.json()

    // Single quick check for the suggestion
    const suggestionSpan = trace.span({ 
      name: 'check-suggestion',
      input: { suggestion_id }
    });
    const { data: suggestion, error: suggestionError } = await supabaseClient
      .from('ai_suggestions')
      .select('id, status, suggested_response, metadata')
      .eq('id', suggestion_id)
      .single()
    
    if (suggestionError || !suggestion) {
      suggestionSpan.update({ 
        status: 'error',
        metadata: { error: suggestionError }
      });
      console.error('Error finding suggestion:', suggestionError)
      throw new Error(`Cannot find suggestion with ID ${suggestion_id}`)
    }
    suggestionSpan.update({ status: 'success' });

    if (suggestion.status !== 'pending' || suggestion.suggested_response !== 'Processing...') {
      console.error('Suggestion in unexpected state:', suggestion)
      throw new Error(`Suggestion ${suggestion_id} is not in expected state`)
    }

    // Get ticket details and message history
    const ticketSpan = trace.span({ 
      name: 'fetch-ticket-data',
      input: { ticket_id }
    });
    // We already have ticket data from earlier, no need to fetch again
    ticketSpan.update({ status: 'success' });

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

    console.log('Sending request to OpenAI with prompt:', prompt)
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: openaiApiKey
    });
    
    // Create a generation span for the OpenAI call
    const generationSpan = trace.span({ 
      name: 'openai-generation',
      input: {
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        max_tokens: 150
      }
    });
    
    // Wrap OpenAI client with Langfuse
    const trackedOpenAI = observeOpenAI(openai, {
      parent: generationSpan, // Link to generation span instead of trace
      generationName: 'customer-service-response'
    });

    console.log('Making OpenAI request...');
    const startGeneration = new Date().getTime();
    const completion = await trackedOpenAI.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 150,
    });
    const endGeneration = new Date().getTime();
    const generationTime = endGeneration - startGeneration;
    console.log('OpenAI response received:', completion.choices[0]?.message);

    if (!completion.choices?.[0]?.message?.content) {
      console.error('Invalid response from OpenAI:', completion);
      generationSpan.update({ 
        status: 'error',
        output: { error: 'Invalid response from OpenAI' }
      });
      throw new Error('Invalid response from OpenAI')
    }

    const suggestedResponse = completion.choices[0].message.content.trim()
    console.log('Processed response:', suggestedResponse);

    // Update the generation span with the output
    generationSpan.update({
      status: 'success',
      output: { 
        response: suggestedResponse,
        usage: completion.usage,
        model: completion.model,
        finish_reason: completion.choices[0].finish_reason
      }
    });

    // Make sure to flush events before function ends
    console.log('Flushing Langfuse events with trace ID:', trace.id);
    await langfuse.flushAsync();
    console.log('Langfuse events flushed successfully');

    // Update the suggestion with the generated response
    console.log('Updating suggestion in database...');
    const updateSpan = trace.span({ name: 'update-suggestion' });
    const { data: updateResult, error: updateError } = await supabaseClient
      .from('ai_suggestions')
      .update({
        suggested_response: suggestedResponse,
        status: 'completed',
        confidence_score: 0.9,
        metadata: {
          ...suggestion.metadata,
          completion_time: new Date().toISOString(),
          model: 'gpt-3.5-turbo',
          trace_id: trace.id // Store the trace ID for later reference
        }
      })
      .eq('id', suggestion_id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating suggestion:', updateError);
      updateSpan.update({ 
        status: 'error',
        metadata: { error: updateError }
      });
      throw updateError
    }
    console.log('Suggestion updated successfully:', updateResult);

    const endTime = new Date().toISOString();
    const responseTime = new Date(endTime).getTime() - new Date(startTime).getTime();

    // Update the trace with final status
    trace.update({
      output: {
        suggestion: {
          id: suggestion_id,
          content: suggestedResponse,
          generation_details: {
            model: completion.model,
            prompt: prompt,
            settings: {
              temperature: 0.7,
              max_tokens: 150,
              model: 'gpt-3.5-turbo'
            }
          },
          performance_metrics: {
            response_time_ms: generationTime,
            tokens_used: completion.usage,
            confidence_score: 0.9,
            total_processing_time_ms: responseTime // Total time including DB operations
          }
        },
        knowledge_base: {
          articles_used: [], // To be implemented when KB search is added
          search_time_ms: 0  // To be implemented when KB search is added
        },
        error_tracking: {
          has_errors: false,
          error_type: null,
          error_details: null,
          retry_count: 0
        }
      },
      metadata: {
        completion_time: new Date().toISOString(),
        trace_id: trace.id,
        environment: Deno.env.get('ENVIRONMENT') ?? 'development'
      }
    });

    return new Response(
      JSON.stringify({ success: true, data: updateResult }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in edge function:', error)
    // If we have an active trace, update it with the error
    if (trace) {
      trace.update({
        status: 'error',
        output: {
          error_tracking: {
            has_errors: true,
            error_type: error.name || 'UnknownError',
            error_details: error.message,
            retry_count: 0, // Implement retry counting if needed
            stack_trace: error.stack
          }
        },
        metadata: { 
          error: error.message,
          completion_time: new Date().toISOString()
        }
      });
    }
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
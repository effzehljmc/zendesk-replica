import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import OpenAI from "https://esm.sh/openai@4";
import { Langfuse, observeOpenAI } from "https://esm.sh/langfuse";

console.log('Edge Function: evaluate-priority starting up');

// Initialize Langfuse
const langfuse = new Langfuse({
  publicKey: Deno.env.get("LANGFUSE_PUBLIC_KEY") ?? "",
  secretKey: Deno.env.get("LANGFUSE_SECRET_KEY") ?? "",
  baseUrl: "https://us.cloud.langfuse.com"
});

// Log configuration
console.log('Configuration:', {
  hasSupabaseUrl: !!Deno.env.get("SUPABASE_URL"),
  hasServiceRole: !!Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
  hasOpenAIKey: !!Deno.env.get("OPENAI_API_KEY"),
  hasLangfuseKeys: {
    public: !!Deno.env.get("LANGFUSE_PUBLIC_KEY"),
    secret: !!Deno.env.get("LANGFUSE_SECRET_KEY"),
    host: !!Deno.env.get("LANGFUSE_HOST"),
  }
});

serve(async (req) => {
  let trace;
  let parsedBody;
  
  console.log('Received request:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS
  if (req.method === "OPTIONS") {
    console.log('Handling OPTIONS request');
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    parsedBody = await req.json();
    console.log('Request body:', parsedBody);

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!parsedBody.ticket_id || !uuidRegex.test(parsedBody.ticket_id)) {
      console.error('Invalid ticket_id format:', parsedBody.ticket_id);
      throw new Error("ticket_id must be a valid UUID");
    }

    // Initialize Supabase client with service role key
    console.log('Initializing Supabase client...');
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Start Langfuse trace
    trace = langfuse.trace({
      name: "evaluate-priority",
      id: parsedBody.ticket_id,
      input: {
        ticket_id: parsedBody.ticket_id,
        title: parsedBody.title,
        description: parsedBody.description
      }
    });

    console.log('Fetching ticket details...');
    // Fetch ticket details
    const { data: ticket, error: ticketError } = await supabaseClient
      .from("tickets")
      .select("id, title, description")
      .eq("id", parsedBody.ticket_id)
      .single();

    if (ticketError) {
      console.error('Error fetching ticket:', {
        error: ticketError,
        details: {
          message: ticketError.message,
          code: ticketError.code,
          hint: ticketError.hint,
          details: ticketError.details
        }
      });
      throw new Error(`Ticket not found or Supabase error: ${ticketError.message}`);
    }

    console.log('Ticket found:', ticket);

    // Get system user for AI
    console.log('Getting system user...');
    const { data: systemUser, error: systemUserError } = await supabaseClient
      .from("profiles")
      .select("id")
      .eq("email", "ai-system@internal.zendesk-replica.com")
      .single();

    if (systemUserError) {
      console.error('Error getting system user:', {
        error: systemUserError,
        details: {
          message: systemUserError.message,
          code: systemUserError.code,
          hint: systemUserError.hint,
          details: systemUserError.details
        }
      });
      throw new Error(`System user not found: ${systemUserError.message}`);
    }

    if (!systemUser) {
      console.error('System user not found for email: ai-system@internal.zendesk-replica.com');
      throw new Error("System user not found");
    }

    console.log('System user found:', systemUser);

    // Create initial priority suggestion record
    console.log('Creating initial priority suggestion...');
    const { data: suggestion, error: suggestionError } = await supabaseClient
      .from("priority_suggestions")
      .insert({
        ticket_id: parsedBody.ticket_id,
        suggested_priority: "medium", // Default
        confidence_score: 0,
        system_user_id: systemUser.id,
        status: "pending",
        metadata: {
          title: ticket.title,
          description: ticket.description,
        },
      })
      .select()
      .single();

    if (suggestionError) {
      console.error('Error creating priority suggestion:', {
        error: suggestionError,
        details: {
          message: suggestionError.message,
          code: suggestionError.code,
          hint: suggestionError.hint,
          details: suggestionError.details
        }
      });
      throw new Error(`Failed to create priority suggestion: ${suggestionError.message}`);
    }

    console.log('Priority suggestion created:', suggestion);

    // Create OpenAI completion
    console.log('Calling OpenAI...');
    const generationSpan = trace.span({
      name: "openai-priority-generation",
      input: {
        model: "gpt-4",
        temperature: 0.3,
        max_tokens: 10
      }
    });
    
    // Initialize OpenAI with observeOpenAI wrapper
    const openai = observeOpenAI(
      new OpenAI({
        apiKey: Deno.env.get("OPENAI_API_KEY") ?? "",
      }),
      { parent: generationSpan }
    );

    const prompt = `You are a helpdesk AI assistant. Based on the following ticket information, determine the priority level (low, medium, or high).
    
Title: ${ticket.title}
Description: ${ticket.description}

Consider the following criteria:
- High priority: Critical system issues, security concerns, or business-blocking problems
- Medium priority: Important issues that affect work but have workarounds
- Low priority: Minor issues, cosmetic problems, or feature requests

Return only one word in lowercase: "low", "medium", or "high"`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 10,
    });

    console.log('OpenAI response:', aiResponse);

    const suggestedPriority = aiResponse.choices[0]?.message?.content?.trim().toLowerCase() || "medium";
    const confidenceScore = aiResponse.choices[0]?.message?.content ? 0.9 : 0.5;

    // Update suggestion with AI response
    console.log('Updating priority suggestion...');
    const { error: updateError } = await supabaseClient
      .from("priority_suggestions")
      .update({
        suggested_priority: suggestedPriority,
        confidence_score: confidenceScore,
        status: "completed",
        metadata: {
          ...suggestion.metadata,
          model: "gpt-4",
          prompt,
          completion: aiResponse,
        },
      })
      .eq("id", suggestion.id);

    if (updateError) {
      console.error('Error updating priority suggestion:', {
        error: updateError,
        details: {
          message: updateError.message,
          code: updateError.code,
          hint: updateError.hint,
          details: updateError.details
        }
      });
      throw new Error(`Failed to update priority suggestion: ${updateError.message}`);
    }

    // Update ticket priority
    console.log('Updating ticket priority...');
    const { error: ticketUpdateError } = await supabaseClient
      .from("tickets")
      .update({ priority: suggestedPriority })
      .eq("id", parsedBody.ticket_id);

    if (ticketUpdateError) {
      console.error('Error updating ticket priority:', {
        error: ticketUpdateError,
        details: {
          message: ticketUpdateError.message,
          code: ticketUpdateError.code,
          hint: ticketUpdateError.hint,
          details: ticketUpdateError.details
        }
      });
      throw new Error(`Failed to update ticket priority: ${ticketUpdateError.message}`);
    }

    // End trace
    trace.update({
      output: {
        suggestedPriority,
        confidenceScore,
        ticket_id: parsedBody.ticket_id,
        suggestion_id: suggestion.id
      },
      status: "COMPLETED"
    });

    // Make sure to flush events before sending response
    console.log('Final Langfuse flush before response');
    await langfuse.flushAsync();
    console.log('Flush completed successfully');

    console.log('Successfully completed priority evaluation');

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        suggestion_id: suggestion.id,
        suggested_priority: suggestedPriority,
        confidence_score: confidenceScore,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in evaluate-priority:', {
      error,
      stack: error.stack,
      details: {
        message: error.message,
        code: error.code,
        hint: error.hint,
        details: error.details
      }
    });

    // If we have a trace, update its status
    if (trace) {
      trace.update({
        status: "ERROR",
        output: { 
          error: String(error),
          ticket_id: parsedBody?.ticket_id || 'unknown',
          stack: error.stack
        }
      });

      // Make sure to flush events before sending error response
      console.log('Final Langfuse flush before error response');
      await langfuse.flushAsync();
      console.log('Flush completed successfully (error path)');
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: String(error),
        details: {
          message: error.message,
          code: error.code,
          hint: error.hint,
          details: error.details
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: error.message?.includes("UUID") ? 400 : 500,
      }
    );
  }
}); 

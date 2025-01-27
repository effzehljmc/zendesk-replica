import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface RequestBody {
  ticket: {
    id: string
    title: string
    description: string
  }
}

interface KBArticle {
  id: string
  title: string
  content: string
  similarity: number
}

interface ResponseBody {
  suggestedResponse: string
  confidenceScore: number
  metadata: {
    usedArticles: string[]
    model: string
    temperature: number
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Log environment variables (without exposing sensitive values)
    console.log('Environment check:', {
      hasSupabaseUrl: !!Deno.env.get('SUPABASE_URL'),
      hasServiceRoleKey: !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'),
      hasOpenAIKey: !!Deno.env.get('OPENAI_API_KEY')
    })

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Parse request body
    const { ticket } = await req.json() as RequestBody

    // System user ID (AI Assistant)
    const systemUserId = '2c47e898-947a-46df-96bf-5d537207fb39'

    // Get relevant articles using match_kb_articles
    const { data: articles, error: matchError } = await supabaseClient
      .rpc('match_kb_articles', {
        query_text: `${ticket.title}\n${ticket.description}`,
        match_threshold: 0.5,
        match_count: 3,
        service_role_key: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      }) as { data: KBArticle[], error: any }

    console.log('Match result:', {
      hasError: !!matchError,
      errorMessage: matchError?.message,
      articleCount: articles?.length ?? 0
    })

    if (matchError) {
      throw new Error(`Error matching KB articles: ${matchError.message}`)
    }

    // Build context from relevant articles
    const articleContext = (articles || [])
      .map(article => `Article: ${article.title}\nContent: ${article.content}\nRelevance: ${(article.similarity * 100).toFixed(1)}%`)
      .join('\n\n')

    // Build prompt
    const prompt = `You are a helpful customer support agent. Using the provided knowledge base articles as context, generate a professional and helpful response to the customer's ticket.

Ticket Title: ${ticket.title}
Ticket Description: ${ticket.description}

Relevant Knowledge Base Articles:
${articleContext}

Generate a response that:
1. Is professional and empathetic
2. Directly addresses the customer's issue
3. Incorporates relevant information from the knowledge base articles
4. Provides clear next steps or solutions

Response:`

    // Generate response using GPT-4
    const completion = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful customer support agent. Provide clear, concise, and accurate responses.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    })

    const response = await completion.json()
    const suggestedResponse = response.choices[0]?.message?.content || ''
    const confidenceScore = calculateConfidence(articles || [])

    // Store the suggestion
    const { error: suggestionError } = await supabaseClient
      .from('ai_suggestions')
      .insert({
        ticket_id: ticket.id,
        suggested_response: suggestedResponse,
        confidence_score: confidenceScore,
        system_user_id: systemUserId,
        metadata: {
          usedArticles: (articles || []).map(a => a.id),
          model: 'gpt-4',
          temperature: 0.7
        }
      })

    if (suggestionError) {
      throw new Error(`Error storing suggestion: ${suggestionError.message}`)
    }

    // Return the response
    const responseBody: ResponseBody = {
      suggestedResponse,
      confidenceScore,
      metadata: {
        usedArticles: (articles || []).map(a => a.id),
        model: 'gpt-4',
        temperature: 0.7
      }
    }

    return new Response(JSON.stringify(responseBody), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

// Helper function to calculate confidence based on article similarities
function calculateConfidence(articles: KBArticle[]): number {
  if (!articles.length) return 0
  
  // Average similarity of matched articles
  const avgSimilarity = articles.reduce((sum, article) => sum + article.similarity, 0) / articles.length
  
  // Scale to a 0-1 range where:
  // - 0.5 similarity = 0.6 confidence
  // - 0.7 similarity = 0.8 confidence
  // - 0.9 similarity = 1.0 confidence
  return Math.min(1, avgSimilarity * 1.2)
}

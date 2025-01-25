import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { Configuration, OpenAIApi } from 'https://esm.sh/openai@3.2.1'

interface RequestBody {
  ticket: {
    title: string
    description: string
  }
  relevantArticles: Array<{
    title: string
    content: string
    similarity: number
  }>
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
    const openai = new OpenAIApi(
      new Configuration({
        apiKey: Deno.env.get('OPENAI_API_KEY')
      })
    )

    // Parse request body
    const { ticket, relevantArticles } = await req.json() as RequestBody

    // Build context from relevant articles
    const articleContext = relevantArticles
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
    const completion = await openai.createChatCompletion({
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

    const response: ResponseBody = {
      suggestedResponse: completion.data.choices[0].message?.content || '',
      confidenceScore: calculateConfidence(relevantArticles),
      metadata: {
        usedArticles: relevantArticles.map(a => a.title),
        model: 'gpt-4',
        temperature: 0.7
      }
    }

    return new Response(
      JSON.stringify(response),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
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
function calculateConfidence(articles: Array<{ similarity: number }>): number {
  if (articles.length === 0) return 0.3 // Base confidence for no articles
  
  // Average of top 3 article similarities, weighted more towards higher similarities
  const topSimilarities = articles
    .map(a => a.similarity)
    .sort((a, b) => b - a)
    .slice(0, 3)
  
  const weights = [0.5, 0.3, 0.2] // Weights for 1st, 2nd, and 3rd most similar articles
  const weightedSum = topSimilarities.reduce((sum, sim, i) => sum + sim * (weights[i] || 0), 0)
  
  // Scale the final confidence between 0.3 and 0.95
  return 0.3 + (weightedSum * 0.65)
}

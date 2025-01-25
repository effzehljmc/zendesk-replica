import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  text: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { text } = (await req.json()) as RequestBody

    if (!text) {
      throw new Error('Missing text parameter')
    }

    // Clean and truncate text
    const cleanedText = text.trim().replace(/\n+/g, ' ').slice(0, 8000)

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: cleanedText
      })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }))
      throw new Error(`OpenAI API error: ${error.error?.message || response.statusText}`)
    }

    const result = await response.json()
    const embedding = result.data?.[0]?.embedding

    if (!embedding) {
      throw new Error('Invalid response format from OpenAI API')
    }

    return new Response(
      JSON.stringify({ embedding }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})

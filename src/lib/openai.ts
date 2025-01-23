export async function getEmbedding(text: string): Promise<number[]> {
  // Clean and truncate text if needed
  const cleanedText = text.trim().replace(/\n+/g, ' ').slice(0, 8000);
  
  console.log('Getting embedding for text:', {
    length: cleanedText.length,
    preview: cleanedText.slice(0, 100)
  });
  
  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: cleanedText
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
      console.error('OpenAI API error:', error);
      throw new Error(`Failed to generate embedding: ${error.error?.message || response.statusText}`);
    }

    const result = await response.json();
    if (!result.data?.[0]?.embedding) {
      throw new Error('Invalid response format from OpenAI API');
    }

    return result.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
} 
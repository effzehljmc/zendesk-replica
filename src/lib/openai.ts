export async function getEmbedding(text: string): Promise<number[]> {
  console.log('Getting embedding for text:', {
    length: text.length,
    preview: text.slice(0, 100)
  });
  
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      input: text,
      model: "text-embedding-3-small",
      encoding_format: "float"
    })
  });

  if (!response.ok) {
    const error = await response.json();
    console.error('OpenAI API error:', error);
    throw new Error('Failed to generate embedding');
  }

  const { data } = await response.json();
  return data[0].embedding;
} 
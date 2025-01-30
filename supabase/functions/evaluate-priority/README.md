# Evaluate Priority Edge Function

This edge function evaluates the priority of a newly created ticket using GPT-4 and stores the result in both the `priority_suggestions` table and updates the ticket's priority field.

## Features

- Uses GPT-4 to evaluate ticket priority (low, medium, high)
- Stores suggestions in a dedicated `priority_suggestions` table
- Tracks metrics using Langfuse:
  1. Speed of response (time to completion)
  2. Confidence score of the AI's decision

## Usage

```typescript
const response = await supabaseClient.functions.invoke('evaluate-priority', {
  body: { ticket_id: 'your-ticket-id' }
});
```

## Response Format

Success response:
```json
{
  "success": true,
  "suggestion_id": "uuid",
  "suggested_priority": "low|medium|high",
  "confidence_score": 0.9,
  "time_ms": 1234
}
```

Error response:
```json
{
  "success": false,
  "error": "Error message"
}
```

## Environment Variables Required

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for Supabase
- `OPENAI_API_KEY`: OpenAI API key
- `LANGFUSE_PUBLIC_KEY`: Langfuse public key
- `LANGFUSE_SECRET_KEY`: Langfuse secret key
- `LANGFUSE_HOST`: Langfuse host URL (optional, defaults to cloud.langfuse.com)

## Metrics Tracked

1. **Speed of Response**: Time taken from request start to completion
2. **Confidence Score**: AI's confidence in the priority assignment (0.9 for direct matches, 0.5 for fallback cases)

## Error Handling

- If the edge function fails, it logs the error to Langfuse
- The function defaults to "medium" priority if there's an error
- All errors are properly logged with stack traces 
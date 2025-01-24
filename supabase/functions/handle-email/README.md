# Email Handler Edge Function

This Edge Function handles sending emails using Resend.com as the email provider.

## Setup

1. Create a Resend account at https://resend.com
2. Add and verify your domain in Resend's dashboard
3. Get your API key from Resend's dashboard
4. Add the API key to your Supabase project:
   ```bash
   supabase secrets set RESEND_API_KEY=re_xxxx...
   ```
5. Update the `from` email address in `index.ts` to match your verified domain

## Usage

Send a POST request to the function endpoint with:

```json
{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "html": "<p>Hello from your support system!</p>"
}
```

## Development

1. Install Supabase CLI
2. Run locally:
   ```bash
   supabase start
   supabase functions serve handle-email --env-file .env.local
   ``` 
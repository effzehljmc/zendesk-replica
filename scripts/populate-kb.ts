import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { Database } from '../src/types/supabase';
import OpenAI from 'openai';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const openaiKey = process.env.VITE_OPENAI_API_KEY;
const systemUserId = process.env.VITE_SYSTEM_USER_ID;

if (!supabaseUrl || !supabaseKey || !openaiKey || !systemUserId) {
  throw new Error('Missing required environment variables');
}

// Initialize Supabase client with service role key
const supabase = createClient<Database>(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: openaiKey
});

// Generate embedding for text
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
    encoding_format: "float",
  });

  return response.data[0].embedding;
}

// Create KB article with embedding
async function createKBArticle(input: { title: string; content: string; is_public: boolean }) {
  const embedding = await generateEmbedding(`${input.title}\n\n${input.content}`);

  const { data, error } = await supabase
    .from('kb_articles')
    .insert([{ 
      ...input, 
      embedding,
      author_id: systemUserId
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
}

const initialArticles = [
  {
    title: "How to Reset Your Password",
    content: `
Follow these steps to reset your password:
1. Click on the "Forgot Password" link on the login page
2. Enter your email address
3. Check your email for a reset link
4. Click the link and enter your new password
5. Log in with your new password

Note: Reset links expire after 24 hours for security reasons.
    `,
    is_public: true
  },
  {
    title: "Common Billing Issues and Solutions",
    content: `
Here are solutions to common billing problems:

1. Payment Declined
- Verify card details are correct
- Ensure sufficient funds
- Check if card hasn't expired
- Contact your bank for authorization

2. Missing Invoice
- Check spam folder
- Verify email address is correct
- Request invoice resend from billing portal

3. Subscription Issues
- Confirm subscription status in account settings
- Check payment method validity
- Review billing cycle dates
    `,
    is_public: true
  },
  {
    title: "Getting Started Guide",
    content: `
Welcome to our platform! Here's how to get started:

1. Account Setup
- Complete your profile
- Set notification preferences
- Add team members (if applicable)

2. Key Features
- Dashboard overview
- Creating your first project
- Setting up integrations
- Customizing workspace

3. Best Practices
- Regular backups
- Security settings
- Team collaboration tips
    `,
    is_public: true
  },
  {
    title: "Troubleshooting Guide: Common Issues",
    content: `
Resolve common technical issues:

1. Connection Problems
- Check internet connection
- Clear browser cache
- Try incognito mode
- Verify server status

2. Performance Issues
- Close unused tabs
- Clear temporary files
- Update browser
- Check system resources

3. Login Problems
- Reset browser cookies
- Try password reset
- Contact support if persistent
    `,
    is_public: true
  }
];

async function populateKB() {
  console.log('Starting KB population...');
  
  for (const article of initialArticles) {
    try {
      const created = await createKBArticle(article);
      console.log(`Created article: ${created.title}`);
    } catch (error) {
      console.error(`Failed to create article "${article.title}":`, error);
    }
  }
  
  console.log('KB population completed!');
}

// Run the population
populateKB().catch(console.error); 
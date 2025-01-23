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
  },
  {
    title: "Using Advanced Search Features",
    content: `Learn how to use our advanced search capabilities:

1. Filters - Use filters to narrow down results by status, date, or category
2. Boolean Operators - Combine terms with AND, OR, NOT
3. Exact Phrases - Use quotes for exact matches ("example phrase")
4. Date Ranges - Search within specific time periods
5. Saved Searches - Save frequently used search queries`,
    is_public: true
  },
  {
    title: "Account Security Best Practices",
    content: `Protect your account with these security measures:

1. Use Strong Passwords - Combine letters, numbers, and symbols
2. Enable Two-Factor Authentication (2FA)
3. Regular Security Audits - Review account activity
4. Secure Password Storage - Use a password manager
5. Session Management - Log out from unused sessions
6. Security Notifications - Enable alerts for suspicious activity`,
    is_public: true
  },
  {
    title: "Mobile App Features Guide",
    content: `Discover key features of our mobile app:

1. Push Notifications - Stay updated on the go
2. Offline Mode - Access essential features without internet
3. Quick Actions - Swipe gestures for common tasks
4. File Attachments - Upload photos and documents
5. Dark Mode - Comfortable viewing in low light
6. Biometric Login - Use fingerprint or face recognition`,
    is_public: true
  },
  {
    title: "Team Collaboration Tips",
    content: `Maximize team productivity with these collaboration features:

1. Shared Views - Create and share custom workspace views
2. Team Inbox - Manage requests collaboratively
3. Internal Notes - Add private team comments
4. Assignment Rules - Automate ticket distribution
5. Team Analytics - Track performance metrics
6. Knowledge Sharing - Build internal documentation`,
    is_public: true
  },
  {
    title: "API Integration Overview",
    content: `Get started with our API integration:

1. Authentication - Obtain and use API keys
2. Rate Limits - Understand usage limits
3. Endpoints - Common API endpoints reference
4. Webhooks - Set up real-time notifications
5. Error Handling - Common errors and solutions
6. Best Practices - Optimization and security tips`,
    is_public: true
  },
  {
    title: "Data Export and Reporting",
    content: `Learn about data export and reporting options:

1. Custom Reports - Build tailored reports
2. Export Formats - CSV, JSON, and PDF options
3. Scheduled Reports - Automate report generation
4. Data Visualization - Charts and dashboards
5. Metrics Tracking - Key performance indicators
6. Data Retention - Understanding data storage policies`,
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
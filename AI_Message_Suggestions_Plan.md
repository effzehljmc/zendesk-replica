# AI Message Suggestions Plan

## Overview
This plan focuses on implementing AI-powered message suggestions for ticket responses. The feature helps agents respond to tickets more efficiently by providing context-aware suggestions based on the ticket's history and content.

## Implementation Status

### Core Features (All Completed)
1. **Database Setup**
   - Created ai_suggestions table with proper schema
   - Set up system user for AI-generated content
   - Configured app_settings for Edge Functions
   - Added feedback storage in ai_suggestions table

2. **Event Processing**
   - Implemented handle_new_ticket() trigger
   - Implemented handle_new_customer_message() trigger
   - Edge Functions deployed and working
   - Fixed duplicate triggers issue

3. **Real-time Updates**
   - Set up Supabase subscriptions
   - Fixed real-time visibility for all user roles
   - Proper order of operations in message acceptance
   - Background data fetching for optimal performance

4. **UI/UX**
   - Display suggestions to agents
   - Accept/reject functionality
   - Proper cleanup after acceptance
   - Feedback collection system

## Technical Implementation

### Database Schema
```sql
CREATE TABLE ai_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id),
  suggested_response TEXT NOT NULL,
  confidence_score REAL NOT NULL,
  system_user_id UUID REFERENCES profiles(id),
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending',
  feedback TEXT,  -- Stores agent feedback on rejected suggestions
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Edge Functions
1. **/generate-response**
   - Status: Deployed
   - Endpoint: https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/generate-response
   - Uses OpenAI GPT-4
   - Average response time: ~9s

2. **/generate-message-suggestion**
   - Status: Deployed
   - Endpoint: https://mcqydqmqundbzniedbcj.supabase.co/functions/v1/generate-message-suggestion
   - Triggered by new customer messages

### Real-time Message Flow
```typescript
// Proper order of operations
const handleAccept = async (suggestionId: string, text: string) => {
  // 1. Create message first and wait for completion
  const message = await createMessage({
    content: text,
    isAIGenerated: true
  });
  
  // 2. Only then mark suggestion as accepted
  await acceptSuggestion(suggestionId);
};

// Real-time subscription with proper error handling
const channel = supabase
  .channel(`ticket_messages:${ticketId}`)
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'ticket_messages',
      filter: `ticket_id=eq.${ticketId}`
    },
    async (payload) => {
      // Update UI immediately with basic data
      if (payload.eventType === 'INSERT') {
        // Transform and show message immediately
        const newMessage = transformMessage({
          ...payload.new,
          profiles: payload.new.profiles || { full_name: null, email: null },
          ticket_message_attachments: []
        });
        
        // Then fetch complete data in background
        const { data } = await fetchCompleteMessage(payload.new.id);
        if (data) {
          // Update with complete data when available
          updateMessage(transformMessage(data));
        }
      }
    }
  )
  .subscribe();
```

### Feedback System
1. **Collection**
   - Stored in `ai_suggestions.feedback` column
   - Captured when agent rejects a suggestion
   - Optional text feedback for improvement

2. **Usage**
   - Helps improve future suggestions
   - Tracks common rejection reasons
   - Identifies areas for model improvement

## Testing Checklist
New ticket triggers suggestion
Customer message triggers suggestion
Real-time updates work for all roles
Suggestion box disappears after acceptance
Messages appear instantly with basic data
Complete data loads in background
Feedback is properly stored
Error handling works as expected

## Next Steps (Optional Enhancements)
1. **Analytics**
   - Add suggestion quality metrics
   - Track acceptance rates
   - Analyze feedback patterns

2. **UI Improvements**
   - Add keyboard shortcuts
   - Enhance feedback UI
   - Add suggestion history view

import { supabase } from './supabase';
import { getEmbedding } from './openai';
import type { Ticket } from '../types/ticket';
import type { KBArticle } from './kb';

export async function onTicketCreated(ticket: Ticket) {
  console.log('🎫 onTicketCreated called with ticket:', {
    id: ticket.id,
    title: ticket.title,
    description: ticket.description,
    status: ticket.status,
    firstResponseAt: ticket.firstResponseAt,
    assignedToId: ticket.assigned_to_id
  });

  // Only proceed if ticket is new/unassigned and has no first response
  if (ticket.status === 'new' && !ticket.assigned_to_id && !ticket.firstResponseAt) {
    console.log('✅ Ticket is new, unassigned, and has no first response - checking for KB matches');
    await checkForKBMatch(ticket);
  } else {
    console.log('❌ Skipping KB check:', { 
      status: ticket.status,
      assigned: !!ticket.assigned_to_id,
      hasFirstResponse: !!ticket.firstResponseAt 
    });
  }
}

async function checkForKBMatch(ticket: Ticket) {
  try {
    console.log('🔍 Starting KB match check for ticket:', ticket.id);
    
    // Generate embedding for ticket content (combining title and description for better context)
    const ticketContent = `${ticket.title}\n\n${ticket.description}`;
    console.log('📝 Generated ticket content for embedding:', ticketContent);
    
    const embedding = await getEmbedding(ticketContent);
    console.log('🧮 Generated embedding successfully');

    // Search for matching KB articles
    console.log('🔎 Searching for KB matches...');
    const { data: matches, error } = await supabase.rpc('match_kb_articles', {
      query_embedding: embedding,
      match_threshold: 0.5,
      match_count: 1
    });

    if (error) {
      console.error('❌ Error finding KB matches:', error);
      return;
    }

    console.log('📊 KB search results:', matches);

    // If we found a good match, create an automated message
    if (matches && matches.length > 0) {
      const bestMatch = matches[0] as KBArticle & { similarity: number };
      console.log('🎯 Found best match:', {
        title: bestMatch.title,
        similarity: bestMatch.similarity
      });
      await createAutomatedKBMessage(ticket.id, bestMatch);
    } else {
      console.log('❌ No matching KB articles found above threshold');
    }
  } catch (error) {
    console.error('❌ Error in checkForKBMatch:', error);
  }
}

async function createAutomatedKBMessage(ticketId: string, kbArticle: KBArticle & { similarity: number }) {
  console.log('💬 Creating automated message for ticket:', ticketId);
  
  const content = `
👋 I found a help article that might solve your problem:

<HelpMessage ticketId="${ticketId}" articleId="${kbArticle.id}" articleTitle="${kbArticle.title}" />
`;

  try {
    const systemUserId = import.meta.env.VITE_SYSTEM_USER_ID;
    console.log('📨 Inserting message with system user:', systemUserId);
    
    const { error } = await supabase
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        content,
        user_id: systemUserId,
        created_at: new Date().toISOString()
      });

    if (error) {
      console.error('❌ Error creating automated message:', error);
    } else {
      console.log('✅ Automated message created successfully');
    }
  } catch (error) {
    console.error('❌ Error in createAutomatedKBMessage:', error);
  }
} 
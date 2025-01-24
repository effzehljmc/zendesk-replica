# Second Step: Automated Article Suggestion After Ticket Creation

This plan outlines how to automatically provide a relevant knowledge base (KB) suggestion after a user’s newly created ticket remains unassigned. If a high similarity is found between the ticket content and a KB article, the system posts an automated message with the recommended article. The user can then mark the issue as solved or request further help.

## 1. Trigger When Ticket is Unassigned
When a ticket is first created or moves into an “unassigned” status, trigger your AI or retrieval-augmented generation (RAG) process:
```typescript
export async function onTicketCreated(ticket) {
  if (ticket.status === 'unassigned') {
    await checkForKBMatch(ticket);
  }
}
```
## 2. Look Up Relevant KB Articles
Use embeddings or text-based searches to compare the ticket’s content with kb_articles:
```typescript
async function checkForKBMatch(ticket) {
  const { data } = await supabase.rpc('match_kb_articles', {
    query_embedding: generateEmbedding(ticket.description),
    match_threshold: 0.85,
    match_count: 1
  });
  if (data && data.length > 0) {
    const bestMatch = data[0];
    await createAutomatedTicketMessage(ticket.id, bestMatch);
  }
}
```
## 3. Create an Automated Ticket Message
If a relevant article is found, post an automated ticket message suggesting the article link and giving the user action buttons:
```typescript
async function createAutomatedTicketMessage(ticketId: string, kbArticle: any) {
  const content = `
We found a potentially helpful article:
[${kbArticle.title}](/kb/${kbArticle.id})

Was this information helpful?
[Yes, This Solved My Problem](#yes-helpful)
[I Still Need Help](#no-help)`;

  await supabase
    .from('ticket_messages')
    .insert([
      {
        ticket_id: ticketId,
        message_type: 'auto_suggestion',
        content
      }
    ]);
}
```
## 4. Handle User Response
Update ticket status based on the user’s button click:
```typescript
async function handleUserResponse(ticketId: string, userResponse: 'yes' | 'no') {
  if (userResponse === 'yes') {
    await supabase
      .from('tickets')
      .update({ status: 'solved' })
      .eq('id', ticketId);
  } else {
    await supabase
      .from('tickets')
      .update({ status: 'open' })
      .eq('id', ticketId);
  }
}
```
## 5. Possible Improvements
• Show more than one article if multiple matches exist  
• Display short previews so users can judge relevance quickly  
• Use reminders if the user doesn’t respond  
• Capture detailed feedback (e.g., “The article was irrelevant: reason”) for smarter AI suggestions in the future

## Summary
By pushing a suggested article immediately after ticket creation—when no agent is assigned—you empower users to find solutions on their own. If satisfied, they can close the ticket; otherwise, it remains open for agent intervention. This approach merges efficient self-service with an agent safety net, boosting resolution speed while reducing support volume.
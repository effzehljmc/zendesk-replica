import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface TicketMessage {
  id: string;
  content: string;
  createdAt: Date;
  userId: string;
  user?: {
    id: string;
    fullName: string | null;
    email: string | null;
  };
  attachments?: {
    id: string;
    fileName: string;
    fileSize: number;
    contentType: string;
    storagePath: string;
  }[];
  messageType?: string;
  isAIGenerated?: boolean;
}

interface TicketMessageResponse {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  message_type: string;
  is_ai_generated: boolean;
  profiles?: {
    full_name: string | null;
    email: string | null;
  };
  ticket_message_attachments: {
    id: string;
    file_name: string;
    file_size: number;
    content_type: string;
    storage_path: string;
  }[];
}

interface CreateMessageData {
  content: string;
  isAIGenerated?: boolean;
}

function transformMessage(message: TicketMessageResponse): TicketMessage {
  return {
    id: message.id,
    content: message.content,
    createdAt: new Date(message.created_at),
    userId: message.user_id,
    messageType: message.message_type,
    isAIGenerated: message.is_ai_generated,
    user: {
      id: message.user_id,
      fullName: message.profiles?.full_name || 'Unknown',
      email: message.profiles?.email || ''
    },
    attachments: (message.ticket_message_attachments ?? []).map(attachment => ({
      id: attachment.id,
      fileName: attachment.file_name,
      fileSize: attachment.file_size,
      contentType: attachment.content_type,
      storagePath: attachment.storage_path
    }))
  };
}

export function useTicketMessages(ticketId: string) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!profile?.id) {
      console.error('No profile ID available');
      return;
    }

    try {
      console.log('Fetching messages for ticket:', ticketId);
      const { data, error } = await supabase
        .from('ticket_messages')
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          ),
          ticket_message_attachments (
            id,
            file_name,
            file_size,
            content_type,
            storage_path
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      console.log('Fetched messages:', {
        count: data.length,
        messages: data.map(m => ({
          id: m.id,
          content: m.content.substring(0, 50) + '...',
          userId: m.user_id
        }))
      });

      const transformedMessages = data.map(transformMessage);
      setMessages(transformedMessages);
      console.log('Set initial messages, count:', transformedMessages.length);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, profile?.id]);

  const setupSubscription = useCallback(() => {
    if (channelRef.current) {
      console.log('Cleaning up existing subscription for ticket:', ticketId);
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    console.log('Setting up new subscription for ticket:', ticketId);
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
        async (payload: RealtimePostgresChangesPayload<TicketMessageResponse>) => {
          console.log('Received message update:', payload.eventType, 'for ticket:', ticketId, payload);
          
          if (payload.eventType === 'INSERT') {
            // Immediately add the new message to state with available data
            const newMessage = transformMessage(payload.new as TicketMessageResponse);
            console.log('Attempting to add new message:', newMessage);
            
            setMessages(currentMessages => {
              const exists = currentMessages.some(msg => msg.id === newMessage.id);
              console.log('Message exists check:', {
                messageId: newMessage.id,
                exists,
                currentCount: currentMessages.length
              });
              
              if (exists) {
                console.log('Message already exists, skipping update');
                return currentMessages;
              }
              
              const updatedMessages = [...currentMessages, newMessage];
              console.log('Added new message, new count:', updatedMessages.length);
              return updatedMessages;
            });

            // Then fetch complete data and update
            try {
              const { data: messageData, error: messageError } = await supabase
                .from('ticket_messages')
                .select(`
                  *,
                  profiles:user_id (
                    full_name,
                    email
                  ),
                  ticket_message_attachments (
                    id,
                    file_name,
                    file_size,
                    content_type,
                    storage_path
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (messageError) {
                console.error('Error fetching complete message data:', messageError);
                return;
              }

              if (messageData) {
                const transformedMessage = transformMessage(messageData);
                console.log('Updating message with complete data:', transformedMessage);
                
                setMessages(currentMessages => {
                  const updatedMessages = currentMessages.map(msg =>
                    msg.id === transformedMessage.id ? transformedMessage : msg
                  );
                  console.log('Updated message with complete data, count:', updatedMessages.length);
                  return updatedMessages;
                });
              }
            } catch (error) {
              console.error('Error processing new message:', error);
            }
          } else if (payload.eventType === 'DELETE') {
            setMessages(currentMessages => 
              currentMessages.filter(message => message.id !== payload.old.id)
            );
          } else if (payload.eventType === 'UPDATE') {
            try {
              const { data: messageData, error: messageError } = await supabase
                .from('ticket_messages')
                .select(`
                  *,
                  profiles:user_id (
                    full_name,
                    email
                  ),
                  ticket_message_attachments (
                    id,
                    file_name,
                    file_size,
                    content_type,
                    storage_path
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (messageError) {
                console.error('Error fetching updated message data:', messageError);
                return;
              }

              if (messageData) {
                const transformedMessage = transformMessage(messageData);
                setMessages(currentMessages =>
                  currentMessages.map(msg =>
                    msg.id === transformedMessage.id ? transformedMessage : msg
                  )
                );
              }
            } catch (error) {
              console.error('Error processing updated message:', error);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Subscription status for ticket ${ticketId}:`, status);
        if (status === 'SUBSCRIBED') {
          console.log('Successfully subscribed to messages for ticket:', ticketId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('Error in messages subscription for ticket:', ticketId);
          // Clean up and retry with a new subscription
          if (channelRef.current) {
            channelRef.current.unsubscribe();
            channelRef.current = null;
          }
          setTimeout(() => setupSubscription(), 1000);
        }
      });

    channelRef.current = channel;
  }, [ticketId]);

  useEffect(() => {
    console.log('Setting up ticket messages subscription for ticket:', ticketId);
    fetchMessages();
    setupSubscription();

    return () => {
      console.log('Unmounting: Cleaning up subscription for ticket:', ticketId);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [ticketId, fetchMessages, setupSubscription]);

  const createMessage = async (data: CreateMessageData) => {
    if (!profile?.id) {
      throw new Error('No profile ID available');
    }

    try {
      console.log('Creating message with:', {
        ticket_id: ticketId,
        content: data.content,
        user_id: profile.id,
        is_ai_generated: data.isAIGenerated
      });

      const { data: newMessage, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          content: data.content,
          user_id: profile.id,
          is_ai_generated: data.isAIGenerated
        })
        .select(`
          *,
          profiles:user_id (
            full_name,
            email
          ),
          ticket_message_attachments (
            id,
            file_name,
            file_size,
            content_type,
            storage_path
          )
        `)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const transformedMessage = transformMessage(newMessage);

      // Update the state immediately
      setMessages(currentMessages => [...currentMessages, transformedMessage]);

      toast({
        title: 'Success',
        description: 'Message sent successfully',
      });

      return transformedMessage;
    } catch (err) {
      console.error('Error creating message:', err);
      toast({
        title: 'Error',
        description: 'Failed to send message',
        variant: 'destructive',
      });
      throw err instanceof Error ? err : new Error('Failed to create message');
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      console.log('Attempting to delete message:', messageId);
      console.log('Current profile:', profile);

      const { error } = await supabase
        .from('ticket_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Supabase delete error:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        throw error;
      }

      // Update the state immediately
      setMessages(currentMessages => currentMessages.filter(message => message.id !== messageId));

      toast({
        title: 'Success',
        description: 'Message deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting message:', {
        error: err,
        messageId,
        profile: profile?.id
      });
      toast({
        title: 'Error',
        description: 'Failed to delete message',
        variant: 'destructive',
      });
      throw err instanceof Error ? err : new Error('Failed to delete message');
    }
  };

  return {
    messages,
    isLoading,
    error,
    createMessage,
    deleteMessage,
  };
} 
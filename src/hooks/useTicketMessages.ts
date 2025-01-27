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
    attachments: message.ticket_message_attachments.map(attachment => ({
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

      setMessages(data.map(transformMessage));
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, profile?.id]);

  useEffect(() => {
    console.log('Setting up ticket messages subscription for ticket:', ticketId);
    fetchMessages();

    // Clean up previous subscription if it exists
    if (channelRef.current) {
      console.log('Cleaning up previous subscription for ticket:', ticketId);
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Create new subscription with more specific configuration
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
            try {
              // Fetch the complete message data immediately
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
                setMessages(currentMessages => {
                  // Check if message already exists
                  const exists = currentMessages.some(msg => msg.id === transformedMessage.id);
                  if (exists) return currentMessages;
                  return [...currentMessages, transformedMessage];
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
          // Attempt to resubscribe on error
          setTimeout(() => {
            if (channelRef.current === channel) {
              console.log('Attempting to resubscribe...');
              channel.subscribe();
            }
          }, 1000);
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('Unmounting: Cleaning up subscription for ticket:', ticketId);
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [ticketId, fetchMessages]);

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
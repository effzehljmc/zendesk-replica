import { useState, useEffect } from 'react';
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

  useEffect(() => {
    if (!profile?.id) {
      console.error('No profile ID available');
      return;
    }

    const fetchMessages = async () => {
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

        console.log('Fetched messages:', data);
        setMessages(data.map(transformMessage));
      } catch (err) {
        console.error('Error fetching messages:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch messages'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchMessages();

    // Subscribe to changes
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
          if (payload.eventType === 'INSERT') {
            // First update UI with basic data
            setMessages(currentMessages => {
              // Check if message already exists
              const messageExists = currentMessages.some(msg => msg.id === payload.new.id);
              if (messageExists) return currentMessages;

              // Transform the payload data directly
              const newMessage = {
                ...payload.new,
                profiles: payload.new.profiles || {
                  full_name: null,
                  email: null
                },
                ticket_message_attachments: payload.new.ticket_message_attachments || []
              };

              // Transform the message
              const transformedMessage = transformMessage(newMessage);

              // Add the new message to the list
              return [...currentMessages, transformedMessage];
            });

            // Then fetch complete message data
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

              if (messageError) throw messageError;

              if (messageData) {
                // Update the message with complete data
                setMessages(currentMessages =>
                  currentMessages.map(msg =>
                    msg.id === messageData.id ? transformMessage(messageData) : msg
                  )
                );
              }
            } catch (error) {
              console.error('Error fetching complete message data:', error);
            }
          } else if (payload.eventType === 'DELETE') {
            setMessages(currentMessages => 
              currentMessages.filter(message => message.id !== payload.old.id)
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [ticketId, profile?.id]);

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
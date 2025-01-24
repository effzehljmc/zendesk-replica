import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface TicketMessage {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  user?: {
    fullName: string | null;
    email: string;
  };
  attachments?: {
    id: string;
    fileName: string;
    fileSize: number;
    contentType: string;
    storagePath: string;
  }[];
}

interface TicketMessageResponse {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles?: {
    full_name: string | null;
    email: string;
  };
  ticket_message_attachments?: {
    id: string;
    file_name: string;
    file_size: number;
    content_type: string;
    storage_path: string;
  }[];
}

interface CreateMessageData {
  content: string;
}

function transformMessage(message: TicketMessageResponse): TicketMessage {
  return {
    id: message.id,
    content: message.content,
    createdAt: message.created_at,
    userId: message.user_id,
    user: message.profiles ? {
      fullName: message.profiles.full_name,
      email: message.profiles.email
    } : undefined,
    attachments: message.ticket_message_attachments?.map(attachment => ({
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
          .order('created_at', { ascending: false });

        if (error) throw error;

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
            // Fetch the complete message with relations
            const { data: newMessage, error } = await supabase
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

            if (error) {
              console.error('Error fetching new message:', error);
              return;
            }

            setMessages(currentMessages => [transformMessage(newMessage), ...currentMessages]);
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
        user_id: profile.id
      });

      const { data: newMessage, error } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          content: data.content,
          user_id: profile.id
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
      setMessages(currentMessages => [transformedMessage, ...currentMessages]);

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
      const { error } = await supabase
        .from('ticket_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', profile?.id);

      if (error) throw error;

      // Update the state immediately
      setMessages(currentMessages => currentMessages.filter(message => message.id !== messageId));

      toast({
        title: 'Success',
        description: 'Message deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting message:', err);
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
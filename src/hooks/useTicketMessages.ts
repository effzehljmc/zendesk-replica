import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { useTicketMessagesContext } from '@/contexts/TicketMessagesContext';
import type { TicketMessage } from '@/types/ticket';

interface CreateMessageData {
  content: string;
  isAIGenerated?: boolean;
}

interface MessagesState {
  messages: TicketMessage[];
  isLoading: boolean;
  error: Error | null;
}

export function useTicketMessages(ticketId: string) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const { getTicketMessages, addMessage, deleteMessage: ctxDeleteMessage } = useTicketMessagesContext();
  const [messagesState, setMessagesState] = useState<MessagesState>({ messages: [], isLoading: true, error: null });

  useEffect(() => {
    const result = getTicketMessages(ticketId);
    setMessagesState(result);
  }, [ticketId, getTicketMessages]);

  const createMessage = useCallback(async (data: CreateMessageData) => {
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

      const transformedMessage: TicketMessage = {
        id: newMessage.id,
        content: newMessage.content,
        createdAt: new Date(newMessage.created_at),
        userId: newMessage.user_id,
        isAIGenerated: newMessage.is_ai_generated,
        user: {
          id: newMessage.user_id,
          fullName: newMessage.profiles?.full_name || 'Unknown',
          email: newMessage.profiles?.email || ''
        },
        attachments: (newMessage.ticket_message_attachments ?? []).map((attachment: { 
          id: string;
          file_name: string;
          file_size: number;
          content_type: string;
          storage_path: string;
        }) => ({
          id: attachment.id,
          fileName: attachment.file_name,
          fileSize: attachment.file_size,
          contentType: attachment.content_type,
          storagePath: attachment.storage_path
        }))
      };

      // Add the message to context
      addMessage(ticketId, transformedMessage);

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
  }, [ticketId, profile?.id, addMessage, toast]);

  const deleteMessage = useCallback(async (messageId: string) => {
    try {
      console.log('Attempting to delete message:', messageId);
      
      const { error } = await supabase
        .from('ticket_messages')
        .delete()
        .eq('id', messageId);

      if (error) {
        console.error('Supabase delete error:', error);
        throw error;
      }

      // Update the context state
      ctxDeleteMessage(ticketId, messageId);

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
  }, [ticketId, ctxDeleteMessage, toast]);

  return {
    messages: messagesState.messages,
    isLoading: messagesState.isLoading,
    error: messagesState.error,
    createMessage,
    deleteMessage
  };
} 
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { TicketMessage, CreateMessageData } from '@/types/ticket-message';

interface TicketMessageResponse {
  id: string;
  ticket_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export function useTicketMessages(ticketId: string) {
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (ticketId) {
      console.log('Setting up real-time subscription for ticket messages:', ticketId);
      fetchMessages();

      // Create a unique channel name for this ticket's messages
      const channelName = `ticket_messages_${ticketId}`;
      console.log('Creating channel:', channelName);

      // Subscribe to realtime updates
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ticket_messages',
            filter: `ticket_id=eq.${ticketId}`
          },
          async (payload: RealtimePostgresChangesPayload<TicketMessageResponse>) => {
            console.log('Realtime update received:', payload);

            // For INSERT and UPDATE events, fetch the complete message data including user
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              console.log('Fetching complete message data for:', payload.new.id);
              const { data: messageData, error: messageError } = await supabase
                .from('ticket_messages')
                .select(`
                  *,
                  user:profiles!ticket_messages_user_id_fkey (
                    id,
                    full_name,
                    email
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (!messageError && messageData) {
                console.log('Received message data:', messageData);
                const transformedMessage = {
                  id: messageData.id,
                  ticketId: messageData.ticket_id,
                  userId: messageData.user_id,
                  content: messageData.content,
                  createdAt: messageData.created_at,
                  user: messageData.user ? {
                    id: messageData.user.id,
                    fullName: messageData.user.full_name,
                    email: messageData.user.email,
                  } : undefined,
                };

                setMessages(currentMessages => {
                  console.log('Updating messages state:', { currentMessages, transformedMessage });
                  const index = currentMessages.findIndex(m => m.id === messageData.id);
                  if (index >= 0) {
                    // Update existing message
                    const updatedMessages = [...currentMessages];
                    updatedMessages[index] = transformedMessage;
                    return updatedMessages;
                  } else {
                    // Add new message at the beginning (since we sort by created_at DESC)
                    return [transformedMessage, ...currentMessages];
                  }
                });
              } else {
                console.error('Error fetching message data:', messageError);
              }
            } else if (payload.eventType === 'DELETE') {
              console.log('Removing deleted message:', payload.old.id);
              // Remove the deleted message from the state
              setMessages(currentMessages => 
                currentMessages.filter(message => message.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });

      return () => {
        console.log('Cleaning up subscription for ticket messages:', ticketId);
        supabase.removeChannel(channel);
      };
    }
  }, [ticketId]);

  const fetchMessages = async () => {
    try {
      console.log('Fetching messages for ticket:', ticketId);
      const { data, error } = await supabase
        .from('ticket_messages')
        .select(`
          *,
          user:profiles!ticket_messages_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match the TicketMessage type
      const transformedMessages = (data as TicketMessageResponse[]).map(message => ({
        id: message.id,
        ticketId: message.ticket_id,
        userId: message.user_id,
        content: message.content,
        createdAt: message.created_at,
        user: message.user ? {
          id: message.user.id,
          fullName: message.user.full_name,
          email: message.user.email,
        } : undefined,
      }));

      console.log('Setting messages state:', transformedMessages);
      setMessages(transformedMessages);
      setError(null);
    } catch (err) {
      console.error('Error fetching ticket messages:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch ticket messages'));
      toast({
        title: 'Error',
        description: 'Failed to fetch ticket messages',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createMessage = async (data: CreateMessageData) => {
    try {
      if (!profile?.id) {
        throw new Error('No profile found');
      }

      console.log('Creating message:', { ticketId, data, profileId: profile.id });

      // Create the message
      const { data: newMessage, error: createError } = await supabase
        .from('ticket_messages')
        .insert({
          ticket_id: ticketId,
          content: data.content,
          user_id: profile.id,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating message:', createError);
        throw createError;
      }

      // Then fetch the complete message data with user profile
      const { data: messageData, error: fetchError } = await supabase
        .from('ticket_messages')
        .select(`
          *,
          user:profiles!ticket_messages_user_id_fkey (
            id,
            full_name,
            email
          )
        `)
        .eq('id', newMessage.id)
        .single();

      if (fetchError) {
        console.error('Error fetching message data:', fetchError);
        throw fetchError;
      }

      console.log('Message created successfully:', messageData);

      // Transform and add the new message immediately
      const transformedMessage = {
        id: messageData.id,
        ticketId: messageData.ticket_id,
        userId: messageData.user_id,
        content: messageData.content,
        createdAt: messageData.created_at,
        user: messageData.user ? {
          id: messageData.user.id,
          fullName: messageData.user.full_name,
          email: messageData.user.email,
        } : undefined,
      };

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
      console.log('Deleting message:', messageId);
      const { error } = await supabase
        .from('ticket_messages')
        .delete()
        .eq('id', messageId)
        .eq('user_id', profile?.id);

      if (error) throw error;

      console.log('Message deleted successfully');

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
import { createContext, useContext, useRef, useCallback, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { TicketMessage, TicketMessageResponse } from '@/types/ticket';

interface TicketMessagesState {
  [ticketId: string]: {
    messages: TicketMessage[];
    isLoading: boolean;
    error: Error | null;
  };
}

interface TicketMessagesContextType {
  getTicketMessages: (ticketId: string) => {
    messages: TicketMessage[],
    isLoading: boolean,
    error: Error | null
  };
  addMessage: (ticketId: string, message: TicketMessage) => void;
  updateMessage: (ticketId: string, message: TicketMessage) => void;
  deleteMessage: (ticketId: string, messageId: string) => void;
}

const TicketMessagesContext = createContext<TicketMessagesContextType | null>(null);

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

export function TicketMessagesProvider({ children }: { children: ReactNode }) {
  const [ticketMessages, setTicketMessages] = useState<TicketMessagesState>({});
  const subscriptionsRef = useRef<Map<string, ReturnType<typeof supabase.channel>>>(new Map());

  const fetchMessages = useCallback(async (ticketId: string) => {
    try {
      setTicketMessages(prev => ({
        ...prev,
        [ticketId]: {
          ...prev[ticketId],
          isLoading: true,
          error: null
        }
      }));

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

      const transformedMessages = data.map(transformMessage);
      
      setTicketMessages(prev => ({
        ...prev,
        [ticketId]: {
          messages: transformedMessages,
          isLoading: false,
          error: null
        }
      }));
    } catch (err) {
      console.error('Error fetching messages:', err);
      setTicketMessages(prev => ({
        ...prev,
        [ticketId]: {
          messages: [],
          isLoading: false,
          error: err instanceof Error ? err : new Error('Failed to fetch messages')
        }
      }));
    }
  }, []);

  const setupSubscription = useCallback((ticketId: string) => {
    if (subscriptionsRef.current.has(ticketId)) {
      console.log('Subscription already exists for ticket:', ticketId);
      return;
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
          console.log('Received message update:', payload.eventType, 'for ticket:', ticketId);
          
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
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
              console.error('Error fetching message data:', messageError);
              return;
            }

            const transformedMessage = transformMessage(messageData);
            
            setTicketMessages(prev => {
              const currentMessages = prev[ticketId]?.messages || [];
              const existingIndex = currentMessages.findIndex(msg => msg.id === transformedMessage.id);
              
              let newMessages: TicketMessage[];
              if (existingIndex >= 0) {
                newMessages = [...currentMessages];
                newMessages[existingIndex] = transformedMessage;
              } else {
                newMessages = [...currentMessages, transformedMessage];
              }
              
              newMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
              
              return {
                ...prev,
                [ticketId]: {
                  ...prev[ticketId],
                  messages: newMessages
                }
              };
            });
          } else if (payload.eventType === 'DELETE') {
            setTicketMessages(prev => ({
              ...prev,
              [ticketId]: {
                ...prev[ticketId],
                messages: prev[ticketId]?.messages.filter(msg => msg.id !== payload.old.id) || []
              }
            }));
          }
        }
      )
      .subscribe();

    subscriptionsRef.current.set(ticketId, channel);
  }, []);

  const getTicketMessages = useCallback((ticketId: string) => {
    if (!ticketMessages[ticketId]) {
      // Initialize state and fetch messages if not already present
      setTicketMessages(prev => ({
        ...prev,
        [ticketId]: { messages: [], isLoading: true, error: null }
      }));
      fetchMessages(ticketId);
      setupSubscription(ticketId);
    }
    return ticketMessages[ticketId] || { messages: [], isLoading: true, error: null };
  }, [ticketMessages, fetchMessages, setupSubscription]);

  const addMessage = useCallback((ticketId: string, message: TicketMessage) => {
    setTicketMessages(prev => ({
      ...prev,
      [ticketId]: {
        ...prev[ticketId],
        messages: [...(prev[ticketId]?.messages || []), message].sort((a, b) => 
          a.createdAt.getTime() - b.createdAt.getTime()
        )
      }
    }));
  }, []);

  const updateMessage = useCallback((ticketId: string, message: TicketMessage) => {
    setTicketMessages(prev => {
      const currentMessages = prev[ticketId]?.messages || [];
      const index = currentMessages.findIndex(m => m.id === message.id);
      if (index === -1) return prev;

      const newMessages = [...currentMessages];
      newMessages[index] = message;

      return {
        ...prev,
        [ticketId]: {
          ...prev[ticketId],
          messages: newMessages
        }
      };
    });
  }, []);

  const deleteMessage = useCallback((ticketId: string, messageId: string) => {
    setTicketMessages(prev => ({
      ...prev,
      [ticketId]: {
        ...prev[ticketId],
        messages: prev[ticketId]?.messages.filter(m => m.id !== messageId) || []
      }
    }));
  }, []);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      subscriptionsRef.current.forEach(channel => {
        channel.unsubscribe();
      });
      subscriptionsRef.current.clear();
    };
  }, []);

  return (
    <TicketMessagesContext.Provider value={{
      getTicketMessages,
      addMessage,
      updateMessage,
      deleteMessage
    }}>
      {children}
    </TicketMessagesContext.Provider>
  );
}

export function useTicketMessagesContext() {
  const context = useContext(TicketMessagesContext);
  if (!context) {
    throw new Error('useTicketMessagesContext must be used within a TicketMessagesProvider');
  }
  return context;
} 
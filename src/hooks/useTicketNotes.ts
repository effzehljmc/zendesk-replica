import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

export type TicketNote = {
  id: string;
  content: string;
  visibility: 'private' | 'team' | 'public';
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    fullName: string;
  };
};

interface CreateNoteData {
  content: string;
  visibility?: 'private' | 'team' | 'public';
}

interface TicketNoteResponse {
  id: string;
  content: string;
  visibility: 'private' | 'team' | 'public';
  created_at: string;
  updated_at: string;
  created_by_id: string;
  created_by?: {
    id: string;
    full_name: string;
  };
}

export function useTicketNotes(ticketId: string) {
  const [notes, setNotes] = useState<TicketNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (ticketId) {
      fetchNotes();

      // Create a unique channel name for this ticket
      const channelName = `ticket_notes_${ticketId}`;

      // Subscribe to realtime updates
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ticket_notes',
            filter: `ticket_id=eq.${ticketId}`
          },
          async (payload: RealtimePostgresChangesPayload<TicketNoteResponse>) => {
            // For INSERT and UPDATE events, fetch the complete note data including created_by
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              const { data: noteData, error: noteError } = await supabase
                .from('ticket_notes')
                .select(`
                  *,
                  created_by:profiles!ticket_notes_created_by_id_fkey (
                    id,
                    full_name
                  )
                `)
                .eq('id', payload.new.id)
                .single();

              if (!noteError && noteData) {
                const transformedNote = {
                  id: noteData.id,
                  content: noteData.content,
                  visibility: noteData.visibility,
                  createdAt: noteData.created_at,
                  updatedAt: noteData.updated_at,
                  createdBy: noteData.created_by ? {
                    id: noteData.created_by.id,
                    fullName: noteData.created_by.full_name,
                  } : undefined,
                };

                setNotes(currentNotes => {
                  const index = currentNotes.findIndex(n => n.id === noteData.id);
                  if (index >= 0) {
                    // Update existing note
                    const updatedNotes = [...currentNotes];
                    updatedNotes[index] = transformedNote;
                    return updatedNotes;
                  }
                  // For new notes, don't add them here as they're already added optimistically
                  return currentNotes;
                });
              }
            } else if (payload.eventType === 'DELETE') {
              // Remove the deleted note from the state
              setNotes(currentNotes => 
                currentNotes.filter(note => note.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        channel.unsubscribe();
      };
    }
  }, [ticketId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_notes')
        .select(`
          *,
          created_by:profiles!ticket_notes_created_by_id_fkey (
            id,
            full_name
          )
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to match the TicketNote type
      const transformedNotes = (data as TicketNoteResponse[]).map(note => ({
        id: note.id,
        content: note.content,
        visibility: note.visibility,
        createdAt: note.created_at,
        updatedAt: note.updated_at,
        createdBy: note.created_by ? {
          id: note.created_by.id,
          fullName: note.created_by.full_name,
        } : undefined,
      }));

      setNotes(transformedNotes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch ticket notes'));
      toast({
        title: 'Error',
        description: 'Failed to fetch ticket notes',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createNote = async (data: CreateNoteData) => {
    try {
      const { data: noteData, error } = await supabase
        .from('ticket_notes')
        .insert({
          ticket_id: ticketId,
          content: data.content,
          visibility: data.visibility,
          created_by_id: profile?.id,
        })
        .select(`
          *,
          created_by:profiles!ticket_notes_created_by_id_fkey (
            id,
            full_name
          )
        `)
        .single();

      if (error) throw error;

      // Transform and add the new note immediately
      const transformedNote = {
        id: noteData.id,
        content: noteData.content,
        visibility: noteData.visibility,
        createdAt: noteData.created_at,
        updatedAt: noteData.updated_at,
        createdBy: noteData.created_by ? {
          id: noteData.created_by.id,
          fullName: noteData.created_by.full_name,
        } : undefined,
      };

      // Update the state immediately
      setNotes(currentNotes => {
        // Check if the note already exists
        const exists = currentNotes.some(note => note.id === transformedNote.id);
        if (exists) {
          return currentNotes;
        }
        return [transformedNote, ...currentNotes];
      });

      toast({
        title: 'Success',
        description: 'Note created successfully',
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to create note');
    }
  };

  const updateNote = async (noteId: string, data: CreateNoteData) => {
    try {
      const { data: noteData, error } = await supabase
        .from('ticket_notes')
        .update({
          content: data.content,
          visibility: data.visibility,
        })
        .eq('id', noteId)
        .eq('created_by_id', profile?.id)
        .select(`
          *,
          created_by:profiles!ticket_notes_created_by_id_fkey (
            id,
            full_name
          )
        `)
        .single();

      if (error) throw error;

      // Transform and update the note immediately
      const transformedNote = {
        id: noteData.id,
        content: noteData.content,
        visibility: noteData.visibility,
        createdAt: noteData.created_at,
        updatedAt: noteData.updated_at,
        createdBy: noteData.created_by ? {
          id: noteData.created_by.id,
          fullName: noteData.created_by.full_name,
        } : undefined,
      };

      // Update the state immediately
      setNotes(currentNotes => {
        const index = currentNotes.findIndex(note => note.id === noteId);
        if (index >= 0) {
          const updatedNotes = [...currentNotes];
          updatedNotes[index] = transformedNote;
          return updatedNotes;
        }
        return currentNotes;
      });

      toast({
        title: 'Success',
        description: 'Note updated successfully',
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to update note');
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('ticket_notes')
        .delete()
        .eq('id', noteId)
        .eq('created_by_id', profile?.id);

      if (error) throw error;

      // Update the state immediately
      setNotes(currentNotes => currentNotes.filter(note => note.id !== noteId));

      toast({
        title: 'Success',
        description: 'Note deleted successfully',
      });
    } catch (err) {
      throw err instanceof Error ? err : new Error('Failed to delete note');
    }
  };

  return {
    notes,
    isLoading,
    error,
    createNote,
    updateNote,
    deleteNote,
  };
} 
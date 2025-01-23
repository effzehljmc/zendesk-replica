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
      console.log('Setting up real-time subscription for ticket:', ticketId);
      fetchNotes();

      // Create a unique channel name for this ticket
      const channelName = `ticket_notes_${ticketId}`;
      console.log('Creating channel:', channelName);

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
            console.log('Realtime update received:', payload);

            // For INSERT and UPDATE events, fetch the complete note data including created_by
            if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
              console.log('Fetching complete note data for:', payload.new.id);
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
                console.log('Received note data:', noteData);
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
                  console.log('Updating notes state:', { currentNotes, transformedNote });
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
              } else {
                console.error('Error fetching note data:', noteError);
              }
            } else if (payload.eventType === 'DELETE') {
              console.log('Removing deleted note:', payload.old.id);
              // Remove the deleted note from the state
              setNotes(currentNotes => 
                currentNotes.filter(note => note.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe((status) => {
          console.log('Subscription status:', status);
        });

      return () => {
        console.log('Cleaning up subscription for ticket:', ticketId);
        supabase.removeChannel(channel);
      };
    }
  }, [ticketId]);

  const fetchNotes = async () => {
    try {
      console.log('Fetching notes for ticket:', ticketId);
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

      console.log('Setting notes state:', transformedNotes);
      setNotes(transformedNotes);
      setError(null);
    } catch (err) {
      console.error('Error fetching ticket notes:', err);
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
      if (!profile?.id) {
        throw new Error('No profile found');
      }

      console.log('Creating note:', { ticketId, data, profileId: profile.id });
      
      // Check if this is an agent/admin
      const isAgentOrAdmin = profile.roles?.some(r => r.name === 'admin' || r.name === 'agent');
      
      // Create the note first
      const { data: newNote, error: createError } = await supabase
        .rpc('create_ticket_note', {
          p_ticket_id: ticketId,
          p_content: data.content,
          p_created_by_id: profile.id,
          p_is_agent_or_admin: isAgentOrAdmin,
          p_visibility: data.visibility || 'private'
        });

      if (createError) {
        console.error('Error creating note:', createError);
        throw createError;
      }

      // Then fetch the complete note data with profile
      const { data: noteData, error: fetchError } = await supabase
        .from('ticket_notes')
        .select(`
          *,
          created_by:profiles!ticket_notes_created_by_id_fkey (
            id,
            full_name
          )
        `)
        .eq('id', newNote[0].id)
        .single();

      if (fetchError) {
        console.error('Error fetching note data:', fetchError);
        throw fetchError;
      }

      console.log('Note created successfully:', noteData);

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
      console.error('Error creating note:', err);
      throw err instanceof Error ? err : new Error('Failed to create note');
    }
  };

  const updateNote = async (noteId: string, data: CreateNoteData) => {
    try {
      if (!profile?.id) {
        throw new Error('No profile found');
      }

      console.log('Updating note:', { noteId, data });
      const { data: updatedNote, error } = await supabase
        .from('ticket_notes')
        .update({
          content: data.content,
          visibility: data.visibility,
        })
        .eq('id', noteId)
        .eq('created_by_id', profile.id)
        .select(`
          *,
          created_by:profiles!ticket_notes_created_by_id_fkey (
            id,
            full_name
          )
        `)
        .single();

      if (error) throw error;

      console.log('Note updated successfully:', updatedNote);

      // Transform and update the note immediately
      const transformedNote = {
        id: updatedNote.id,
        content: updatedNote.content,
        visibility: updatedNote.visibility,
        createdAt: updatedNote.created_at,
        updatedAt: updatedNote.updated_at,
        createdBy: updatedNote.created_by ? {
          id: updatedNote.created_by.id,
          fullName: updatedNote.created_by.full_name,
        } : undefined,
      };

      // Update the state immediately
      setNotes(currentNotes => {
        const index = currentNotes.findIndex(n => n.id === noteId);
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
      console.error('Error updating note:', err);
      throw err instanceof Error ? err : new Error('Failed to update note');
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      console.log('Deleting note:', noteId);
      const { error } = await supabase
        .from('ticket_notes')
        .delete()
        .eq('id', noteId)
        .eq('created_by_id', profile?.id);

      if (error) throw error;

      console.log('Note deleted successfully');

      // Update the state immediately
      setNotes(currentNotes => currentNotes.filter(note => note.id !== noteId));

      toast({
        title: 'Success',
        description: 'Note deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting note:', err);
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
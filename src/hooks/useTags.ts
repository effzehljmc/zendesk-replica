import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Tag } from '@/types';
import { useToast } from '@/components/ui/use-toast';
import { PostgrestResponse } from '@supabase/supabase-js';

interface CreateTagData {
  name: string;
  color: string;
}

interface TagData {
  id: string;
  name: string;
  color: string;
  usage_count: number;
  last_used_at: string | null;
}

interface TicketTagResponse {
  tag: TagData;
}

function isTicketTagResponse(item: unknown): item is TicketTagResponse {
  return (
    item !== null &&
    typeof item === 'object' &&
    'tag' in item &&
    typeof (item as any).tag === 'object' &&
    'id' in (item as any).tag &&
    'name' in (item as any).tag &&
    'color' in (item as any).tag &&
    'usage_count' in (item as any).tag &&
    'last_used_at' in (item as any).tag
  );
}

const MAX_SESSION_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { user, profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchTags();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('tag_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tags'
        },
        () => {
          fetchTags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchTags = async () => {
    try {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .order('name');

      if (error) throw error;

      setTags(data || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching tags:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch tags'));
      toast({
        title: 'Error',
        description: 'Failed to fetch tags',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSession = async (retries = MAX_SESSION_RETRIES): Promise<any> => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) throw error;
      if (!session) {
        if (retries > 0) {
          console.log(`No session found, retrying... (${retries} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          return getSession(retries - 1);
        }
        throw new Error('No active session after retries');
      }
      return session;
    } catch (err) {
      if (retries > 0) {
        console.log(`Error getting session, retrying... (${retries} attempts left)`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
        return getSession(retries - 1);
      }
      throw err;
    }
  };

  const checkUserRole = async () => {
    if (!user?.id) {
      throw new Error('No authenticated user found');
    }

    // Check user's role in the database
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        auth_user_id,
        user_roles!inner (
          roles!inner (
            name
          )
        )
      `)
      .eq('auth_user_id', user.id)
      .single();

    if (error) {
      console.error('Error checking user role:', error);
      throw new Error('Failed to verify user role');
    }

    if (!data) {
      console.error('No profile found for user:', user.id);
      throw new Error('User profile not found');
    }

    const roles = data.user_roles.map((ur: any) => ur.roles.name);
    console.log('User roles:', {
      userId: user.id,
      profileId: data.id,
      roles,
      authUserId: data.auth_user_id
    });

    if (!roles.some(role => ['admin', 'agent'].includes(role))) {
      throw new Error('User does not have permission to create tags');
    }

    return data.id;
  };

  const createTag = async (data: CreateTagData) => {
    try {
      // First check user's role
      await checkUserRole();

      if (!profile?.id) {
        throw new Error('No profile found');
      }

      // Debug session state
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      console.log('Session state before tag creation:', {
        hasSession: !!session,
        accessToken: session?.access_token ? 'present' : 'missing',
        userId: session?.user?.id,
        error: sessionError
      });

      // Debug auth state
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Auth state before tag creation:', {
        hasUser: !!user,
        userId: user?.id,
        error: userError
      });

      // Debug profile state
      console.log('Profile state before tag creation:', {
        profileId: profile.id,
        authUserId: profile.auth_user_id,
        roles: profile.roles.map(r => r.name)
      });

      // Create tag with detailed error logging
      const { data: tag, error } = await supabase
        .from('tags')
        .insert({
          name: data.name,
          color: data.color,
          created_by_id: profile.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Tag creation error details:', {
          error,
          errorCode: error.code,
          errorMessage: error.message,
          errorDetails: error.details,
          userId: user?.id,
          profileId: profile.id,
          userRoles: profile.roles.map(r => r.name),
          requestHeaders: await supabase.auth.getSession().then(s => ({
            hasAuthHeader: !!s.data.session?.access_token
          }))
        });
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Tag created successfully',
      });
      
      // Update local state
      setTags(prevTags => [...prevTags, tag]);
      
      return tag as Tag;
    } catch (err) {
      console.error('Error creating tag:', err);
      if (err instanceof Error && err.message.includes('100')) {
        throw new Error('Maximum number of tags (100) reached');
      }
      throw err instanceof Error ? err : new Error('Failed to create tag');
    }
  };

  const deleteTag = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setTags(prevTags => prevTags.filter(tag => tag.id !== id));
      
      toast({
        title: 'Success',
        description: 'Tag deleted successfully',
      });
    } catch (err) {
      console.error('Error deleting tag:', err);
      throw err instanceof Error ? err : new Error('Failed to delete tag');
    }
  };

  return {
    tags,
    isLoading,
    error,
    createTag,
    deleteTag,
  };
}

export function useTicketTags(ticketId: string) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const { profile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (ticketId) {
      fetchTicketTags();

      // Subscribe to realtime updates
      const channel = supabase
        .channel('ticket_tags_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'ticket_tags',
            filter: `ticket_id=eq.${ticketId}`
          },
          () => {
            fetchTicketTags();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [ticketId]);

  const fetchTicketTags = async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_tags')
        .select(`
          tag:tags (
            id,
            name,
            color,
            usage_count,
            last_used_at
          )
        `)
        .eq('ticket_id', ticketId) as PostgrestResponse<TicketTagResponse>;

      if (error) throw error;
      
      // Validate and map the data
      if (!data?.every(isTicketTagResponse)) {
        throw new Error('Invalid tag data received from server');
      }
      
      const tagData = data.map(item => ({
        id: item.tag.id,
        name: item.tag.name,
        color: item.tag.color,
        usage_count: item.tag.usage_count,
        last_used_at: item.tag.last_used_at,
        created_at: new Date().toISOString(),
        created_by_id: profile?.id || ''
      })) as Tag[];
      
      setTags(tagData);
      setError(null);
    } catch (err) {
      console.error('Error fetching ticket tags:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch ticket tags'));
      toast({
        title: 'Error',
        description: 'Failed to fetch ticket tags',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addTag = async (tagId: string) => {
    try {
      if (!profile?.id) {
        throw new Error('No profile found');
      }

      const { error } = await supabase
        .from('ticket_tags')
        .insert([{
          ticket_id: ticketId,
          tag_id: tagId,
          created_by_id: profile.id
        }]);

      if (error) {
        if (error.message.includes('3')) {
          throw new Error('Maximum of 3 tags per ticket exceeded');
        }
        throw error;
      }

      toast({
        title: 'Success',
        description: 'Tag added successfully',
      });
    } catch (err) {
      console.error('Error adding tag:', err);
      throw err instanceof Error ? err : new Error('Failed to add tag');
    }
  };

  const removeTag = async (tagId: string) => {
    try {
      const { error } = await supabase
        .from('ticket_tags')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('tag_id', tagId);

      if (error) throw error;
      toast({
        title: 'Success',
        description: 'Tag removed successfully',
      });
    } catch (err) {
      console.error('Error removing tag:', err);
      throw err instanceof Error ? err : new Error('Failed to remove tag');
    }
  };

  return {
    tags,
    isLoading,
    error,
    addTag,
    removeTag,
    refetch: fetchTicketTags,
  };
} 
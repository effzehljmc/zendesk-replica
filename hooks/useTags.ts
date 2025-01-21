import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Tag } from '@/types/ticket';

export function useTags() {
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTags = useCallback(async () => {
    try {
      const { data: tags, error } = await supabase
        .from('tags')
        .select('*')
        .order('usage_count', { ascending: false });

      if (error) throw error;
      setTags(tags || []);
      setError(null);
    } catch (error) {
      console.error('Error fetching tags:', error);
      setError('Failed to fetch tags');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTag = useCallback(async (name: string, color: string) => {
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!session?.user?.id) throw new Error('No authenticated user found');

      console.log('Creating tag with user ID:', session.user.id);

      const { data: tag, error } = await supabase
        .from('tags')
        .insert([
          {
            name,
            color,
            created_by_id: session.user.id
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      setTags(prevTags => [...prevTags, tag]);
      setError(null);
      return tag;
    } catch (error: any) {
      console.error('Error creating tag:', error);
      setError(error.message || 'Failed to create tag');
      throw error;
    }
  }, []);

  const deleteTag = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('tags')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setTags(prevTags => prevTags.filter(tag => tag.id !== id));
      setError(null);
    } catch (error: any) {
      console.error('Error deleting tag:', error);
      setError(error.message || 'Failed to delete tag');
      throw error;
    }
  }, []);

  useEffect(() => {
    fetchTags();

    // Subscribe to changes
    const channel = supabase
      .channel('tags_changes')
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
  }, [fetchTags]);

  return {
    tags,
    loading,
    error,
    createTag,
    deleteTag,
    refetch: fetchTags
  };
} 
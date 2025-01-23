import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  CreateKBArticleInput, 
  UpdateKBArticleInput, 
  getKBArticles, 
  getKBArticle, 
  createKBArticle, 
  updateKBArticle, 
  deleteKBArticle, 
  searchKBArticles,
  getSimilarArticles as getSimilarKBArticles,
  searchKBArticles as searchKB
} from '@/lib/kb';
import { PostgrestError } from '@supabase/supabase-js';

export function useKBArticles() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<PostgrestError | null>(null);

  // Get all articles
  const { data: articles, isLoading: isLoadingArticles } = useQuery({
    queryKey: ['kb-articles'],
    queryFn: async () => {
      try {
        return await getKBArticles();
      } catch (err) {
        setError(err as PostgrestError);
        throw err;
      }
    }
  });

  // Get single article
  const useArticle = (id: string) => {
    return useQuery({
      queryKey: ['kb-article', id],
      queryFn: async () => {
        try {
          return await getKBArticle(id);
        } catch (err) {
          setError(err as PostgrestError);
          throw err;
        }
      }
    });
  };

  // Create article
  const { mutateAsync: create } = useMutation({
    mutationFn: async (input: CreateKBArticleInput) => {
      try {
        return await createKBArticle(input);
      } catch (err) {
        setError(err as PostgrestError);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
    }
  });

  // Update article
  const { mutateAsync: update } = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateKBArticleInput }) => {
      try {
        return await updateKBArticle(id, input);
      } catch (err) {
        setError(err as PostgrestError);
        throw err;
      }
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
      queryClient.invalidateQueries({ queryKey: ['kb-article', id] });
    }
  });

  // Delete article
  const { mutateAsync: remove } = useMutation({
    mutationFn: async (id: string) => {
      try {
        await deleteKBArticle(id);
      } catch (err) {
        setError(err as PostgrestError);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kb-articles'] });
    }
  });

  // Search articles
  const { mutateAsync: search } = useMutation({
    mutationFn: async ({ query, limit }: { query: string; limit?: number }) => {
      try {
        return await searchKBArticles(query, limit);
      } catch (err) {
        setError(err as PostgrestError);
        throw err;
      }
    }
  });

  // Get similar articles
  const getSimilarArticles = async (articleId: string, limit: number = 3) => {
    try {
      return await getSimilarKBArticles(articleId, limit);
    } catch (err) {
      setError(err as PostgrestError);
      throw err;
    }
  };

  // Get all public articles
  const usePublicArticles = () => {
    return useQuery({
      queryKey: ['kb-articles', 'public'],
      queryFn: async () => {
        const articles = await getKBArticles();
        return articles.filter(article => article.is_public)
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      }
    });
  };

  return {
    articles,
    isLoadingArticles,
    error,
    useArticle,
    create,
    update,
    remove,
    search,
    getSimilarArticles,
    clearError: () => setError(null),
    usePublicArticles,
    searchKBArticles: searchKB
  };
} 
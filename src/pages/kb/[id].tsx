import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useKBArticles } from '@/hooks/useKBArticles';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { format } from 'date-fns';
import type { KBArticle } from '@/lib/kb';

export default function KBArticle() {
  const { id } = useParams<{ id: string }>();
  const { useArticle, getSimilarArticles } = useKBArticles();
  const { data: article, isLoading } = useArticle(id!);
  const { data: similarArticles, isLoading: isLoadingSimilar } = useQuery({
    queryKey: ['similar-articles', id],
    queryFn: async () => {
      try {
        if (!id) throw new Error('Article ID is required');
        const articles = await getSimilarArticles(id);
        return articles;
      } catch (error) {
        return [];
      }
    },
    enabled: !!id && !!article,
    staleTime: 5 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="space-y-2">
          <div className="h-4 w-full bg-muted animate-pulse rounded" />
          <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
          <div className="h-4 w-5/6 bg-muted animate-pulse rounded" />
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Article not found</h1>
        <p className="text-muted-foreground">
          This article may have been removed or is not publicly available.
        </p>
        <Button asChild className="mt-4">
          <Link to="/kb">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Knowledge Base
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <Button asChild variant="ghost" className="mb-6">
        <Link to="/kb">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Knowledge Base
        </Link>
      </Button>

      <article className="prose dark:prose-invert max-w-none">
        <h1>{article.title}</h1>
        <div className="text-sm text-muted-foreground mb-6">
          Last updated: {format(new Date(article.updated_at), 'MMM d, yyyy')}
        </div>
        <div className="whitespace-pre-wrap">{article.content}</div>
      </article>

      {/* Related Articles Section */}
      <div className="mt-12 border-t pt-6">
        <h2 className="text-xl font-semibold mb-4">Related Articles</h2>
        {isLoadingSimilar ? (
          <div className="space-y-4">
            <div className="h-24 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
            <div className="h-24 bg-muted animate-pulse rounded" />
          </div>
        ) : similarArticles && similarArticles.length > 0 ? (
          <div className="space-y-4">
            {similarArticles.map((related: KBArticle & { similarity: number }) => (
              <Link
                key={related.id}
                to={`/kb/${related.id}`}
                className="block p-4 border rounded-lg hover:bg-muted transition-colors"
              >
                <h3 className="font-medium mb-2">{related.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {related.content}
                </p>
                <div className="text-xs text-muted-foreground mt-2">
                  Similarity: {Math.round(related.similarity * 100)}%
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No related articles found.</p>
        )}
      </div>
    </div>
  );
} 
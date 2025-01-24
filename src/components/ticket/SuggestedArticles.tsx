import { useEffect, useState } from 'react';
import { KBArticle, searchKBArticles } from '@/lib/kb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';

interface SuggestedArticlesProps {
  title: string;
  description: string;
  onArticleClick?: (article: KBArticle) => void;
}

export function SuggestedArticles({ title, description, onArticleClick }: SuggestedArticlesProps) {
  const [articles, setArticles] = useState<KBArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const searchQuery = `${title} ${description}`.trim();
    if (searchQuery.length < 3) {
      setHasSearched(false);
      return;
    }

    const searchArticles = async () => {
      setIsLoading(true);
      setHasSearched(true);
      try {
        const results = await searchKBArticles(searchQuery, 3); // Limit to 3 most relevant articles
        setArticles(results);
      } catch (error) {
        console.error('Failed to search articles:', error);
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimeout = setTimeout(searchArticles, 500);
    return () => clearTimeout(debounceTimeout);
  }, [title, description]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">Finding Relevant Articles...</h3>
        </div>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-[120px] w-full" />
        ))}
      </div>
    );
  }

  if (!hasSearched) {
    return null;
  }

  if (hasSearched && !articles.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h3 className="text-lg font-medium">Suggested Articles</h3>
        </div>
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            <p>No matching articles found. Please proceed with creating your ticket.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground" />
        <h3 className="text-lg font-medium">Suggested Articles</h3>
        <span className="text-sm text-muted-foreground">
          ({articles.length} found)
        </span>
      </div>
      <div className="space-y-3">
        {articles.map((article) => (
          <Card key={article.id} className="hover:bg-muted/50 transition-colors">
            <CardHeader className="p-4">
              <CardTitle className="text-base">
                <Link 
                  to={`/kb/${article.id}`} 
                  className="flex items-center justify-between group"
                  onClick={() => onArticleClick?.(article)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {article.title}
                  <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {article.content}
              </CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
} 
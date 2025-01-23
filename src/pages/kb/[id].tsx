import { useParams, Link } from 'react-router-dom';
import { useKBArticles } from '@/hooks/useKBArticles';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function KBArticle() {
  const { id } = useParams<{ id: string }>();
  const { useArticle } = useKBArticles();
  const { data: article, isLoading } = useArticle(id!);

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-4">
        <Skeleton className="h-8 w-[300px]" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    );
  }

  if (!article || !article.is_public) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-2xl font-bold mb-4">Article not found</h1>
        <p className="text-muted-foreground mb-4">
          The article you're looking for doesn't exist or is not publicly available.
        </p>
        <Link to="/kb">
          <Button>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Knowledge Base
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-6">
        <Link to="/kb">
          <Button variant="ghost">
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Knowledge Base
          </Button>
        </Link>
      </div>

      <article className="prose prose-sm md:prose-base lg:prose-lg dark:prose-invert max-w-none">
        <h1>{article.title}</h1>
        <div className="whitespace-pre-wrap">{article.content}</div>
      </article>
    </div>
  );
}

export default KBArticle; 
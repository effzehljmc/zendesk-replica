import { useState } from 'react';
import { useKBArticles } from '@/hooks/useKBArticles';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { KBArticle } from '@/lib/kb';

function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const { articles, isLoadingArticles, search } = useKBArticles();
  const [searchResults, setSearchResults] = useState<KBArticle[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Filter public articles and sort by date
  const publicArticles = articles?.filter(article => article.is_public)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Get content excerpt (first 150 characters)
  const getExcerpt = (content: string) => {
    const cleaned = content.replace(/\n/g, ' ').trim();
    return cleaned.length > 150 ? `${cleaned.substring(0, 150)}...` : cleaned;
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await search({ query: searchQuery });
      setSearchResults(results?.filter(article => article.is_public) ?? []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const displayedArticles = searchResults.length > 0 ? searchResults : publicArticles ?? [];

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">Knowledge Base</h1>

      {/* Search Section */}
      <div className="mb-8 flex gap-2">
        <Input
          type="text"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-md"
        />
        <Button 
          onClick={handleSearch}
          disabled={isSearching}
        >
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Articles List */}
      <div className="space-y-6">
        {isLoadingArticles ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-6 w-[250px]" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))
        ) : displayedArticles?.length ? (
          displayedArticles.map((article) => (
            <article 
              key={article.id}
              className="border rounded-lg p-6 hover:border-primary transition-colors"
            >
              <Link to={`/kb/${article.id}`}>
                <h2 className="text-xl font-semibold mb-2 hover:text-primary">
                  {article.title}
                </h2>
                <p className="text-muted-foreground">
                  {getExcerpt(article.content)}
                </p>
              </Link>
            </article>
          ))
        ) : (
          <p className="text-muted-foreground">
            {searchQuery 
              ? "No articles found matching your search." 
              : "No articles available."}
          </p>
        )}
      </div>
    </div>
  );
}

export default KnowledgeBase; 
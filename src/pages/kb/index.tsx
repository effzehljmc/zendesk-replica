import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useKBArticles } from '@/hooks/useKBArticles';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import type { KBArticle } from '@/lib/kb';

export default function KnowledgeBase() {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { usePublicArticles, searchKBArticles } = useKBArticles();
  const { data: publicArticles, isLoading } = usePublicArticles();
  const [searchResults, setSearchResults] = useState<KBArticle[]>([]);

  // Handle search
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await searchKBArticles(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  // Display articles based on search state
  const displayedArticles = searchQuery ? searchResults : publicArticles || [];

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-10 w-full max-w-md bg-muted animate-pulse rounded-md" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-6 w-3/4 bg-muted animate-pulse rounded" />
              <div className="h-4 w-full bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Knowledge Base</h1>
      
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex gap-2 max-w-md">
          <Input
            type="search"
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" disabled={isSearching}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Articles List */}
      <div className="space-y-6">
        {isSearching ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : displayedArticles.length > 0 ? (
          displayedArticles.map((article: KBArticle) => (
            <Link
              key={article.id}
              to={`/kb/${article.id}`}
              className="block p-4 border rounded-lg hover:bg-muted transition-colors"
            >
              <h2 className="text-xl font-semibold mb-2">{article.title}</h2>
              <p className="text-muted-foreground line-clamp-2">
                {article.content}
              </p>
            </Link>
          ))
        ) : (
          <p className="text-muted-foreground">
            {searchQuery
              ? 'No articles found matching your search.'
              : 'No articles available.'}
          </p>
        )}
      </div>
    </div>
  );
} 
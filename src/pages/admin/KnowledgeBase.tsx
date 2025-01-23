import { useState } from 'react';
import { useKBArticles } from '@/hooks/useKBArticles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { Plus, MoreVertical, Pencil, Trash2, Eye, Search } from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { KBArticle } from '@/lib/kb';

type ArticleFormData = {
  title: string;
  content: string;
  is_public: boolean;
};

function KnowledgeBaseAdmin() {
  const { articles, isLoadingArticles, create, update, remove, search } = useKBArticles();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<KBArticle | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<KBArticle[]>([]);
  const [formData, setFormData] = useState<ArticleFormData>({
    title: '',
    content: '',
    is_public: false,
  });
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    try {
      const results = await search({ query: searchQuery });
      setSearchResults(results ?? []);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingArticle) {
        await update({ id: editingArticle.id, input: formData });
        toast({ title: 'Article updated successfully' });
      } else {
        await create(formData);
        toast({ title: 'Article created successfully' });
      }
      setIsCreateDialogOpen(false);
      setEditingArticle(null);
      resetForm();
    } catch (error) {
      toast({ 
        title: 'Error',
        description: 'Failed to save article',
        variant: 'destructive'
      });
    }
  };

  const handleEdit = (article: KBArticle) => {
    setEditingArticle(article);
    setFormData({
      title: article.title,
      content: article.content,
      is_public: article.is_public,
    });
    setIsCreateDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast({ title: 'Article deleted successfully' });
    } catch (error) {
      toast({ 
        title: 'Error',
        description: 'Failed to delete article',
        variant: 'destructive'
      });
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      is_public: false,
    });
  };

  const getExcerpt = (content: string) => {
    const cleaned = content.replace(/\n/g, ' ').trim();
    return cleaned.length > 100 ? `${cleaned.substring(0, 100)}...` : cleaned;
  };

  const displayedArticles = searchResults.length > 0 ? searchResults : articles ?? [];

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Knowledge Base Management</h1>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => {
              setEditingArticle(null);
              resetForm();
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Article
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingArticle ? 'Edit Article' : 'Create New Article'}
              </DialogTitle>
              <DialogDescription>
                {editingArticle 
                  ? 'Edit the article details below. Changes will be saved when you click Update.'
                  : 'Fill in the article details below. The article will be created when you click Create.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  placeholder="Article Title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  required
                />
              </div>
              <div>
                <Textarea
                  placeholder="Article Content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  required
                  className="min-h-[200px]"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked: boolean) => 
                    setFormData(prev => ({ ...prev, is_public: checked }))
                  }
                />
                <label htmlFor="is_public">Make article public</label>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCreateDialogOpen(false);
                    setEditingArticle(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingArticle ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search Bar */}
      <div className="mb-6 flex gap-2">
        <Input
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="max-w-md"
        />
        <Button onClick={handleSearch}>
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Content Preview</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingArticles ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  Loading articles...
                </TableCell>
              </TableRow>
            ) : displayedArticles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-4">
                  {searchQuery ? 'No articles found matching your search.' : 'No articles available.'}
                </TableCell>
              </TableRow>
            ) : (
              displayedArticles.map((article) => (
                <TableRow key={article.id}>
                  <TableCell className="font-medium">{article.title}</TableCell>
                  <TableCell className="max-w-md">
                    {getExcerpt(article.content)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      article.is_public 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {article.is_public ? 'Public' : 'Private'}
                    </span>
                  </TableCell>
                  <TableCell>
                    {format(new Date(article.created_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    {format(new Date(article.updated_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/kb/${article.id}`} target="_blank">
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(article)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDelete(article.id)}
                          className="text-red-600 dark:text-red-400"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default KnowledgeBaseAdmin; 
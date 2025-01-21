import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tag as TagComponent } from "@/components/ui/tag";
import { useTags } from "@/hooks/useTags";
import { Tag } from "@/types/ticket";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChromePicker } from "react-color";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function TagsAdminPage() {
  const { tags, createTag, deleteTag } = useTags();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const handleDelete = async (tag: Tag) => {
    try {
      await deleteTag(tag.id);
      toast({
        title: "Success",
        description: "Tag deleted successfully",
      });
    } catch (error) {
      console.error("Failed to delete tag:", error);
      toast({
        title: "Error",
        description: "Failed to delete tag",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground mt-2">
            Manage tags and view usage statistics.
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create tag
            </Button>
          </DialogTrigger>
          <CreateTagDialog
            onSuccess={() => {
              setCreateDialogOpen(false);
              toast({
                title: "Success",
                description: "Tag created successfully",
              });
            }}
          />
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tag</TableHead>
              <TableHead>Usage Count</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tags.map((tag) => (
              <TableRow key={tag.id}>
                <TableCell>
                  <TagComponent tag={tag} interactive={false} />
                </TableCell>
                <TableCell>{tag.usage_count}</TableCell>
                <TableCell>
                  {tag.last_used_at
                    ? new Date(tag.last_used_at).toLocaleString()
                    : "Never"}
                </TableCell>
                <TableCell>
                  {new Date(tag.created_at).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tag)}
                    disabled={tag.usage_count > 0}
                    title={
                      tag.usage_count > 0
                        ? "Cannot delete tag that is in use"
                        : "Delete tag"
                    }
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {tags.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center">
                  No tags found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface CreateTagDialogProps {
  onSuccess: () => void;
}

function CreateTagDialog({ onSuccess }: CreateTagDialogProps) {
  const [color, setColor] = useState("#94a3b8");
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [name, setName] = useState("");
  const { createTag } = useTags();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTag({ name, color });
      setName("");
      setColor("#94a3b8");
      onSuccess();
    } catch (error) {
      console.error("Failed to create tag:", error);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Create new tag</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter tag name"
            required
          />
        </div>
        <div className="space-y-2">
          <Label>Color</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setColorPickerOpen(!colorPickerOpen)}
            >
              <div
                className="w-4 h-4 rounded mr-2"
                style={{ backgroundColor: color }}
              />
              {color}
            </Button>
          </div>
          {colorPickerOpen && (
            <div className="absolute z-50">
              <div
                className="fixed inset-0"
                onClick={() => setColorPickerOpen(false)}
              />
              <ChromePicker
                color={color}
                onChange={(color) => setColor(color.hex)}
              />
            </div>
          )}
        </div>
        <Button type="submit" className="w-full">
          Create tag
        </Button>
      </form>
    </DialogContent>
  );
} 
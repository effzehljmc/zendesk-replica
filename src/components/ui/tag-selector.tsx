import * as React from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tag as TagComponent } from "./tag";
import { useTags } from "@/hooks/useTags";
import type { Tag } from "@/types/ticket";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface TagSelectorProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  maxTags?: number;
}

const PREDEFINED_COLORS = [
  { name: "Red", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Yellow", value: "#eab308" },
  { name: "Lime", value: "#84cc16" },
  { name: "Green", value: "#22c55e" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Purple", value: "#a855f7" },
  { name: "Fuchsia", value: "#d946ef" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Slate", value: "#64748b" },
];

export function TagSelector({ selectedTags, onTagsChange, maxTags = 3 }: TagSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const { tags } = useTags();

  const handleSelect = (tag: Tag) => {
    if (selectedTags.some(t => t.id === tag.id)) {
      onTagsChange(selectedTags.filter(t => t.id !== tag.id));
    } else if (selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tag]);
    }
    setOpen(false);
  };

  const handleCreateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCreateDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1">
        {selectedTags.map((tag) => (
          <TagComponent
            key={tag.id}
            tag={tag}
            onRemove={() => handleSelect(tag)}
          />
        ))}
      </div>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between"
            disabled={selectedTags.length >= maxTags}
          >
            {selectedTags.length >= maxTags
              ? `Maximum ${maxTags} tags`
              : "Select tags..."}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start">
          <Command>
            <CommandInput placeholder="Search tags..." />
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center p-4 gap-2">
                <p className="text-sm text-muted-foreground">No tags found.</p>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      type="button"
                      onClick={handleCreateClick}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Create tag
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create new tag</DialogTitle>
                      <DialogDescription>
                        Add a new tag to help categorize tickets. Tags can be used to filter and organize tickets.
                      </DialogDescription>
                    </DialogHeader>
                    <CreateTagForm onSuccess={() => {
                      setCreateDialogOpen(false);
                      setOpen(false);
                    }} />
                  </DialogContent>
                </Dialog>
              </div>
            </CommandEmpty>
            <CommandGroup>
              {tags.map((tag) => (
                <CommandItem
                  key={tag.id}
                  value={tag.name}
                  onSelect={() => handleSelect(tag)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedTags.some(t => t.id === tag.id)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  <TagComponent tag={tag} interactive={false} />
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

interface CreateTagFormProps {
  onSuccess: () => void;
}

function CreateTagForm({ onSuccess }: CreateTagFormProps) {
  const [color, setColor] = React.useState(PREDEFINED_COLORS[0].value);
  const [name, setName] = React.useState("");
  const { createTag } = useTags();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await createTag({ name, color });
      setName("");
      setColor(PREDEFINED_COLORS[0].value);
      onSuccess();
      toast({
        title: "Success",
        description: "Tag created successfully",
      });
    } catch (error) {
      console.error("Failed to create tag:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create tag",
        variant: "destructive",
      });
    }
  };

  return (
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
        <div className="grid grid-cols-6 gap-2">
          {PREDEFINED_COLORS.map((presetColor) => (
            <Button
              key={presetColor.value}
              type="button"
              variant="outline"
              className={cn(
                "h-8 w-8 p-0",
                color === presetColor.value && "ring-2 ring-primary"
              )}
              title={presetColor.name}
              onClick={(e) => {
                e.preventDefault();
                setColor(presetColor.value);
              }}
            >
              <div
                className="h-6 w-6 rounded"
                style={{ backgroundColor: presetColor.value }}
              />
              <span className="sr-only">{presetColor.name}</span>
            </Button>
          ))}
        </div>
      </div>
      <Button type="submit" className="w-full">
        Create tag
      </Button>
    </form>
  );
} 
export default function TagsAdminPage() {
  const { tags, deleteTag } = useTags();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  // ... existing code ...

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
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

  // ... existing code ...
} 
import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTicketNotes } from '@/hooks/useTicketNotes';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { MoreVertical, Trash2, Edit2 } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

interface TicketNotesProps {
  ticketId: string;
}

const visibilityOptions = [
  { value: 'private', label: 'Private', description: 'Only visible to you' },
  { value: 'team', label: 'Team', description: 'Visible to all agents' },
  { value: 'public', label: 'Public', description: 'Visible to everyone' },
];

const visibilityColors = {
  private: 'bg-red-100 text-red-800',
  team: 'bg-blue-100 text-blue-800',
  public: 'bg-green-100 text-green-800',
};

export function TicketNotes({ ticketId }: TicketNotesProps) {
  const [newNote, setNewNote] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'team' | 'public'>('private');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const { notes, isLoading, createNote, updateNote, deleteNote } = useTicketNotes(ticketId);
  const { profile } = useAuth();

  const isAdmin = profile?.roles?.some(r => r.name === 'admin');
  const isAgent = profile?.roles?.some(r => r.name === 'agent');
  const canManageNotes = isAdmin || isAgent;

  // Memoize the notes count to ensure it updates with the notes array
  const notesCount = useMemo(() => notes.length, [notes]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    try {
      await createNote({
        content: newNote.trim(),
        visibility,
      });
      setNewNote('');
      setVisibility('private');
    } catch (error) {
      console.error('Failed to create note:', error);
    }
  };

  const handleUpdate = async (noteId: string, content: string) => {
    try {
      await updateNote(noteId, {
        content: content.trim(),
        visibility,
      });
      setEditingNote(null);
    } catch (error) {
      console.error('Failed to update note:', error);
    }
  };

  const handleDelete = async (noteId: string) => {
    try {
      await deleteNote(noteId);
    } catch (error) {
      console.error('Failed to delete note:', error);
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Notes</h3>
        <Badge variant="outline">{notesCount} notes</Badge>
      </div>

      {canManageNotes && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note..."
            className="min-h-[100px]"
          />
          <div className="flex justify-between items-center">
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as typeof visibility)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select visibility" />
              </SelectTrigger>
              <SelectContent>
                {visibilityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">
                        {option.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit" disabled={!newNote.trim()}>
              Add Note
            </Button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {notes.map((note) => (
          <div
            key={note.id}
            className="border rounded-lg p-4 space-y-2"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{note.createdBy?.fullName}</span>
                  <Badge className={visibilityColors[note.visibility]}>
                    {note.visibility}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}
                </div>
              </div>
              {(isAdmin || note.createdBy?.id === profile?.id) && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content align="end" className="w-[160px]">
                    <DropdownMenu.Item className="cursor-pointer flex items-center p-2 text-sm" onClick={() => setEditingNote(note.id)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenu.Item>
                    <DropdownMenu.Item className="cursor-pointer flex items-center p-2 text-sm text-red-600" onClick={() => handleDelete(note.id)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Root>
              )}
            </div>
            {editingNote === note.id ? (
              <div className="space-y-2">
                <Textarea
                  defaultValue={note.content}
                  className="min-h-[100px]"
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') {
                      setEditingNote(null);
                    }
                  }}
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingNote(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={(e) => {
                      const textarea = e.currentTarget.parentElement?.previousElementSibling as HTMLTextAreaElement;
                      if (textarea) {
                        handleUpdate(note.id, textarea.value);
                      }
                    }}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap">{note.content}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
} 
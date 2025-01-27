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
import { MoreVertical, Trash2, Edit2, ChevronDown } from 'lucide-react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Collapsible from '@radix-ui/react-collapsible';

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
    <Collapsible.Root className="w-full">
      <Collapsible.Trigger asChild>
        <Button
          variant="outline"
          className="w-full flex items-center justify-between py-2 px-3 h-9 text-sm bg-white border"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">Notes</span>
            <Badge variant="secondary" className="text-xs">
              {notesCount}
            </Badge>
          </div>
          <ChevronDown className="h-4 w-4 text-gray-500" />
        </Button>
      </Collapsible.Trigger>

      <Collapsible.Content>
        <div className="pt-3 space-y-3">
          {canManageNotes && (
            <form onSubmit={handleSubmit}>
              <div className="flex gap-2">
                <Textarea
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Add a note..."
                  className="min-h-[38px] text-sm resize-none flex-1"
                />
                <div className="flex gap-2">
                  <Select
                    value={visibility}
                    onValueChange={(value: 'private' | 'team' | 'public') =>
                      setVisibility(value)
                    }
                  >
                    <SelectTrigger className="w-[100px] h-[38px] text-xs">
                      <SelectValue placeholder="Private" />
                    </SelectTrigger>
                    <SelectContent>
                      {visibilityOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="text-xs">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="submit" size="sm" className="h-[38px]">Add</Button>
                </div>
              </div>
            </form>
          )}

          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {notes.map((note, index) => (
              <div
                key={note.id}
                className={`text-sm ${index === 0 ? 'bg-white border' : 'bg-gray-50'} rounded-lg p-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {note.createdBy?.fullName || 'Unknown User'}
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${visibilityColors[note.visibility]}`}
                    >
                      {note.visibility}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(note.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>

                  {canManageNotes && (
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreVertical className="h-3 w-3" />
                        </Button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content className="bg-white border rounded-md shadow-lg p-1">
                        <DropdownMenu.Item
                          className="flex items-center gap-2 px-2 py-1 text-xs hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => setEditingNote(note.id)}
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          className="flex items-center gap-2 px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded cursor-pointer"
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  )}
                </div>

                {editingNote === note.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const textarea = e.currentTarget.querySelector('textarea');
                      if (textarea) {
                        handleUpdate(note.id, textarea.value);
                      }
                    }}
                    className="mt-2 space-y-2"
                  >
                    <Textarea
                      defaultValue={note.content}
                      className="min-h-[60px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" className="h-7 text-xs">
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => setEditingNote(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <p className="text-gray-700 text-sm mt-2">{note.content}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </Collapsible.Content>
    </Collapsible.Root>
  );
}
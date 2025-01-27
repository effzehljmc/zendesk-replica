import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import { TicketMessage } from './TicketMessage';
import { AISuggestions } from '../AISuggestions';
import type { FileUploadResponse } from '@/lib/file-upload';
import { createMessageAttachment } from '@/lib/ticket-attachments';
import { supabase } from '@/lib/supabase';

interface UserRole {
  roles: {
    name: string;
  } | Array<{ name: string }>;
}

interface TicketMessagesProps {
  ticketId: string;
}

export function TicketMessages({ ticketId }: TicketMessagesProps) {
  const [newMessage, setNewMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<FileUploadResponse[]>([]);
  const { messages, isLoading, createMessage, deleteMessage } = useTicketMessages(ticketId);
  const { profile } = useAuth();

  // Check if user is an agent
  const [isAgent, setIsAgent] = useState(false);
  
  // Get user role on mount
  useEffect(() => {
    const checkRole = async () => {
      if (!profile?.id) return;
      
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('roles(name)')
        .eq('user_id', profile.id);

      if (error) {
        console.error('Error fetching user roles:', error);
        return;
      }

      // Check if any of the roles is 'agent' or 'admin'
      const hasAgentOrAdminRole = (userRoles as UserRole[])?.some(role => {
        // Handle both array and object role formats
        const roleName = Array.isArray(role.roles)
          ? role.roles[0]?.name
          : (role.roles as { name: string })?.name;
          
        return roleName === 'agent' || roleName === 'admin';
      }) ?? false;

      setIsAgent(hasAgentOrAdminRole);
    };
    
    checkRole();
  }, [profile?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && pendingAttachments.length === 0) return;

    try {
      await createMessage({
        content: newMessage.trim()
      });

      setNewMessage('');
      setPendingAttachments([]);
    } catch (error) {
      console.error('Failed to create message:', error);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      try {
        const uploadResponse = await createMessageAttachment(
          messages[0].id,
          file,
          {
            fileName: file.name,
            fileSize: file.size,
            contentType: file.type
          }
        );
        setPendingAttachments(prev => [...prev, uploadResponse]);
      } catch (error) {
        console.error('Failed to upload file:', error);
      }
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setPendingAttachments(prev => prev.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <TicketMessage
            key={message.id}
            message={{
              ...message,
              createdAt: new Date(message.createdAt),
              user: {
                id: message.user?.id || 'unknown',
                fullName: message.user?.fullName || 'Unknown',
                email: message.user?.email || ''
              }
            }}
            onAttachmentUpload={async (_, attachment) => {
              // Handle attachment upload
              console.log('Attachment uploaded:', attachment);
            }}
            onAttachmentDelete={async (_, attachmentId) => {
              // Handle attachment deletion
              console.log('Attachment deleted:', attachmentId);
            }}
            onMessageDelete={async (messageId) => {
              await deleteMessage(messageId);
            }}
            isCurrentUser={message.user?.id === profile?.id}
            isAgent={isAgent}
          />
        ))}
      </div>

      {isAgent && (
        <AISuggestions ticketId={ticketId} className="mt-4" />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="min-h-[100px]"
        />

        <div className="flex justify-between items-center">
          <div className="flex gap-2">
            <input
              type="file"
              multiple
              onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer bg-secondary hover:bg-secondary/80 text-secondary-foreground px-4 py-2 rounded-md text-sm font-medium"
            >
              Attach Files
            </label>
          </div>

          <Button type="submit" disabled={!newMessage.trim() && pendingAttachments.length === 0}>
            Send Message
          </Button>
        </div>

        {pendingAttachments.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Attachments:</div>
            {pendingAttachments.map((attachment, index) => (
              <div key={index} className="flex items-center justify-between bg-secondary/20 p-2 rounded">
                <div className="flex items-center gap-2">
                  <span className="text-sm">{attachment.fileName}</span>
                </div>
                <Button
                  onClick={() => handleRemoveAttachment(index)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </form>
    </div>
  );
}
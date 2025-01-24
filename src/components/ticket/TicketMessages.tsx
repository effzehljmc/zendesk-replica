import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTicketMessages } from '@/hooks/useTicketMessages';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Trash2 } from 'lucide-react';
import { TicketMessage } from './TicketMessage';
import { FileAttachment } from './FileAttachment';
import type { FileUploadResponse } from '@/lib/file-upload';
import { createMessageAttachment } from '@/lib/ticket-attachments';

interface TicketMessagesProps {
  ticketId: string;
}

export function TicketMessages({ ticketId }: TicketMessagesProps) {
  const [newMessage, setNewMessage] = useState('');
  const [pendingAttachments, setPendingAttachments] = useState<FileUploadResponse[]>([]);
  const { messages, isLoading, createMessage, deleteMessage } = useTicketMessages(ticketId);
  const { profile } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() && pendingAttachments.length === 0) return;

    try {
      const message = await createMessage({
        content: newMessage.trim(),
      });

      // Create attachments for the new message
      if (pendingAttachments.length > 0) {
        await Promise.all(
          pendingAttachments.map(attachment =>
            createMessageAttachment(message.id, attachment)
          )
        );
      }

      setNewMessage('');
      setPendingAttachments([]);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleAttachmentUpload = async (messageId: string, attachment: FileUploadResponse) => {
    // For new message composition, store attachments temporarily
    if (!messageId) {
      setPendingAttachments(current => [...current, attachment]);
      return;
    }

    // For existing messages, create the attachment immediately
    await createMessageAttachment(messageId, attachment);
  };

  const handleAttachmentDelete = async (messageId: string, attachmentId: string) => {
    // For pending attachments in new message
    if (!messageId) {
      setPendingAttachments(current => 
        current.filter(a => a.storagePath !== attachmentId)
      );
      return;
    }
  };

  const handleMessageDelete = async (messageId: string) => {
    try {
      await deleteMessage(messageId);
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-32" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Messages</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="min-h-[100px]"
        />
        
        {/* Display pending attachments */}
        {pendingAttachments.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Pending Attachments:</div>
            <div className="space-y-2">
              {pendingAttachments.map((attachment) => (
                <div key={attachment.storagePath} className="flex items-center gap-2">
                  <span className="text-sm">{attachment.fileName}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAttachmentDelete('', attachment.storagePath)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <FileAttachment
            ticketId={ticketId}
            onFileUploaded={(fileData) => handleAttachmentUpload('', fileData)}
          />
          <Button 
            type="submit" 
            disabled={!newMessage.trim() && pendingAttachments.length === 0}
          >
            Send Message
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        {messages.map((message) => (
          <TicketMessage
            key={message.id}
            message={{
              id: message.id,
              content: message.content,
              createdAt: new Date(message.createdAt),
              user: {
                id: message.userId,
                fullName: message.user?.fullName ?? null,
                email: message.user?.email ?? ''
              },
              attachments: message.attachments
            }}
            ticketId={ticketId}
            onAttachmentUpload={handleAttachmentUpload}
            onAttachmentDelete={handleAttachmentDelete}
            onMessageDelete={handleMessageDelete}
            isCurrentUser={message.userId === profile?.id}
          />
        ))}
      </div>
    </div>
  );
} 
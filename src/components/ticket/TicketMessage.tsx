import { FileAttachment, AttachmentPreview } from './FileAttachment';
import { getFileUrl } from '@/lib/file-upload';
import { createMessageAttachment, deleteMessageAttachment } from '@/lib/ticket-attachments';
import type { FileUploadResponse } from '@/lib/file-upload';
import { useToast } from '@/components/ui/use-toast';
import { MoreVertical, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TicketMessageProps {
  message: {
    id: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      fullName: string | null;
      email: string;
    };
    attachments?: {
      id: string;
      fileName: string;
      fileSize: number;
      contentType: string;
      storagePath: string;
    }[];
  };
  ticketId: string;
  onAttachmentUpload?: (messageId: string, attachment: FileUploadResponse) => void;
  onAttachmentDelete?: (messageId: string, attachmentId: string) => void;
  onMessageDelete?: (messageId: string) => void;
  isCurrentUser?: boolean;
}

export function TicketMessage({
  message,
  ticketId,
  onAttachmentUpload,
  onAttachmentDelete,
  onMessageDelete,
  isCurrentUser
}: TicketMessageProps) {
  const { toast } = useToast();

  const handleAttachmentUpload = async (fileData: FileUploadResponse) => {
    try {
      await createMessageAttachment(message.id, fileData);
      onAttachmentUpload?.(message.id, fileData);
      toast({
        title: 'Attachment added',
        description: `Successfully added ${fileData.fileName} to the message`
      });
    } catch (error) {
      toast({
        title: 'Error adding attachment',
        description: error instanceof Error ? error.message : 'Failed to add attachment',
        variant: 'destructive'
      });
    }
  };

  const handleAttachmentDelete = async (attachmentId: string) => {
    try {
      await deleteMessageAttachment(attachmentId);
      onAttachmentDelete?.(message.id, attachmentId);
      toast({
        title: 'Attachment deleted',
        description: 'Successfully deleted the attachment'
      });
    } catch (error) {
      toast({
        title: 'Error deleting attachment',
        description: error instanceof Error ? error.message : 'Failed to delete attachment',
        variant: 'destructive'
      });
    }
  };

  const handleMessageDelete = async () => {
    try {
      onMessageDelete?.(message.id);
      toast({
        title: 'Message deleted',
        description: 'Successfully deleted the message'
      });
    } catch (error) {
      toast({
        title: 'Error deleting message',
        description: error instanceof Error ? error.message : 'Failed to delete message',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{message.user.fullName}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            {message.createdAt.toLocaleString()}
          </div>
        </div>
        {isCurrentUser && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleMessageDelete} className="text-destructive">
                <Trash className="h-4 w-4 mr-2" />
                Delete message
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="whitespace-pre-wrap">{message.content}</div>

      {/* Attachments */}
      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-2 flex flex-col gap-2">
          {message.attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              fileName={attachment.fileName}
              fileSize={attachment.fileSize}
              url={getFileUrl(attachment.storagePath)}
              onDelete={
                isCurrentUser
                  ? () => handleAttachmentDelete(attachment.id)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {/* File upload button - only show for current user's messages */}
      {isCurrentUser && (
        <div className="mt-2">
          <FileAttachment
            ticketId={ticketId}
            onFileUploaded={handleAttachmentUpload}
          />
        </div>
      )}
    </div>
  );
} 
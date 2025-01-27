import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { FileAttachment } from './FileAttachment';
import { useToast } from '@/components/ui/use-toast';
import { Trash2 } from 'lucide-react';
import { createMessageAttachment } from '@/lib/ticket-attachments';
import type { FileUploadResponse } from '@/lib/file-upload';

interface TicketMessageProps {
  message: {
    id: string;
    content: string;
    createdAt: Date;
    user: {
      id: string;
      fullName: string;
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
  onAttachmentUpload: (messageId: string, attachment: FileUploadResponse) => Promise<void>;
  onAttachmentDelete: (messageId: string, attachmentId: string) => Promise<void>;
  onMessageDelete: (messageId: string) => Promise<void>;
  isCurrentUser: boolean;
  isAgent: boolean;
}

export function TicketMessage({
  message,
  onAttachmentUpload,
  onAttachmentDelete,
  onMessageDelete,
  isCurrentUser,
  isAgent
}: TicketMessageProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleFileUpload = async (file: File) => {
    try {
      const fileData = {
        fileName: file.name,
        fileSize: file.size,
        contentType: file.type
      };
      
      const attachment = await createMessageAttachment(message.id, file, fileData);
      await onAttachmentUpload(message.id, attachment);
      
      toast({
        title: 'File uploaded',
        description: `Successfully uploaded ${file.name}`
      });
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await onMessageDelete(message.id);
      toast({
        title: 'Message deleted',
        description: 'Successfully deleted the message'
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete message',
        variant: 'destructive'
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAttachmentDelete = async (attachmentId: string) => {
    try {
      await onAttachmentDelete(message.id, attachmentId);
      toast({
        title: 'Attachment deleted',
        description: 'Successfully deleted the attachment'
      });
    } catch (error) {
      console.error('Error deleting attachment:', error);
      toast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Failed to delete attachment',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-medium">{message.user.fullName}</div>
          <div className="text-sm text-muted-foreground">
            {message.createdAt.toLocaleString()}
          </div>
        </div>
        {(isCurrentUser || isAgent) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="mt-2 whitespace-pre-wrap">{message.content}</div>

      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-4 space-y-2">
          {message.attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center justify-between rounded-md border p-2"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{attachment.fileName}</span>
                <span className="text-sm text-muted-foreground">
                  ({Math.round(attachment.fileSize / 1024)}KB)
                </span>
              </div>
              {(isCurrentUser || isAgent) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAttachmentDelete(attachment.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {(isCurrentUser || isAgent) && (
        <div className="mt-4">
          <FileAttachment
            onFileUploaded={handleFileUpload}
            disabled={isDeleting}
          />
        </div>
      )}
    </Card>
  );
}
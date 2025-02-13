import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { FileAttachment } from './FileAttachment';
import { useToast } from '@/components/ui/use-toast';
import { Trash2 } from 'lucide-react';
import { createMessageAttachment } from '@/lib/ticket-attachments';
import type { FileUploadResponse } from '@/lib/file-upload';
import { HelpMessage } from './HelpMessage';
import { cn } from '@/lib/utils';

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

  // Parse message content to check if it's a help message
  const renderMessageContent = () => {
    try {
      const parsedContent = JSON.parse(message.content);
      if (parsedContent.type === 'help_message') {
        return (
          <HelpMessage
            ticketId={parsedContent.data.ticketId}
            articleId={parsedContent.data.articleId}
            articleTitle={parsedContent.data.articleTitle}
          />
        );
      }
    } catch (e) {
      // If parsing fails, treat as regular message
      }
      return <div className="mt-2 whitespace-pre-wrap">{message.content}</div>;
  };

  const isCustomer = !isAgent && !isCurrentUser;

  return (
    <div className={cn("flex w-full", {
      "justify-end": isCustomer,
      "justify-start": !isCustomer
    })}>
      <Card className={cn("p-4 max-w-[80%]", {
        "bg-primary/10": isCustomer
      })}>
        <div className={cn("flex items-start gap-4", {
          "flex-row-reverse": isCustomer
        })}>
          <div className={cn("flex-1", {
            "text-right": isCustomer
          })}>
            <div className="font-medium">{message.user.fullName}</div>
            <div className="text-sm text-muted-foreground">
              {message.createdAt.toLocaleString()}
            </div>
            <div className={cn("mt-2 whitespace-pre-wrap", {
              "text-right": isCustomer
            })}>
              {renderMessageContent()}
            </div>
          </div>

          {(isCurrentUser || isAgent) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              disabled={isDeleting}
              className="shrink-0"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className={cn("mt-4 space-y-2", {
            "text-right": isCustomer
          })}>
            {message.attachments.map((attachment) => (
              <div
                key={attachment.id}
                className={cn("flex items-center gap-4 rounded-md border p-2", {
                  "flex-row-reverse": isCustomer
                })}
              >
                <div className={cn("flex items-center gap-2", {
                  "flex-row-reverse": isCustomer
                })}>
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
          <div className={cn("mt-4", {
            "text-right": isCustomer
          })}>
            <FileAttachment
              onFileUploaded={handleFileUpload}
              disabled={isDeleting}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
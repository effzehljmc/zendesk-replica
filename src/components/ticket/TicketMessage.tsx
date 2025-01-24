import { useState } from 'react';
import { FileAttachment } from './FileAttachment';
import { createMessageAttachment } from '@/lib/ticket-attachments';
import type { FileUploadResponse } from '@/lib/file-upload';
import { useToast } from '@/components/ui/use-toast';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { HelpMessage } from './HelpMessage';
import { supabase } from '@/lib/supabase';

interface MessageUser {
  id: string;
  fullName: string | null;
  email: string;
}

interface MessageAttachment {
  id: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  storagePath: string;
}

interface TicketMessageProps {
  message: {
    id: string;
    content: string;
    createdAt: Date;
    user: MessageUser;
    attachments?: MessageAttachment[];
  };
  ticketId: string;
  onAttachmentUpload: (messageId: string, attachment: FileUploadResponse) => Promise<void>;
  onAttachmentDelete: (messageId: string, attachmentId: string) => Promise<void>;
  onMessageDelete: (messageId: string) => Promise<void>;
  isCurrentUser: boolean;
}

export function TicketMessage({
  message,
  ticketId,
  onAttachmentUpload,
  onAttachmentDelete,
  onMessageDelete,
  isCurrentUser,
}: TicketMessageProps) {
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleAttachmentUpload = async (fileData: FileUploadResponse) => {
    try {
      await createMessageAttachment(message.id, fileData);
      onAttachmentUpload(message.id, fileData);
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

  const handleMessageDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this message?')) return;
    setIsDeleting(true);
    try {
      await onMessageDelete(message.id);
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Parse HelpMessage component if present
  const renderMessageContent = (content: string) => {
    const helpMessageMatch = content.match(/<HelpMessage.*?\/>/);
    if (helpMessageMatch) {
      const propsMatch = content.match(/ticketId="(.*?)" articleId="(.*?)" articleTitle="(.*?)"/);
      if (propsMatch) {
        const [_, ticketId, articleId, articleTitle] = propsMatch;
        const parts = content.split(helpMessageMatch[0]);
        return (
          <>
            {parts[0]}
            <HelpMessage
              ticketId={ticketId}
              articleId={articleId}
              articleTitle={articleTitle}
            />
            {parts[1]}
          </>
        );
      }
    }
    return content;
  };

  return (
    <Card className="p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="font-medium">{message.user.fullName || message.user.email}</div>
          <div className="text-sm text-muted-foreground">
            {message.createdAt.toLocaleString()}
          </div>
        </div>
        {isCurrentUser && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMessageDelete}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="whitespace-pre-wrap">{renderMessageContent(message.content)}</div>
      {message.attachments && message.attachments.length > 0 && (
        <div className="mt-4 space-y-2">
          {message.attachments.map((attachment) => {
            const fileUrl = supabase.storage
              .from('chat_attachments')
              .getPublicUrl(attachment.storagePath)
              .data.publicUrl;
              
            const handleDownload = async () => {
              try {
                const response = await fetch(fileUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = attachment.fileName;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              } catch (error) {
                console.error('Download error:', error);
              }
            };
              
            return (
              <div key={attachment.id} className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {attachment.fileName}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="ml-2"
                >
                  Download
                </Button>
                {isCurrentUser && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onAttachmentDelete(message.id, attachment.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {isCurrentUser && (
        <div className="mt-4">
          <FileAttachment
            ticketId={ticketId}
            onFileUploaded={handleAttachmentUpload}
          />
        </div>
      )}
    </Card>
  );
} 
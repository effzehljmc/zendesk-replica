import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/ui/icons';
import { uploadTicketAttachment, type FileUploadResponse } from '@/lib/file-upload';
import { useToast } from '@/components/ui/use-toast';
import { formatBytes } from '@/lib/utils';

interface FileAttachmentProps {
  ticketId: string;
  onFileUploaded: (fileData: FileUploadResponse) => void;
  disabled?: boolean;
}

export function FileAttachment({ ticketId, onFileUploaded, disabled }: FileAttachmentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Basic validation
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      toast({
        title: 'File too large',
        description: 'Maximum file size is 20MB',
        variant: 'destructive'
      });
      return;
    }

    try {
      setIsUploading(true);
      const fileData = await uploadTicketAttachment(file, ticketId);
      onFileUploaded(fileData);
      toast({
        title: 'File uploaded',
        description: `Successfully uploaded ${file.name}`
      });
    } catch (error) {
      toast({
        title: 'Upload failed',
        description: error instanceof Error ? error.message : 'Failed to upload file',
        variant: 'destructive'
      });
    } finally {
      setIsUploading(false);
      // Reset the input
      event.target.value = '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || isUploading}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        {isUploading ? (
          <>
            <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Icons.paperclip className="mr-2 h-4 w-4" />
            Attach File
          </>
        )}
      </Button>
    </div>
  );
}

interface AttachmentPreviewProps {
  fileName: string;
  fileSize: number;
  url: string;
  onDelete?: () => void;
}

export function AttachmentPreview({
  fileName,
  fileSize,
  url,
  onDelete
}: AttachmentPreviewProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border p-2 text-sm">
      <Icons.file className="h-4 w-4 flex-shrink-0" />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 truncate hover:underline"
      >
        {fileName}
        <span className="ml-2 text-muted-foreground">({formatBytes(fileSize)})</span>
      </a>
      {onDelete && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Icons.trash className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
} 
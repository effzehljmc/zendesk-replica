import { useState } from 'react';
import { Button } from '../ui/button';
import { Upload } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface FileAttachmentProps {
  onFileUploaded: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function FileAttachment({ onFileUploaded, disabled }: FileAttachmentProps) {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      await onFileUploaded(file);
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
    } finally {
      setIsUploading(false);
      event.target.value = ''; // Reset the input
    }
  };

  return (
    <div>
      <input
        type="file"
        id="file-input"
        className="hidden"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
      />
      <label htmlFor="file-input">
        <Button variant="outline" size="sm" asChild disabled={disabled || isUploading}>
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>{isUploading ? 'Uploading...' : 'Upload File'}</span>
          </div>
        </Button>
      </label>
    </div>
  );
}
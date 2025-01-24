import { v4 as uuidv4 } from 'uuid';
import { supabase } from './supabase';

export interface FileUploadResponse {
  fileName: string;
  fileSize: number;
  contentType: string;
  storagePath: string;
}

export async function uploadTicketAttachment(
  file: File,
  ticketId: string
): Promise<FileUploadResponse> {
  try {
    // Create a unique file path to prevent collisions
    const fileExtension = file.name.split('.').pop();
    const uniqueFileName = `${ticketId}/${uuidv4()}.${fileExtension}`;
    // Remove the 'public/' prefix as it's not needed
    const storagePath = uniqueFileName;

    // Upload the file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('chat_attachments')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error details:', uploadError);
      throw new Error(`Error uploading file: ${uploadError.message}`);
    }

    // Return the file metadata
    return {
      fileName: file.name,
      fileSize: file.size,
      contentType: file.type,
      storagePath
    };
  } catch (error) {
    console.error('File upload error:', error);
    throw error;
  }
}

export function getFileUrl(storagePath: string): string {
  return supabase.storage
    .from('chat_attachments')
    .getPublicUrl(storagePath)
    .data.publicUrl;
}

export async function deleteTicketAttachment(storagePath: string): Promise<void> {
  try {
    const { error } = await supabase.storage
      .from('chat_attachments')
      .remove([storagePath]);

    if (error) {
      console.error('Delete error details:', error);
      throw new Error(`Error deleting file: ${error.message}`);
    }
  } catch (error) {
    console.error('File deletion error:', error);
    throw error;
  }
} 
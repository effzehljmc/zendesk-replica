import { deleteTicketAttachment } from './file-upload';
import { supabase } from './supabase';

interface FileData {
  fileName: string;
  fileSize: number;
  contentType: string;
}

export async function createMessageAttachment(
  messageId: string,
  file: File,
  fileData: FileData
) {
  try {
    const filePath = `attachments/${Date.now()}_${fileData.fileName}`;
    
    // Upload file to storage
    const { error: uploadError } = await supabase.storage
      .from('ticket-attachments')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    // Create attachment record
    const { data: attachmentData, error: attachmentError } = await supabase
      .from('ticket_message_attachments')
      .insert([
        {
          ticket_message_id: messageId,
          file_name: fileData.fileName,
          file_size: fileData.fileSize,
          content_type: fileData.contentType,
          storage_path: filePath
        }
      ])
      .select()
      .single();

    if (attachmentError) {
      throw attachmentError;
    }

    return {
      id: attachmentData.id,
      fileName: attachmentData.file_name,
      fileSize: attachmentData.file_size,
      contentType: attachmentData.content_type,
      storagePath: attachmentData.storage_path
    };
  } catch (error) {
    console.error('Error creating message attachment:', error);
    throw error;
  }
}

export async function deleteMessageAttachment(attachmentId: string) {
  try {
    const { data: attachment, error: fetchError } = await supabase
      .from('ticket_message_attachments')
      .select('storage_path')
      .eq('id', attachmentId)
      .single();

    if (fetchError) {
      throw fetchError;
    }

    // Delete from storage
    await deleteTicketAttachment(attachment.storage_path);

    // Delete from database
    const { error: deleteError } = await supabase
      .from('ticket_message_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      throw deleteError;
    }
  } catch (error) {
    console.error('Error deleting message attachment:', error);
    throw error;
  }
}
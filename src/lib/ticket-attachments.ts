import { FileUploadResponse, deleteTicketAttachment } from './file-upload';
import { supabase } from './supabase';

export async function createMessageAttachment(
  messageId: string,
  fileData: FileUploadResponse
) {
  const { data, error } = await supabase
    .from('ticket_message_attachments')
    .insert({
      ticket_message_id: messageId,
      file_name: fileData.fileName,
      file_size: fileData.fileSize,
      content_type: fileData.contentType,
      storage_path: fileData.storagePath
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Error creating attachment: ${error.message}`);
  }

  return data;
}

export async function deleteMessageAttachment(attachmentId: string) {
  // First get the attachment to get the storage path
  const { data: attachment, error: fetchError } = await supabase
    .from('ticket_message_attachments')
    .select('storage_path')
    .eq('id', attachmentId)
    .single();

  if (fetchError) {
    throw new Error(`Error fetching attachment: ${fetchError.message}`);
  }

  // Delete from storage first
  await deleteTicketAttachment(attachment.storage_path);

  // Then delete from database
  const { error: deleteError } = await supabase
    .from('ticket_message_attachments')
    .delete()
    .eq('id', attachmentId);

  if (deleteError) {
    throw new Error(`Error deleting attachment: ${deleteError.message}`);
  }
} 
import { supabase } from './supabase';

// Storage bucket name for documents
const DOCUMENTS_BUCKET = 'documents';

export const uploadDocument = async (file: File, userId: string) => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;
    
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(fileName, file);

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getDocumentUrl = (path: string) => {
  const { data } = supabase.storage
    .from(DOCUMENTS_BUCKET)
    .getPublicUrl(path);

  return data.publicUrl;
};

export const deleteDocument = async (path: string) => {
  try {
    const { error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([path]);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error };
  }
};

export const listUserDocuments = async (userId: string) => {
  try {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list(userId);

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const downloadFile = async (path: string): Promise<Blob | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .download(path);

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error downloading file:', error);
    return null;
  }
};

/**
 * Get the extracted text content from a stored document
 * This retrieves the 'content' column from the documents table
 */
export const getStoredDocumentText = async (
  documentId: string,
  userId: string
): Promise<string | null> => {
  try {
    // Validate inputs
    if (!documentId || !userId || 
        documentId === 'undefined' || documentId === 'null' ||
        userId === 'undefined' || userId === 'null') {
      console.error('Invalid document or user ID:', { documentId, userId });
      return null;
    }

    const { data, error } = await supabase
      .from('documents')
      .select('content')
      .eq('id', documentId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching document text:', error);
      return null;
    }

    return data?.content || null;
  } catch (error) {
    console.error('Error in getStoredDocumentText:', error);
    return null;
  }
};

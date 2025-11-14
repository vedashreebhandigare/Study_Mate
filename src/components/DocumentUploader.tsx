/**
 * Document Uploader Component
 * Pure upload functionality - NO quiz generation
 * Shows list of uploaded documents with management options
 */

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload, FileText, Loader2, CheckCircle, X, Trash2 } from 'lucide-react';
import { GlassButton } from './GlassButton';
import { FileProcessor, ProcessedFile } from '../lib/file-processor';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

interface UploadedDocument {
  id: string;
  title: string;
  content: string;
  fileSize: number;
  uploadedAt: string;
  userId: string;
}

interface DocumentUploaderProps {
  onDocumentUploaded?: (doc: UploadedDocument) => void;
  onDocumentsChanged?: () => void;
}

export function DocumentUploader({ onDocumentUploaded, onDocumentsChanged }: DocumentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(true);

  // Load existing documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoadingDocs(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        setIsLoadingDocs(false);
        return;
      }

      // Fetch documents from database
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        toast.error('Failed to load documents');
      } else {
        const mappedDocs: UploadedDocument[] = (data || []).map(doc => ({
          id: doc.id,
          title: doc.title,
          content: doc.content,
          fileSize: doc.file_size || 0,
          uploadedAt: doc.created_at,
          userId: doc.user_id,
        }));
        setDocuments(mappedDocs);
        console.log('📚 Loaded documents:', mappedDocs.length);
      }
    } catch (error) {
      console.error('Error in loadDocuments:', error);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileUpload(droppedFile);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileUpload(selectedFile);
    }
  };

  const handleFileUpload = async (file: File) => {
    console.log('📁 File selected:', file.name, file.type, file.size);

    // Validate file type
    if (!FileProcessor.isSupportedFile(file)) {
      toast.error('Unsupported file type. Please upload PDF, DOCX, or TXT files.');
      return;
    }

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 20MB.');
      return;
    }

    setIsUploading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in to upload documents');
        setIsUploading(false);
        return;
      }

      // Process file to extract text
      console.log('⚙️ Processing file...');
      const processedFile = await FileProcessor.processFile(file);
      
      // Validate processed file
      if (!processedFile || !processedFile.text) {
        console.error('File processing returned invalid data:', processedFile);
        toast.error('Failed to extract text from file. The PDF might be image-based or protected.');
        setIsUploading(false);
        return;
      }

      if (processedFile.text.trim().length === 0) {
        toast.error('No text found in file. If this is a PDF, it might be scanned images. Try using OCR or a text-based PDF.');
        setIsUploading(false);
        return;
      }
      
      // Additional validation: minimum content length
      if (processedFile.text.trim().length < 100) {
        toast.error('File contains very little text. Please ensure the document has meaningful content.');
        setIsUploading(false);
        return;
      }

      console.log('✅ File processed, content length:', processedFile.text.length);

      // Upload to Supabase Storage
      const fileName = `${user.id}/${Date.now()}_${file.name}`;
      console.log('☁️ Uploading to Supabase Storage:', fileName);
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);
      
      if (uploadError) {
        console.error('Storage upload error:', uploadError);
        toast.error('Failed to upload file to storage');
        setIsUploading(false);
        return;
      }

      // Save document metadata to database
      console.log('💾 Saving to database...');
      const { data: docData, error: dbError } = await supabase
        .from('documents')
        .insert({
          user_id: user.id,
          name: file.name,
          title: file.name,
          content: processedFile.text,
          file_size: file.size,
          file_path: fileName,
        })
        .select()
        .single();

      if (dbError) {
        console.error('Database error:', dbError);
        toast.error('Failed to save document');
        setIsUploading(false);
        return;
      }

      console.log('✅ Document saved successfully:', docData);

      // Add to local state
      const newDoc: UploadedDocument = {
        id: docData.id,
        title: docData.title,
        content: docData.content,
        fileSize: docData.file_size,
        uploadedAt: docData.created_at,
        userId: docData.user_id,
      };

      setDocuments(prev => [newDoc, ...prev]);
      
      toast.success(`${file.name} uploaded successfully!`);
      
      // Notify parent
      onDocumentUploaded?.(newDoc);
      onDocumentsChanged?.();

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload document. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docTitle: string) => {
    if (!confirm(`Delete "${docTitle}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', docId);

      if (error) {
        console.error('Delete error:', error);
        toast.error('Failed to delete document');
        return;
      }

      setDocuments(prev => prev.filter(doc => doc.id !== docId));
      toast.success('Document deleted');
      onDocumentsChanged?.();

    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete document');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Upload Zone */}
      <motion.div
        className={`glass-panel rounded-3xl p-12 border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? 'border-purple-500 bg-purple-500/10'
            : 'border-white/20 hover:border-white/40'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        whileHover={!isUploading ? { scale: 1.01 } : {}}
      >
        <div className="text-center">
          <motion.div
            className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 mb-6"
            animate={{
              scale: isDragging ? 1.1 : isUploading ? [1, 1.05, 1] : 1,
              rotate: isDragging ? 360 : 0,
            }}
            transition={{ 
              duration: isDragging ? 0.3 : 0,
              repeat: isUploading ? Infinity : 0,
              repeatType: 'reverse'
            }}
          >
            {isUploading ? (
              <Loader2 className="w-10 h-10 text-white animate-spin" />
            ) : (
              <Upload className="w-10 h-10 text-white" />
            )}
          </motion.div>

          <h3 className="text-2xl text-white mb-2">
            {isUploading ? 'Uploading...' : 'Drop your document here'}
          </h3>
          <p className="text-white/60 mb-6">
            {isUploading 
              ? 'Processing and saving your file...'
              : 'or click to browse • PDF, DOCX, TXT • Max 20MB'
            }
          </p>

          {!isUploading && (
            <>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
                id="document-upload"
              />
              <label htmlFor="document-upload">
                <GlassButton 
                  variant="secondary" 
                  onClick={() => document.getElementById('document-upload')?.click()}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Browse Files
                </GlassButton>
              </label>
            </>
          )}
        </div>
      </motion.div>

      {/* Document List */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl text-white">Your Documents</h3>
          <span className="text-white/60 text-sm">
            {documents.length} {documents.length === 1 ? 'document' : 'documents'}
          </span>
        </div>

        {isLoadingDocs ? (
          <div className="glass-panel rounded-2xl p-8 text-center">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-white/60">Loading documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <motion.div
            className="glass-panel rounded-2xl p-8 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <FileText className="w-8 h-8 text-purple-400" />
            </div>
            <h4 className="text-lg text-white mb-2">No documents yet</h4>
            <p className="text-white/60">
              Upload your first document to get started
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div className="space-y-3">
              {documents.map((doc, index) => (
                <motion.div
                  key={doc.id}
                  className="glass-panel rounded-2xl p-5 relative group"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                >
                  <div className="flex items-center gap-4">
                    {/* File Icon */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white truncate mb-1">{doc.title}</h4>
                      <div className="flex items-center gap-3 text-sm text-white/60">
                        <span>{formatFileSize(doc.fileSize)}</span>
                        <span>•</span>
                        <span>{formatDate(doc.uploadedAt)}</span>
                      </div>
                    </div>

                    {/* Delete Button */}
                    <motion.button
                      onClick={() => handleDeleteDocument(doc.id, doc.title)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 transition-colors opacity-0 group-hover:opacity-100"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      title="Delete document"
                    >
                      <Trash2 className="w-5 h-5 text-red-400" />
                    </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

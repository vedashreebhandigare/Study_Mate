/**
 * Advanced Quiz Generator Component
 * Handles file upload, processing, and quiz generation with premium UI
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileProcessor, ProcessedFile } from '../lib/file-processor';
import { DifficultyLevel, GenerationProgress, QuizGenerationResult } from '../lib/quiz-generator-advanced';
import { generateAndValidateQuiz, getQualityMessage } from '../lib/quiz-orchestrator';
import { QuizValidator } from '../lib/quiz-validator';
import { Upload, FileText, Brain, CheckCircle, AlertCircle, Loader2, Sparkles, Award } from 'lucide-react';
import { GlassButton } from './GlassButton';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';

interface QuizGeneratorAdvancedProps {
  onQuizGenerated: (result: QuizGenerationResult) => void;
  onDocumentProcessed?: (docData: { id: string; title: string; content: string }) => void;
}

export function QuizGeneratorAdvanced({ onQuizGenerated, onDocumentProcessed }: QuizGeneratorAdvancedProps) {
  const [file, setFile] = useState<File | null>(null);
  const [processedFile, setProcessedFile] = useState<ProcessedFile | null>(null);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('undergraduate');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

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
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileSelect = async (selectedFile: File) => {
    console.log('📁 File selected:', selectedFile.name, selectedFile.type, selectedFile.size);
    setError(null);
    setProcessedFile(null);
    setFile(selectedFile);

    // Validate file type
    if (!FileProcessor.isSupportedFile(selectedFile)) {
      console.error('❌ Unsupported file type');
      setError('Unsupported file type. Please upload PDF, DOCX, or TXT files.');
      setFile(null);
      return;
    }

    // Process file
    setIsProcessing(true);
    try {
      console.log('⚙️ Processing file...');
      
      // Upload to Supabase Storage
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const fileName = `${user.id}/${Date.now()}_${selectedFile.name}`;
        console.log('☁️ Uploading to Supabase:', fileName);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, selectedFile);
        
        if (uploadError) {
          console.error('❌ Supabase upload error:', uploadError);
        } else {
          console.log('✅ File uploaded to Supabase:', uploadData);
          toast.success('File uploaded to cloud storage');
        }
      }

      // Process file locally
      const processed = await FileProcessor.processFile(selectedFile);
      console.log('✅ File processed:', {
        fileName: processed.fileName,
        wordCount: processed.wordCount,
        fileSize: processed.fileSize,
        processingTime: processed.processingTime
      });
      
      setProcessedFile(processed);
      toast.success('File processed successfully!');
      
      // Callback for document tracking (for flashcards)
      if (onDocumentProcessed) {
        onDocumentProcessed({
          id: `${Date.now()}_${processed.fileName}`,
          title: processed.fileName,
          content: processed.text,
        });
      }
    } catch (err) {
      console.error('❌ File processing error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to process file';
      
      // Provide more helpful error messages
      let userMessage = errorMessage;
      if (errorMessage.includes('PDF processing failed') || errorMessage.includes('worker')) {
        userMessage = 'PDF processing is temporarily unavailable. Please try a DOCX or TXT file instead.';
      }
      
      setError(userMessage);
      setFile(null);
      toast.error(userMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGenerate = async () => {
    if (!processedFile) return;

    console.log('🧠 Starting quiz generation...');
    console.log('📊 Content length:', processedFile.text.length, 'characters');
    console.log('🎯 Difficulty:', difficulty);

    setIsGenerating(true);
    setError(null);

    try {
      // Use orchestrator with automatic retry and quality validation
      const result = await generateAndValidateQuiz(
        processedFile.text,
        { difficulty },
        (progressUpdate) => {
          console.log('📈 Progress:', progressUpdate.stage, progressUpdate.progress + '%', progressUpdate.message);
          setProgress(progressUpdate);
        }
      );

      console.log('✅ Quiz generated successfully!', {
        questionsCount: result.questions.length,
        qualityScore: result.validation.score,
        qualityLevel: result.qualityLevel.level,
        attempt: result.attempt,
        difficulty: result.metadata.difficulty,
        generationTime: result.metadata.generationTime
      });

      // Show quality-aware toast message
      const qualityMsg = getQualityMessage(result.qualityLevel.level);
      if (result.qualityLevel.level === 'excellent' || result.qualityLevel.level === 'good') {
        toast.success(qualityMsg);
      } else if (result.qualityLevel.level === 'acceptable') {
        toast.warning(qualityMsg);
      } else {
        toast.error(qualityMsg);
      }

      if (result.warning) {
        toast.info(result.warning, { duration: 5000 });
      }

      onQuizGenerated(result);
    } catch (err) {
      console.error('❌ Quiz generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate quiz');
      toast.error('Failed to generate quiz');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* File Upload Zone */}
      {!processedFile && (
        <motion.div
          className={`glass-panel rounded-3xl p-8 border-2 border-dashed transition-all ${
            isDragging
              ? 'border-purple-400 bg-purple-500/10'
              : 'border-white/20 hover:border-purple-400/50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          whileHover={{ scale: 1.01 }}
        >
          <div className="text-center">
            <motion.div
              className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
              animate={{ rotate: isProcessing ? 360 : 0 }}
              transition={{ duration: 2, repeat: isProcessing ? Infinity : 0, ease: 'linear' }}
            >
              {isProcessing ? (
                <Loader2 className="w-10 h-10 text-white animate-spin" />
              ) : (
                <Upload className="w-10 h-10 text-white" />
              )}
            </motion.div>

            <h3 className="text-2xl text-white mb-2">
              {isProcessing ? 'Processing...' : 'Upload Your Document'}
            </h3>
            <p className="text-white/60 mb-6">
              {isProcessing
                ? 'Extracting text from your file...'
                : 'Drag & drop or click to select (PDF, DOCX, TXT - Max 20MB)'}
            </p>

            <input
              type="file"
              id="file-input"
              className="hidden"
              accept=".pdf,.docx,.txt"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) handleFileSelect(selectedFile);
              }}
              disabled={isProcessing}
            />

            <label htmlFor="file-input" className="inline-block cursor-pointer">
              <div className={`
                inline-flex items-center justify-center px-6 py-3 rounded-xl
                bg-white/10 backdrop-blur-md border border-white/20
                hover:bg-white/20 hover:border-white/30
                transition-all duration-300
                ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}>
                <FileText className="w-4 h-4 mr-2 text-white" />
                <span className="text-white">Select File</span>
              </div>
            </label>

            <p className="text-white/40 text-sm mt-4">
              Supported formats: PDF, DOCX, TXT (up to 20MB)
            </p>
          </div>
        </motion.div>
      )}

      {/* File Processed - Show Analysis */}
      {processedFile && !isGenerating && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* File Info */}
          <div className="glass-panel rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl text-white mb-2">File Processed Successfully</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-white/60">File Name</p>
                    <p className="text-white">{processedFile.fileName}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Words</p>
                    <p className="text-white">{processedFile.wordCount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Size</p>
                    <p className="text-white">{FileProcessor.formatFileSize(processedFile.fileSize)}</p>
                  </div>
                  <div>
                    <p className="text-white/60">Processing Time</p>
                    <p className="text-white">{(processedFile.processingTime / 1000).toFixed(2)}s</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Difficulty Selector */}
          <div className="glass-panel rounded-2xl p-6">
            <h3 className="text-xl text-white mb-4 flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-400" />
              Select Difficulty Level
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  value: 'undergraduate' as DifficultyLevel,
                  label: 'Undergraduate',
                  description: 'Fundamental concepts and basic understanding',
                  gradient: 'from-blue-500 to-cyan-500',
                },
                {
                  value: 'graduate' as DifficultyLevel,
                  label: 'Graduate',
                  description: 'Analysis and application of concepts',
                  gradient: 'from-purple-500 to-pink-500',
                },
                {
                  value: 'phd' as DifficultyLevel,
                  label: 'PhD',
                  description: 'Deep theoretical and research-level',
                  gradient: 'from-orange-500 to-red-500',
                },
              ].map((level) => (
                <motion.button
                  key={level.value}
                  className={`glass-panel rounded-2xl p-6 text-left transition-all ${
                    difficulty === level.value
                      ? 'ring-2 ring-purple-500 bg-white/10'
                      : 'hover:bg-white/5'
                  }`}
                  onClick={() => setDifficulty(level.value)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${level.gradient} flex items-center justify-center mb-3`}>
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <h4 className="text-white mb-1">{level.label}</h4>
                  <p className="text-white/60 text-sm">{level.description}</p>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <GlassButton onClick={handleGenerate} className="w-full">
            <Sparkles className="w-5 h-5 mr-2" />
            Generate AI Quiz
          </GlassButton>

          <button
            onClick={() => {
              setFile(null);
              setProcessedFile(null);
              setError(null);
            }}
            className="text-white/60 hover:text-white text-sm underline mx-auto block"
          >
            Upload a different file
          </button>
        </motion.div>
      )}

      {/* Generation Progress */}
      <AnimatePresence>
        {isGenerating && progress && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel-strong rounded-3xl p-8"
          >
            <div className="text-center">
              <motion.div
                className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center"
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              >
                <Brain className="w-10 h-10 text-white" />
              </motion.div>

              <h3 className="text-2xl text-white mb-2">
                {progress.stage === 'analyzing' && 'Analyzing Content'}
                {progress.stage === 'generating' && 'Generating Questions'}
                {progress.stage === 'validating' && 'Validating Quality'}
              </h3>
              
              <p className="text-white/60 mb-6">{progress.message}</p>

              {/* Progress Bar */}
              <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden mb-4">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>

              <p className="text-white/40 text-sm">{Math.round(progress.progress)}% complete</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="glass-panel rounded-2xl p-6 border border-red-500/30"
          >
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-1" />
              <div>
                <h4 className="text-white mb-1">Error</h4>
                <p className="text-white/60 text-sm">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

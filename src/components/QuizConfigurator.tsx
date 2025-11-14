/**
 * Quiz Configurator Component
 * Configuration screen for quiz generation
 * User selects document, difficulty, and question count
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, FileText, Sparkles, Loader2, CheckCircle, Award, AlertCircle } from 'lucide-react';
import { GlassButton } from './GlassButton';
import { supabase } from '../lib/supabase';
import { DifficultyLevel, GenerationProgress, QuizGenerationResult } from '../lib/quiz-generator-advanced';
import { generateAndValidateQuiz, getQualityMessage } from '../lib/quiz-orchestrator';
import { toast } from 'sonner@2.0.3';

interface Document {
  id: string;
  title: string;
  content: string;
}

interface QuizConfiguratorProps {
  onQuizGenerated: (result: QuizGenerationResult, documentId: string) => void;
}

export function QuizConfigurator({ onQuizGenerated }: QuizConfiguratorProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedDocId, setSelectedDocId] = useState<string>('');
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('undergraduate');
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);

  const questionOptions = [5, 10, 15, 20];
  const difficultyLevels: { value: DifficultyLevel; label: string; description: string }[] = [
    { value: 'phd', label: 'PhD Level', description: 'Advanced research-level questions' },
    { value: 'graduate', label: 'Graduate', description: 'Master\'s level complexity' },
    { value: 'undergraduate', label: 'Undergraduate', description: 'College-level questions' },
  ];

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('No user found');
        return;
      }

      const { data, error } = await supabase
        .from('documents')
        .select('id, title, content')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading documents:', error);
        toast.error('Failed to load documents');
      } else {
        setDocuments(data || []);
        // Auto-select first document
        if (data && data.length > 0) {
          setSelectedDocId(data[0].id);
        }
        console.log('📚 Loaded documents for quiz:', data?.length || 0);
      }
    } catch (error) {
      console.error('Error in loadDocuments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (!selectedDocId) {
      toast.error('Please select a document');
      return;
    }

    const selectedDoc = documents.find(d => d.id === selectedDocId);
    if (!selectedDoc) {
      toast.error('Document not found');
      return;
    }

    setIsGenerating(true);
    setProgress(null);

    try {
      console.log('🎯 Generating quiz with config:', {
        document: selectedDoc.title,
        difficulty,
        questionCount,
      });

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please sign in');
        return;
      }

      // Generate quiz using orchestrator with automatic retry and quality validation
      const result = await generateAndValidateQuiz(
        selectedDoc.content,
        {
          difficulty,
          questionCount,
        },
        (progressUpdate) => {
          setProgress(progressUpdate);
          console.log('Progress:', progressUpdate.stage, `${progressUpdate.progress}%`);
        }
      );

      console.log('✅ Quiz generated successfully!', {
        questions: result.questions.length,
        qualityLevel: result.qualityLevel.level,
        attempt: result.attempt,
        score: result.validation.score
      });
      
      // ✅ IMPROVED: Show detailed generation info
      const generationSummary = `Generated ${result.questions.length} questions (Quality: ${result.validation.score}/100)`;
      
      // Show quality-aware toast message with question count
      if (result.qualityLevel.level === 'excellent' || result.qualityLevel.level === 'good') {
        toast.success(`✓ ${generationSummary}`);
      } else if (result.qualityLevel.level === 'acceptable') {
        toast.warning(`⚠️ ${generationSummary} - Some quality issues detected`);
      } else {
        toast.error(`❌ ${generationSummary} - Quality below standards`);
      }

      // Show warning if fewer questions than requested
      if (result.questions.length < questionCount) {
        toast.warning(`Note: Generated ${result.questions.length} of ${questionCount} requested questions`, { 
          duration: 6000 
        });
      }

      if (result.warning) {
        toast.info(result.warning, { duration: 5000 });
      }
      
      // Pass result to parent with document ID
      onQuizGenerated(result, selectedDocId);

    } catch (error) {
      console.error('❌ Quiz generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate quiz');
    } finally {
      setIsGenerating(false);
      setProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center">
        <Loader2 className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-2" />
        <p className="text-white/60">Loading documents...</p>
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center">
          <FileText className="w-8 h-8 text-blue-400" />
        </div>
        <h3 className="text-xl text-white mb-2">No Documents Found</h3>
        <p className="text-white/60 mb-6">
          Upload a document first to generate quizzes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <motion.div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center"
          animate={{ rotate: isGenerating ? 360 : 0 }}
          transition={{ duration: 2, repeat: isGenerating ? Infinity : 0, ease: 'linear' }}
        >
          <Brain className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl text-white mb-2">Configure Your Quiz</h2>
        <p className="text-white/60">
          {isGenerating ? 'Generating your personalized quiz...' : 'Select options to generate an AI-powered quiz'}
        </p>
      </div>

      {/* Configuration Panel */}
      <div className="glass-panel rounded-2xl p-6 space-y-6">
        {/* Document Selection */}
        <div>
          <label className="block text-white mb-3">
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Select Document
            </span>
          </label>
          <select
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            disabled={isGenerating}
            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-purple-500 focus:outline-none transition-colors disabled:opacity-50"
          >
            {documents.map(doc => (
              <option key={doc.id} value={doc.id} className="bg-gray-900">
                {doc.title}
              </option>
            ))}
          </select>
          <p className="text-white/40 text-sm mt-2">
            {documents.length} document{documents.length !== 1 ? 's' : ''} available
          </p>
        </div>

        {/* Difficulty Level */}
        <div>
          <label className="block text-white mb-3">
            <span className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Difficulty Level
            </span>
          </label>
          <div className="space-y-2">
            {difficultyLevels.map(level => (
              <motion.button
                key={level.value}
                onClick={() => setDifficulty(level.value)}
                disabled={isGenerating}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                  difficulty === level.value
                    ? 'bg-purple-500/20 border-purple-500 shadow-lg shadow-purple-500/20'
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                } disabled:opacity-50`}
                whileHover={!isGenerating ? { scale: 1.02 } : {}}
                whileTap={!isGenerating ? { scale: 0.98 } : {}}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-white">{level.label}</span>
                  {difficulty === level.value && (
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                  )}
                </div>
                <p className="text-white/60 text-sm">{level.description}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Question Count */}
        <div>
          <label className="block text-white mb-3">
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Number of Questions
            </span>
          </label>
          <div className="grid grid-cols-4 gap-3">
            {questionOptions.map(count => (
              <motion.button
                key={count}
                onClick={() => setQuestionCount(count)}
                disabled={isGenerating}
                className={`p-4 rounded-xl border-2 transition-all ${
                  questionCount === count
                    ? 'bg-cyan-500/20 border-cyan-500 shadow-lg shadow-cyan-500/20'
                    : 'bg-white/5 border-white/10 hover:border-white/30'
                } disabled:opacity-50`}
                whileHover={!isGenerating ? { scale: 1.05 } : {}}
                whileTap={!isGenerating ? { scale: 0.95 } : {}}
              >
                <div className="text-2xl text-white mb-1">{count}</div>
                <div className="text-white/60 text-xs">questions</div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress Display */}
      <AnimatePresence>
        {isGenerating && progress && (
          <motion.div
            className="glass-panel rounded-2xl p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="flex items-center gap-4 mb-4">
              <Loader2 className="w-6 h-6 text-purple-400 animate-spin" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white capitalize">{progress.stage}</span>
                  <span className="text-white/60">{Math.round(progress.progress)}%</span>
                </div>
                <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-purple-500 to-cyan-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
              </div>
            </div>
            {progress.message && (
              <p className="text-white/60 text-sm">{progress.message}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Generate Button */}
      <GlassButton
        onClick={handleGenerateQuiz}
        disabled={isGenerating || !selectedDocId}
        className="w-full"
        size="lg"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating Quiz...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Quiz
          </>
        )}
      </GlassButton>

      {/* Info */}
      <div className="glass-panel rounded-xl p-4 bg-blue-500/10 border-blue-500/30">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-200">
            <p>
              AI will analyze your document using advanced cognitive science principles
              to create questions at multiple comprehension levels.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Advanced Flashcard Generator Component
 * Generates flashcards from uploaded documents with 6 cognitive clusters
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AdvancedFlashcardGenerator, ClusterDistribution, GenerationProgress } from '../lib/flashcard-generator-advanced';
import { createFlashcard } from '../lib/database';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner@2.0.3';
import { 
  Sparkles, Upload, Loader2, CheckCircle2, AlertCircle,
  FileText, Layers, TrendingUp
} from 'lucide-react';
import { Progress } from './ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';

interface FlashcardGeneratorAdvancedProps {
  onGenerated: (documentId: string) => void;
  uploadedDocuments?: Array<{ id: string; title: string; content: string }>;
}

export function FlashcardGeneratorAdvanced({ onGenerated, uploadedDocuments = [] }: FlashcardGeneratorAdvancedProps) {
  const [selectedDocument, setSelectedDocument] = useState<string>('');
  const [totalCards, setTotalCards] = useState(15);
  const [complexity, setComplexity] = useState<'basic' | 'advanced' | 'research'>('advanced');
  const [deckName, setDeckName] = useState('');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress | null>(null);
  const [generatedCount, setGeneratedCount] = useState(0);

  const handleGenerate = async () => {
    if (!selectedDocument) {
      toast.error('Please select a document');
      return;
    }

    if (!deckName.trim()) {
      toast.error('Please enter a deck name');
      return;
    }

    const document = uploadedDocuments.find(doc => doc.id === selectedDocument);
    if (!document) {
      toast.error('Document not found');
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratedCount(0);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Calculate distribution
      const distribution = AdvancedFlashcardGenerator.calculateDistribution(totalCards, complexity);

      // Generate flashcards
      const result = await AdvancedFlashcardGenerator.generateFlashcards(
        {
          documentText: document.content,
          deckName: deckName.trim(),
          totalCards,
          distribution,
        },
        (progressData) => {
          setProgress(progressData);
        }
      );

      // Save to database
      console.log('💾 Saving flashcards to database...', result.flashcards.length, 'cards');
      console.log('📋 Sample flashcard data:', result.flashcards[0]);
      
      let savedCount = 0;
      const saveErrors: any[] = [];
      
      for (const flashcard of result.flashcards) {
        try {
          const flashcardToSave = {
            ...flashcard,
            user_id: user.id,
            document_id: selectedDocument, // Link flashcard to document
          };
          
          console.log(`💾 Attempting to save flashcard ${savedCount + 1}:`, {
            deck_name: flashcardToSave.deck_name,
            cluster: flashcardToSave.cluster,
            has_visualization: !!flashcardToSave.visualization,
            document_id: flashcardToSave.document_id,
          });
          
          const { data, error } = await createFlashcard(flashcardToSave);
          
          if (error) {
            console.error(`❌ Error saving flashcard ${savedCount + 1}:`, error);
            saveErrors.push({ flashcard: savedCount + 1, error });
          } else {
            savedCount++;
            setGeneratedCount(savedCount);
            console.log(`✅ Saved flashcard ${savedCount}/${result.flashcards.length}`, data);
          }
        } catch (err) {
          console.error(`❌ Exception saving flashcard ${savedCount + 1}:`, err);
          saveErrors.push({ flashcard: savedCount + 1, error: err });
        }
      }
      
      if (saveErrors.length > 0) {
        console.error('❌ Save errors summary:', saveErrors);
        throw new Error(`Failed to save ${saveErrors.length} flashcards. Check console for details.`);
      }

      console.log(`✅ Total saved: ${savedCount} flashcards`);
      toast.success(`Successfully generated ${savedCount} flashcards across 6 cognitive clusters!`);
      
      // Call onGenerated callback to refresh UI with the document ID
      console.log('🔄 Calling onGenerated callback with document:', selectedDocument);
      onGenerated(selectedDocument);
      
      // Reset form
      setSelectedDocument('');
      setDeckName('');
      setProgress(null);
    } catch (error) {
      console.error('Flashcard generation error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate flashcards');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
          <Sparkles className="w-8 h-8 text-purple-400" />
        </div>
        <div>
          <h3 className="text-2xl text-white">Generate Cognitive Flashcards</h3>
          <p className="text-white/60">
            AI-powered flashcards with 6 cognitive clusters
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="space-y-6 mb-8">
        {/* Document Selection */}
        <div>
          <Label className="text-white mb-2 block">Select Document</Label>
          <Select value={selectedDocument} onValueChange={setSelectedDocument}>
            <SelectTrigger className="glass-panel border-white/10 text-white">
              <SelectValue placeholder="Choose a document..." />
            </SelectTrigger>
            <SelectContent>
              {uploadedDocuments.length === 0 ? (
                <SelectItem value="none" disabled>
                  No documents uploaded
                </SelectItem>
              ) : (
                uploadedDocuments.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      {doc.title}
                    </div>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Deck Name */}
        <div>
          <Label className="text-white mb-2 block">Deck Name</Label>
          <input
            type="text"
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="e.g., ML Security Paper - Nov 2024"
            className="w-full px-4 py-3 rounded-xl glass-panel border border-white/10 text-white placeholder-white/40 focus:border-purple-500/50 focus:outline-none"
          />
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Total Cards */}
          <div>
            <Label className="text-white mb-2 block">Total Cards</Label>
            <Select value={totalCards.toString()} onValueChange={(val) => setTotalCards(parseInt(val))}>
              <SelectTrigger className="glass-panel border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 cards</SelectItem>
                <SelectItem value="15">15 cards</SelectItem>
                <SelectItem value="20">20 cards</SelectItem>
                <SelectItem value="25">25 cards</SelectItem>
                <SelectItem value="30">30 cards</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document Complexity */}
          <div>
            <Label className="text-white mb-2 block">Document Complexity</Label>
            <Select value={complexity} onValueChange={(val: any) => setComplexity(val)}>
              <SelectTrigger className="glass-panel border-white/10 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="basic">Basic (More Foundational)</SelectItem>
                <SelectItem value="advanced">Advanced (Balanced)</SelectItem>
                <SelectItem value="research">Research (More Critical)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Distribution Preview */}
        {selectedDocument && (
          <div className="glass-panel rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-white/80">Cluster Distribution</span>
            </div>
            <div className="space-y-2 text-xs">
              {(() => {
                const dist = AdvancedFlashcardGenerator.calculateDistribution(totalCards, complexity);
                return Object.entries(dist).map(([cluster, count]) => (
                  <div key={cluster} className="flex items-center justify-between text-white/60">
                    <span>{cluster}</span>
                    <span className="text-white">{count} cards</span>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !selectedDocument || !deckName.trim()}
        className="w-full py-4 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating Flashcards...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate {totalCards} Flashcards
          </>
        )}
      </button>

      {/* Progress */}
      <AnimatePresence>
        {isGenerating && progress && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-6"
          >
            <div className="glass-panel rounded-xl p-6">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/80">{progress.message}</span>
                  <span className="text-sm text-white">{Math.round(progress.progress)}%</span>
                </div>
                <Progress value={progress.progress} className="h-2" />
              </div>

              {/* Stage Indicator */}
              <div className="flex items-center gap-3 text-sm">
                {progress.stage === 'analyzing' && (
                  <>
                    <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                    <span className="text-blue-400">Analyzing content...</span>
                  </>
                )}
                {progress.stage === 'generating' && (
                  <>
                    <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                    <span className="text-purple-400">
                      {progress.cluster ? `Generating ${progress.cluster}...` : 'Generating...'}
                    </span>
                  </>
                )}
                {progress.stage === 'validating' && (
                  <>
                    <Loader2 className="w-4 h-4 text-green-400 animate-spin" />
                    <span className="text-green-400">Validating quality...</span>
                  </>
                )}
                {progress.stage === 'complete' && (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <span className="text-green-400">Complete!</span>
                  </>
                )}
                {progress.stage === 'error' && (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-400">Error occurred</span>
                  </>
                )}
              </div>

              {/* Saved Count */}
              {generatedCount > 0 && (
                <div className="mt-4 flex items-center gap-2 text-sm text-cyan-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Saved {generatedCount} flashcards to database</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info */}
      <div className="mt-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
        <p className="text-cyan-400 text-sm">
          ℹ️ Flashcards are organized into 6 cognitive clusters: Foundational Concepts, Architectural Mechanics, 
          Comparative Analysis, Performance Metrics, Context & Big Picture, and Critical Thinking.
        </p>
      </div>
    </div>
  );
}

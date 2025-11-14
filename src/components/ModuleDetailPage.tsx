/**
 * Module Detail Page
 * Dedicated page for each learning module with embedded content and progress tracking
 */

import React, { useState, useEffect } from 'react';
import { ArrowLeft, BookOpen, Brain, Sparkles, Lock, CheckCircle2, Circle, Trophy, Target, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import {
  getSingleModuleProgress,
  getOrCreateModuleProgress,
  updateModuleProgress,
  getMasteryStatus,
  getModuleQuizzes,
  getModuleFlashcards,
} from '../lib/module-progress-service';
import {
  generateModuleContent,
  hasModuleContent,
} from '../lib/module-content-generator';
import { QuizTaker } from './QuizTaker';
import { EnhancedFlashcard } from './EnhancedFlashcard';
import { Progress } from './ui/progress';
import { toast } from 'sonner@2.0.3';

interface ModuleDetailPageProps {
  documentId: string;
  moduleId: string;
  moduleTitle: string;
  moduleTopics: string[];
  onBack: () => void;
}

export function ModuleDetailPage({
  documentId,
  moduleId,
  moduleTitle,
  moduleTopics,
  onBack,
}: ModuleDetailPageProps) {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<any>(null);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [activeView, setActiveView] = useState<'overview' | 'quiz' | 'flashcards'>('overview');
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadModuleData();
    }
  }, [user, moduleId]);

  async function loadUser() {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  }

  async function loadModuleData() {
    if (!user) return;

    setLoading(true);
    try {
      // Load or create progress
      const progressData = await getOrCreateModuleProgress(
        user.id,
        documentId,
        moduleId,
        moduleTitle,
        moduleTopics
      );
      setProgress(progressData);

      // Load content
      const [quizzesData, flashcardsData] = await Promise.all([
        getModuleQuizzes(user.id, moduleId),
        getModuleFlashcards(user.id, moduleId),
      ]);

      setQuizzes(quizzesData);
      setFlashcards(flashcardsData);

      // Auto-generate if first time opening and content doesn't exist
      const hasContent = await hasModuleContent(user.id, moduleId);
      if (!hasContent && progressData?.is_unlocked) {
        await handleGenerateContent();
      }
    } catch (error) {
      console.error('Error loading module data:', error);
      toast.error('Failed to load module data');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerateContent() {
    if (!user || generating) return;

    setGenerating(true);
    try {
      toast.info('Generating personalized study content...');

      const result = await generateModuleContent({
        userId: user.id,
        documentId,
        moduleId,
        moduleTitle,
        moduleTopics,
        quizCount: 5,
        flashcardCount: 10,
      });

      if (result.success) {
        setQuizzes(result.quizzes);
        setFlashcards(result.flashcards);
        toast.success(`Generated ${result.quizzes.length} quizzes and ${result.flashcards.length} flashcards!`);
      } else {
        throw new Error(result.error || 'Generation failed');
      }
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content. Please try again.');
    } finally {
      setGenerating(false);
    }
  }

  async function handleQuizComplete(quizId: string, score: number) {
    if (!user) return;

    try {
      // Update module progress
      await updateModuleProgress(user.id, documentId, moduleId);
      
      // Reload data
      await loadModuleData();

      toast.success(`Quiz completed! Score: ${score}%`);
      
      // Move to next quiz or back to overview
      if (currentQuizIndex < quizzes.length - 1) {
        setCurrentQuizIndex(currentQuizIndex + 1);
      } else {
        setActiveView('overview');
        setCurrentQuizIndex(0);
      }
    } catch (error) {
      console.error('Error handling quiz completion:', error);
    }
  }

  async function handleFlashcardComplete() {
    if (!user) return;

    try {
      // Update module progress
      await updateModuleProgress(user.id, documentId, moduleId);
      
      // Reload data
      await loadModuleData();

      // Move to next flashcard or back to overview
      if (currentFlashcardIndex < flashcards.length - 1) {
        setCurrentFlashcardIndex(currentFlashcardIndex + 1);
      } else {
        setActiveView('overview');
        setCurrentFlashcardIndex(0);
      }
    } catch (error) {
      console.error('Error handling flashcard completion:', error);
    }
  }

  const masteryStatus = progress ? getMasteryStatus(progress.mastery_score) : null;
  const quizzesProgress = progress ? (progress.quizzes_completed / progress.quizzes_total) * 100 : 0;
  const flashcardsProgress = progress ? (progress.flashcards_completed / progress.flashcards_total) * 100 : 0;

  // Dynamic checkpoints based on actual progress
  const checkpoints = [
    {
      id: 1,
      title: 'Complete Foundation Quizzes',
      description: `Complete at least 3 quizzes on ${moduleTopics.slice(0, 2).join(' and ')}`,
      completed: (progress?.quizzes_completed || 0) >= 3,
      progress: Math.min(100, ((progress?.quizzes_completed || 0) / 3) * 100),
    },
    {
      id: 2,
      title: 'Master Key Concepts',
      description: `Review at least 5 flashcards with high confidence`,
      completed: (progress?.flashcards_completed || 0) >= 5,
      progress: Math.min(100, ((progress?.flashcards_completed || 0) / 5) * 100),
    },
    {
      id: 3,
      title: 'Achieve Mastery',
      description: 'Reach 80% mastery score to unlock next module',
      completed: (progress?.mastery_score || 0) >= 80,
      progress: progress?.mastery_score || 0,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading module...</p>
        </div>
      </div>
    );
  }

  if (!progress?.is_unlocked) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={onBack}
            className="mb-8 flex items-center gap-2 text-white/80 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            Back to Roadmap
          </button>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-orange-900/40 via-red-900/40 to-rose-900/40 border-b border-white/10 p-8 text-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <Lock className="w-20 h-20 text-orange-400/80 mx-auto mb-4" />
              </motion.div>
              <h2 className="text-3xl text-white mb-2">🔒 Module Locked</h2>
              <p className="text-white/60">This module is part of your sequential learning path</p>
            </div>

            {/* Content */}
            <div className="p-8 space-y-6">
              {/* Module Info */}
              <div className="rounded-2xl bg-white/5 border border-white/10 p-6">
                <h3 className="text-white mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  {moduleTitle}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {moduleTopics.map((topic, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-white/5 rounded-full text-white/70 text-sm border border-white/10"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div className="rounded-2xl bg-gradient-to-br from-yellow-900/20 via-amber-900/20 to-orange-900/20 border border-yellow-500/30 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                    <Target className="w-6 h-6 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white mb-2">How to Unlock This Module</h4>
                    <p className="text-white/70 mb-4">
                      Complete the previous module in your learning path with at least 80% mastery score.
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-white/60">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                        <span>Complete at least 3 quizzes</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                        <span>Review at least 5 flashcards</span>
                      </div>
                      <div className="flex items-center gap-2 text-white/60">
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                        <span>Achieve 80%+ overall mastery score</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={onBack}
                  className="flex-1 px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-white hover:from-purple-500/30 hover:to-blue-500/30 transition-all flex items-center justify-center gap-2 group"
                >
                  <MapIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>View Full Roadmap</span>
                </button>
              </div>

              {/* Encouragement */}
              <div className="text-center">
                <p className="text-white/40 text-sm">
                  💡 Tip: Each module builds on the previous one, ensuring a solid foundation for your learning journey
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Roadmap
          </button>

          <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border border-white/20">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-4xl text-white mb-2">{moduleTitle}</h1>
                <p className="text-white/70">
                  Master these key concepts to advance your learning journey
                </p>
              </div>
              {masteryStatus && (
                <div className="text-center">
                  <div className="text-5xl mb-2">{masteryStatus.emoji}</div>
                  <div className={`text-2xl ${masteryStatus.color}`}>
                    {masteryStatus.score}%
                  </div>
                  <div className="text-white/60 text-sm capitalize">
                    {masteryStatus.status.replace('-', ' ')}
                  </div>
                </div>
              )}
            </div>

            {/* Topics */}
            <div className="mb-6">
              <h3 className="text-white/80 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Topics Covered
              </h3>
              <div className="flex flex-wrap gap-2">
                {moduleTopics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-4 py-2 bg-white/10 rounded-full text-white/90 text-sm border border-white/10"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            {/* Progress Bars */}
            <div className="grid grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70 text-sm">Quizzes</span>
                  <span className="text-white text-sm">
                    {progress?.quizzes_completed || 0} / {progress?.quizzes_total || 5}
                  </span>
                </div>
                <Progress value={quizzesProgress} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white/70 text-sm">Flashcards</span>
                  <span className="text-white text-sm">
                    {progress?.flashcards_completed || 0} / {progress?.flashcards_total || 10}
                  </span>
                </div>
                <Progress value={flashcardsProgress} className="h-2" />
              </div>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {activeView === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {/* Study Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button
                  onClick={() => {
                    if (quizzes.length === 0) {
                      toast.info('Generating quizzes...');
                      handleGenerateContent();
                    } else {
                      setCurrentQuizIndex(0);
                      setActiveView('quiz');
                    }
                  }}
                  disabled={generating}
                  className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all group disabled:opacity-50"
                >
                  <Brain className="w-12 h-12 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-2xl text-white mb-2">Practice Quizzes</h3>
                  <p className="text-white/70 mb-4">
                    Test your knowledge with {quizzes.length || 5} targeted questions
                  </p>
                  <div className="text-purple-400">
                    {quizzes.length > 0 ? 'Start Practice →' : 'Generate Quizzes →'}
                  </div>
                </button>

                <button
                  onClick={() => {
                    if (flashcards.length === 0) {
                      toast.info('Generating flashcards...');
                      handleGenerateContent();
                    } else {
                      setCurrentFlashcardIndex(0);
                      setActiveView('flashcards');
                    }
                  }}
                  disabled={generating}
                  className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 hover:bg-white/20 transition-all group disabled:opacity-50"
                >
                  <Sparkles className="w-12 h-12 text-blue-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-2xl text-white mb-2">Study Flashcards</h3>
                  <p className="text-white/70 mb-4">
                    Review {flashcards.length || 10} key concepts and definitions
                  </p>
                  <div className="text-blue-400">
                    {flashcards.length > 0 ? 'Start Review →' : 'Generate Flashcards →'}
                  </div>
                </button>
              </div>

              {/* Mastery Checkpoints */}
              <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20">
                <h3 className="text-2xl text-white mb-6 flex items-center gap-2">
                  <Target className="w-6 h-6 text-yellow-400" />
                  Mastery Checkpoints
                </h3>
                <div className="space-y-4">
                  {checkpoints.map((checkpoint) => (
                    <div
                      key={checkpoint.id}
                      className="bg-white/5 rounded-xl p-4 border border-white/10"
                    >
                      <div className="flex items-start gap-4">
                        <div className="mt-1">
                          {checkpoint.completed ? (
                            <CheckCircle2 className="w-6 h-6 text-green-400" />
                          ) : (
                            <Circle className="w-6 h-6 text-white/30" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className={`text-lg mb-1 ${checkpoint.completed ? 'text-white' : 'text-white/70'}`}>
                            {checkpoint.title}
                          </h4>
                          <p className="text-white/60 text-sm mb-3">
                            {checkpoint.description}
                          </p>
                          <div className="flex items-center gap-3">
                            <Progress value={checkpoint.progress} className="flex-1 h-2" />
                            <span className="text-white/70 text-sm min-w-[3rem] text-right">
                              {Math.round(checkpoint.progress)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {masteryStatus?.canUnlockNext && (
                  <div className="mt-6 bg-green-500/20 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-green-400" />
                    <div>
                      <div className="text-green-400">Module Mastered!</div>
                      <div className="text-white/70 text-sm">Next module is now unlocked</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === 'quiz' && quizzes[currentQuizIndex] && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setActiveView('overview')}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  ← Back to Overview
                </button>
                <span className="text-white/60">
                  Quiz {currentQuizIndex + 1} of {quizzes.length}
                </span>
              </div>
              <QuizTaker
                quiz={quizzes[currentQuizIndex]}
                onComplete={(score) => handleQuizComplete(quizzes[currentQuizIndex].id, score)}
              />
            </motion.div>
          )}

          {activeView === 'flashcards' && flashcards[currentFlashcardIndex] && (
            <motion.div
              key="flashcards"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <button
                  onClick={() => setActiveView('overview')}
                  className="text-white/80 hover:text-white transition-colors"
                >
                  ← Back to Overview
                </button>
                <span className="text-white/60">
                  Card {currentFlashcardIndex + 1} of {flashcards.length}
                </span>
              </div>
              <EnhancedFlashcard
                flashcard={flashcards[currentFlashcardIndex]}
                onNext={handleFlashcardComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {generating && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 border border-white/20 text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white text-lg">Generating personalized study content...</p>
              <p className="text-white/60 text-sm mt-2">This may take a minute</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

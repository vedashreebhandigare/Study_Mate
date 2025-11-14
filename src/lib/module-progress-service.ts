/**
 * Module Progress Service
 * Handles module progress tracking, mastery calculation, and unlocking logic
 */

import { supabase } from './supabase';

export interface ModuleProgress {
  id: string;
  user_id: string;
  document_id: string;
  module_id: string;
  module_title: string;
  module_topics: string[];
  mastery_score: number;
  quizzes_completed: number;
  quizzes_total: number;
  flashcards_completed: number;
  flashcards_total: number;
  is_unlocked: boolean;
  is_completed: boolean;
  content_generated: boolean;
  unlocked_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MasteryStatus {
  score: number;
  status: 'needs-review' | 'in-progress' | 'mastered';
  color: string;
  emoji: string;
  canUnlockNext: boolean;
}

/**
 * Initialize module progress for a document
 */
export async function initializeModuleProgress(
  userId: string,
  documentId: string,
  modules: Array<{
    id: string;
    title: string;
    topics: string[];
    order: number;
  }>
): Promise<void> {
  try {
    // First module is always unlocked
    const progressData = modules.map((module, index) => ({
      user_id: userId,
      document_id: documentId,
      module_id: module.id,
      module_title: module.title,
      module_topics: module.topics,
      is_unlocked: index === 0, // First module unlocked by default
      unlocked_at: index === 0 ? new Date().toISOString() : null,
    }));

    const { error } = await supabase
      .from('module_progress')
      .upsert(progressData, {
        onConflict: 'user_id,document_id,module_id',
        ignoreDuplicates: false,
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error initializing module progress:', error);
    throw error;
  }
}

/**
 * Get module progress for a specific document
 */
export async function getModuleProgress(
  userId: string,
  documentId: string
): Promise<ModuleProgress[]> {
  try {
    const { data, error } = await supabase
      .from('module_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching module progress:', error);
    return [];
  }
}

/**
 * Get single module progress (creates if doesn't exist)
 */
export async function getSingleModuleProgress(
  userId: string,
  documentId: string,
  moduleId: string
): Promise<ModuleProgress | null> {
  try {
    const { data, error } = await supabase
      .from('module_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .eq('module_id', moduleId)
      .maybeSingle();

    if (error) throw error;
    
    // If no progress exists, it might be a new module - return null
    // The caller should handle initialization
    return data;
  } catch (error) {
    console.error('Error fetching single module progress:', error);
    return null;
  }
}

/**
 * Get or create single module progress
 */
export async function getOrCreateModuleProgress(
  userId: string,
  documentId: string,
  moduleId: string,
  moduleTitle: string,
  moduleTopics: string[]
): Promise<ModuleProgress | null> {
  try {
    // Try to get existing progress
    let progress = await getSingleModuleProgress(userId, documentId, moduleId);
    
    // If doesn't exist, create it
    if (!progress) {
      const { data, error } = await supabase
        .from('module_progress')
        .insert({
          user_id: userId,
          document_id: documentId,
          module_id: moduleId,
          module_title: moduleTitle,
          module_topics: moduleTopics,
          is_unlocked: true, // Assume unlocked if accessing directly
          unlocked_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      progress = data;
    }

    return progress;
  } catch (error) {
    console.error('Error getting or creating module progress:', error);
    return null;
  }
}

/**
 * Calculate mastery score for a module based on quiz and flashcard performance
 */
export async function calculateModuleMastery(
  userId: string,
  moduleId: string
): Promise<number> {
  try {
    // Get quiz scores for this module
    const { data: quizzes, error: quizError } = await supabase
      .from('quizzes')
      .select('score')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .not('score', 'is', null);

    if (quizError) throw quizError;

    // Get flashcard performance for this module
    const { data: flashcards, error: flashError } = await supabase
      .from('flashcards')
      .select('confidence')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .not('confidence', 'is', null);

    if (flashError) throw flashError;

    const quizScores = quizzes?.map(q => q.score) || [];
    const flashcardScores = flashcards?.map(f => {
      // Convert confidence (1-5) to percentage (0-100)
      return ((f.confidence - 1) / 4) * 100;
    }) || [];

    // Need minimum attempts
    const hasMinimumQuizzes = quizScores.length >= 3;
    const hasMinimumFlashcards = flashcardScores.length >= 5;

    if (!hasMinimumQuizzes && !hasMinimumFlashcards) {
      return 0; // Not enough data
    }

    // Calculate weighted average
    let totalScore = 0;
    let totalWeight = 0;

    if (quizScores.length > 0) {
      const avgQuizScore = quizScores.reduce((a, b) => a + b, 0) / quizScores.length;
      totalScore += avgQuizScore * 0.6; // Quizzes weighted 60%
      totalWeight += 0.6;
    }

    if (flashcardScores.length > 0) {
      const avgFlashcardScore = flashcardScores.reduce((a, b) => a + b, 0) / flashcardScores.length;
      totalScore += avgFlashcardScore * 0.4; // Flashcards weighted 40%
      totalWeight += 0.4;
    }

    return totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
  } catch (error) {
    console.error('Error calculating module mastery:', error);
    return 0;
  }
}

/**
 * Get mastery status with color coding
 */
export function getMasteryStatus(score: number): MasteryStatus {
  if (score >= 80) {
    return {
      score,
      status: 'mastered',
      color: 'text-green-400',
      emoji: '🟢',
      canUnlockNext: true,
    };
  } else if (score >= 60) {
    return {
      score,
      status: 'in-progress',
      color: 'text-yellow-400',
      emoji: '🟡',
      canUnlockNext: false,
    };
  } else {
    return {
      score,
      status: 'needs-review',
      color: 'text-red-400',
      emoji: '🔴',
      canUnlockNext: false,
    };
  }
}

/**
 * Update module progress after quiz/flashcard completion
 */
export async function updateModuleProgress(
  userId: string,
  documentId: string,
  moduleId: string
): Promise<void> {
  try {
    // Calculate new mastery score
    const masteryScore = await calculateModuleMastery(userId, moduleId);

    // Count completed items
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .not('score', 'is', null);

    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .not('last_reviewed', 'is', null);

    const quizzesCompleted = quizzes?.length || 0;
    const flashcardsCompleted = flashcards?.length || 0;

    // Check if completed (mastery >= 80%)
    const isCompleted = masteryScore >= 80;

    // Update progress
    const { error } = await supabase
      .from('module_progress')
      .update({
        mastery_score: masteryScore,
        quizzes_completed: quizzesCompleted,
        flashcards_completed: flashcardsCompleted,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .eq('module_id', moduleId);

    if (error) throw error;

    // If mastered, unlock next module
    if (masteryScore >= 80) {
      await unlockNextModule(userId, documentId, moduleId);
    }
  } catch (error) {
    console.error('Error updating module progress:', error);
    throw error;
  }
}

/**
 * Unlock next module when current module is mastered
 */
async function unlockNextModule(
  userId: string,
  documentId: string,
  currentModuleId: string
): Promise<void> {
  try {
    // Get all modules for this document
    const { data: allModules, error: fetchError } = await supabase
      .from('module_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .order('created_at', { ascending: true });

    if (fetchError) throw fetchError;

    // Find current module index
    const currentIndex = allModules?.findIndex(m => m.module_id === currentModuleId) ?? -1;
    
    if (currentIndex >= 0 && currentIndex < (allModules?.length || 0) - 1) {
      const nextModule = allModules![currentIndex + 1];
      
      // Unlock next module if not already unlocked
      if (!nextModule.is_unlocked) {
        const { error: updateError } = await supabase
          .from('module_progress')
          .update({
            is_unlocked: true,
            unlocked_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('document_id', documentId)
          .eq('module_id', nextModule.module_id);

        if (updateError) throw updateError;
      }
    }
  } catch (error) {
    console.error('Error unlocking next module:', error);
  }
}

/**
 * Mark module content as generated
 */
export async function markContentGenerated(
  userId: string,
  documentId: string,
  moduleId: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('module_progress')
      .update({ content_generated: true })
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .eq('module_id', moduleId);

    if (error) throw error;
  } catch (error) {
    console.error('Error marking content as generated:', error);
    throw error;
  }
}

/**
 * Get module-specific quizzes
 */
export async function getModuleQuizzes(userId: string, moduleId: string) {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching module quizzes:', error);
    return [];
  }
}

/**
 * Get module-specific flashcards
 */
export async function getModuleFlashcards(userId: string, moduleId: string) {
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching module flashcards:', error);
    return [];
  }
}

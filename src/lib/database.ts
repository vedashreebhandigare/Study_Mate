import { supabase } from './supabase';

// Database types
export interface Document {
  id: string;
  user_id: string;
  name: string;
  file_path: string;
  file_size: number;
  created_at: string;
}

export interface Quiz {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  questions: QuizQuestion[];
  score?: number;
  completed_at?: string;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: number;
  explanation?: string;
}

export type ClusterType = 
  | 'Foundational Concepts'
  | 'Architectural Mechanics'
  | 'Comparative Analysis'
  | 'Performance Metrics'
  | 'Context & Big Picture'
  | 'Critical Thinking';

export type DifficultyLevel = 'undergrad' | 'graduate' | 'phd';

export interface VisualizationMetadata {
  type: 'iconography' | 'diagram' | 'bar_chart' | 'heatmap' | 'confusion_matrix' | 'timeline' | 'concept_map';
  description: string;
  source_figure?: string;
  caption: string;
  annotations: string[];
  icon: string; // Lucide icon name
  // Future enhancements
  extracted_image_url?: string;
  data?: any;
}

export interface Flashcard {
  id: string;
  user_id: string;
  document_id: string; // Links flashcard to specific document
  deck_name: string;
  front: string;
  back: string;
  // Enhanced fields
  cluster?: ClusterType;
  source?: string; // "Section VI.E, Table 3, Figure 21"
  difficulty_level?: DifficultyLevel;
  tags?: string[];
  visualization?: VisualizationMetadata;
  // Legacy/review fields
  review_difficulty?: number; // Spaced repetition (0-5)
  last_reviewed?: string;
  created_at: string;
}

export interface TutorChat {
  id: string;
  user_id: string;
  message: string;
  response: string;
  mode: 'general' | 'focused';
  document_id?: string;
  document_name?: string;
  citations?: string[];
  created_at: string;
}

/**
 * 🆕 RELATIONSHIP MASTERY: Track understanding of concept CONNECTIONS
 * This enables personalized learning based on relationship understanding
 */
export interface RelationshipMastery {
  id: string;
  user_id: string;
  document_id?: string; // Optional: track per-document or globally
  source_concept: string; // Starting concept (e.g., "Docker")
  target_concept: string; // Related concept (e.g., "Kubernetes")
  understanding_score: number; // 0.0-1.0 (0 = no understanding, 1 = mastered)
  times_practiced: number; // How many times user answered questions about this relationship
  correct_answers: number; // How many were correct
  last_practiced: string; // ISO timestamp
  created_at: string;
}

// Document operations
export const createDocument = async (documentData: Omit<Document, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .insert([documentData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getUserDocuments = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteDocument = async (documentId: string) => {
  try {
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Quiz operations
export const createQuiz = async (quizData: Omit<Quiz, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .insert([quizData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getUserQuizzes = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateQuizScore = async (quizId: string, score: number) => {
  try {
    const { data, error } = await supabase
      .from('quizzes')
      .update({ score, completed_at: new Date().toISOString() })
      .eq('id', quizId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Flashcard operations
export const createFlashcard = async (flashcardData: Omit<Flashcard, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .insert([flashcardData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getUserFlashcards = async (userId: string, documentId?: string, deckName?: string) => {
  try {
    let query = supabase
      .from('flashcards')
      .select('*')
      .eq('user_id', userId);

    // Filter by document if provided
    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    if (deckName) {
      query = query.eq('deck_name', deckName);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateFlashcardReview = async (flashcardId: string, difficulty: number) => {
  try {
    const { data, error } = await supabase
      .from('flashcards')
      .update({ 
        difficulty,
        last_reviewed: new Date().toISOString()
      })
      .eq('id', flashcardId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteFlashcard = async (flashcardId: string) => {
  try {
    const { error } = await supabase
      .from('flashcards')
      .delete()
      .eq('id', flashcardId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Tutor chat operations
export const createTutorChat = async (chatData: Omit<TutorChat, 'id' | 'created_at'>) => {
  try {
    const { data, error } = await supabase
      .from('tutor_chats')
      .insert([chatData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getUserTutorChats = async (userId: string, limit: number = 50) => {
  try {
    const { data, error } = await supabase
      .from('tutor_chats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const clearTutorChatHistory = async (userId: string) => {
  try {
    const { error } = await supabase
      .from('tutor_chats')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error };
  }
};

// Concept Map operations
export interface ConceptMap {
  id: string;
  user_id: string;
  document_id: string;
  nodes: any[]; // ConceptNode[]
  edges: any[]; // ConceptEdge[]
  concept_count?: number;
  relationship_count?: number;
  created_at: string;
  updated_at: string;
}

export const createConceptMap = async (conceptMapData: {
  user_id: string;
  document_id: string;
  nodes: any[];
  edges: any[];
}) => {
  try {
    const { data, error } = await supabase
      .from('concept_maps')
      .insert([conceptMapData])
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getConceptMapByDocument = async (userId: string, documentId: string) => {
  try {
    const { data, error } = await supabase
      .from('concept_maps')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .single();

    if (error) {
      // Not found is not an error, just return null
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const getUserConceptMaps = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('concept_maps')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateConceptMap = async (
  conceptMapId: string,
  updates: {
    nodes?: any[];
    edges?: any[];
  }
) => {
  try {
    const { data, error } = await supabase
      .from('concept_maps')
      .update(updates)
      .eq('id', conceptMapId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteConceptMap = async (conceptMapId: string) => {
  try {
    const { error } = await supabase
      .from('concept_maps')
      .delete()
      .eq('id', conceptMapId);

    if (error) throw error;

    return { error: null };
  } catch (error) {
    return { error };
  }
};

// ============================================================
// CONCEPT MASTERY TRACKING (for Adaptive Roadmap)
// ============================================================

export interface ConceptMastery {
  user_id: string;
  document_id: string;
  concept_id: string;
  concept_name: string;
  mastery_score: number; // 0.0 to 1.0
  total_attempts: number;
  correct_attempts: number;
  last_reviewed: string;
  created_at: string;
  updated_at: string;
}

export interface StudyPlan {
  id: string;
  user_id: string;
  document_id: string;
  plan_data: any; // JSON roadmap
  created_at: string;
  completed_days: number[];
  last_accessed: string;
}

/**
 * Update mastery score for a concept using Bayesian-like smoothing
 * Formula: new_score = (correct_attempts / total_attempts) * 0.7 + previous_score * 0.3
 */
export const updateConceptMastery = async (
  userId: string,
  documentId: string,
  conceptId: string,
  conceptName: string,
  isCorrect: boolean
) => {
  try {
    // First, try to get existing record
    const { data: existing, error: fetchError } = await supabase
      .from('concept_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .eq('concept_id', conceptId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let newScore = 0;
    let totalAttempts = 1;
    let correctAttempts = isCorrect ? 1 : 0;

    if (existing) {
      // Update existing record with Bayesian smoothing
      totalAttempts = existing.total_attempts + 1;
      correctAttempts = existing.correct_attempts + (isCorrect ? 1 : 0);
      
      const rawAccuracy = correctAttempts / totalAttempts;
      newScore = rawAccuracy * 0.7 + existing.mastery_score * 0.3;
    } else {
      // New concept
      newScore = isCorrect ? 0.5 : 0.2; // Conservative start
    }

    // Upsert the record
    const { data, error } = await supabase
      .from('concept_mastery')
      .upsert({
        user_id: userId,
        document_id: documentId,
        concept_id: conceptId,
        concept_name: conceptName,
        mastery_score: newScore,
        total_attempts: totalAttempts,
        correct_attempts: correctAttempts,
        last_reviewed: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,document_id,concept_id'
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating concept mastery:', error);
    return { data: null, error };
  }
};

/**
 * Get all concept mastery data for a user and document
 */
export const getConceptMastery = async (userId: string, documentId: string) => {
  try {
    const { data, error } = await supabase
      .from('concept_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .order('mastery_score', { ascending: true }); // Weakest first

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching concept mastery:', error);
    return { data: null, error };
  }
};

/**
 * Identify weak concepts (gaps) for roadmap generation
 */
export const getWeakConcepts = async (userId: string, documentId: string, threshold = 0.7) => {
  try {
    const { data, error } = await supabase
      .from('concept_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .lt('mastery_score', threshold)
      .order('mastery_score', { ascending: true })
      .limit(10); // Top 10 weakest

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching weak concepts:', error);
    return { data: null, error };
  }
};

/**
 * Save generated study plan
 */
export const saveStudyPlan = async (
  userId: string,
  documentId: string,
  planData: any
) => {
  try {
    const { data, error } = await supabase
      .from('study_plans')
      .upsert({
        user_id: userId,
        document_id: documentId,
        plan_data: planData,
        completed_days: [],
        last_accessed: new Date().toISOString(),
        created_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,document_id'
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error saving study plan:', error);
    return { data: null, error };
  }
};

/**
 * Get user's study plan
 */
export const getStudyPlan = async (userId: string, documentId: string) => {
  try {
    const { data, error } = await supabase
      .from('study_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .maybeSingle();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error fetching study plan:', error);
    return { data: null, error };
  }
};

/**
 * Mark a day as completed in study plan
 */
export const markDayCompleted = async (
  userId: string,
  documentId: string,
  dayNumber: number
) => {
  try {
    const { data: plan } = await getStudyPlan(userId, documentId);
    
    if (!plan) {
      return { data: null, error: new Error('Study plan not found') };
    }

    const completedDays = plan.completed_days || [];
    if (!completedDays.includes(dayNumber)) {
      completedDays.push(dayNumber);
    }

    const { data, error } = await supabase
      .from('study_plans')
      .update({
        completed_days: completedDays,
        last_accessed: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('document_id', documentId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error marking day completed:', error);
    return { data: null, error };
  }
};

/**
 * 🆕 Save adaptive roadmap (module-based)
 */
export const saveAdaptiveRoadmap = async (
  userId: string,
  documentId: string,
  roadmap: any // AdaptiveRoadmap type
) => {
  try {
    const { data, error } = await supabase
      .from('study_plans')
      .upsert({
        user_id: userId,
        document_id: documentId,
        plan_data: roadmap,
        plan_type: 'adaptive_modular', // Distinguish from old roadmaps
        last_accessed: new Date().toISOString(),
      }, {
        onConflict: 'user_id,document_id',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error saving adaptive roadmap:', error);
    return { data: null, error };
  }
};

/**
 * 🆕 Get module progress for adaptive roadmap
 */
export const getModuleProgress = async (
  userId: string,
  documentId: string
) => {
  try {
    const { data, error } = await supabase
      .from('module_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('document_id', documentId);

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching module progress:', error);
    return { data: [], error };
  }
};

/**
 * 🆕 Update module progress
 */
export const updateModuleProgress = async (
  userId: string,
  documentId: string,
  moduleId: string,
  progressData: {
    status?: string;
    mastery_score?: number;
    quiz_attempts?: number;
    quiz_average_score?: number;
    flashcard_reviews?: number;
    flashcard_retention?: number;
    tutor_questions_asked?: number;
  }
) => {
  try {
    const { data, error } = await supabase
      .from('module_progress')
      .upsert({
        user_id: userId,
        document_id: documentId,
        module_id: moduleId,
        ...progressData,
        last_activity_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    console.error('Error updating module progress:', error);
    return { data: null, error };
  }
};

// ============================================================
// 🆕 RELATIONSHIP MASTERY TRACKING
// ============================================================

/**
 * Update relationship mastery score when user answers multi-hop question
 * 
 * This tracks understanding of concept CONNECTIONS (not isolated concepts).
 * For multi-hop questions with chain [A → B → C], updates mastery for:
 * - A → B relationship
 * - B → C relationship
 * - A → C relationship (transitive)
 * 
 * @param userId - User ID
 * @param sourceConcept - Starting concept
 * @param targetConcept - Related concept
 * @param isCorrect - Whether user answered correctly
 * @param documentId - Optional document context
 */
export const updateRelationshipMastery = async (
  userId: string,
  sourceConcept: string,
  targetConcept: string,
  isCorrect: boolean,
  documentId?: string
) => {
  try {
    // Fetch existing mastery record
    const { data: existing, error: fetchError } = await supabase
      .from('relationship_mastery')
      .select('*')
      .eq('user_id', userId)
      .eq('source_concept', sourceConcept)
      .eq('target_concept', targetConcept)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let newScore: number;
    let newCorrect: number;
    let newPracticed: number;

    if (existing) {
      // Update existing record
      newPracticed = existing.times_practiced + 1;
      newCorrect = existing.correct_answers + (isCorrect ? 1 : 0);
      
      // Calculate new score: weighted average (recent performance matters more)
      const currentAccuracy = newCorrect / newPracticed;
      const oldWeight = 0.7;
      const newWeight = 0.3;
      newScore = Math.min(1.0, Math.max(0.0,
        existing.understanding_score * oldWeight + currentAccuracy * newWeight
      ));
    } else {
      // Create new record
      newPracticed = 1;
      newCorrect = isCorrect ? 1 : 0;
      newScore = isCorrect ? 0.5 : 0.2; // Start conservatively
    }

    // Upsert record
    const { data, error } = await supabase
      .from('relationship_mastery')
      .upsert({
        user_id: userId,
        source_concept: sourceConcept,
        target_concept: targetConcept,
        document_id: documentId || null,
        understanding_score: newScore,
        times_practiced: newPracticed,
        correct_answers: newCorrect,
        last_practiced: new Date().toISOString(),
      }, {
        onConflict: 'user_id,source_concept,target_concept',
      })
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Updated relationship mastery: ${sourceConcept} → ${targetConcept} = ${(newScore * 100).toFixed(0)}%`);
    return { data, error: null };

  } catch (error) {
    console.error('Error updating relationship mastery:', error);
    return { data: null, error };
  }
};

/**
 * Update mastery for entire concept chain (multi-hop question)
 * 
 * For chain [Docker, Container, Microservices, Kubernetes]:
 * - Updates Docker → Container
 * - Updates Container → Microservices
 * - Updates Microservices → Kubernetes
 * - Updates Docker → Kubernetes (transitive)
 * 
 * @param userId - User ID
 * @param conceptChain - Array of concepts in order
 * @param isCorrect - Whether user answered correctly
 * @param documentId - Optional document context
 */
export const updateConceptChainMastery = async (
  userId: string,
  conceptChain: string[],
  isCorrect: boolean,
  documentId?: string
) => {
  if (conceptChain.length < 2) {
    console.warn('⚠️ Concept chain too short for relationship tracking');
    return { data: null, error: 'Chain must have at least 2 concepts' };
  }

  console.log(`🔗 Updating mastery for chain: ${conceptChain.join(' → ')}`);

  const updates: Promise<any>[] = [];

  // Update adjacent pairs (A→B, B→C, C→D)
  for (let i = 0; i < conceptChain.length - 1; i++) {
    updates.push(
      updateRelationshipMastery(
        userId,
        conceptChain[i],
        conceptChain[i + 1],
        isCorrect,
        documentId
      )
    );
  }

  // Update transitive relationship (first → last)
  if (conceptChain.length > 2) {
    updates.push(
      updateRelationshipMastery(
        userId,
        conceptChain[0],
        conceptChain[conceptChain.length - 1],
        isCorrect,
        documentId
      )
    );
  }

  try {
    const results = await Promise.all(updates);
    const successCount = results.filter(r => r.error === null).length;
    console.log(`✅ Updated ${successCount}/${updates.length} relationship mastery records`);
    
    return { data: results, error: null };
  } catch (error) {
    console.error('Error updating concept chain mastery:', error);
    return { data: null, error };
  }
};

/**
 * Get relationship mastery scores for a user
 * 
 * @param userId - User ID
 * @param documentId - Optional: filter by document
 * @param minScore - Optional: only return relationships below this score (for recommendations)
 */
export const getRelationshipMastery = async (
  userId: string,
  documentId?: string,
  minScore?: number
) => {
  try {
    let query = supabase
      .from('relationship_mastery')
      .select('*')
      .eq('user_id', userId);

    if (documentId) {
      query = query.eq('document_id', documentId);
    }

    if (minScore !== undefined) {
      query = query.lte('understanding_score', minScore);
    }

    const { data, error } = await query
      .order('understanding_score', { ascending: true })
      .order('last_practiced', { ascending: true });

    if (error) throw error;

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Error fetching relationship mastery:', error);
    return { data: [], error };
  }
};

/**
 * Get weak relationships for personalized recommendations
 * 
 * Returns concept pairs that need more practice (low mastery score)
 */
export const getWeakRelationships = async (
  userId: string,
  documentId?: string,
  limit: number = 10
) => {
  const { data, error } = await getRelationshipMastery(userId, documentId, 0.6);
  
  if (error) return { data: [], error };
  
  // Return top weakest relationships
  return { 
    data: data.slice(0, limit),
    error: null 
  };
};


// Profile utility functions for calculations and data processing

import { supabase } from './supabase';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  avatar_url: string | null;
  timezone: string;
  theme_preference: string;
  notifications_enabled: boolean;
  profile_visibility: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  total_study_minutes: number;
  created_at: string;
}

export interface LearningStats {
  documentsAnalyzed: number;
  quizzesCompleted: number;
  flashcardsReviewed: number;
  tutorSessions: number;
  currentStreak: number;
  totalStudyTime: number; // in minutes
}

export interface DocumentMastery {
  documentId: string;
  documentName: string;
  masteryScore: number;
  quizComponent: number;
  flashcardComponent: number;
  tutorComponent: number;
  suggestedAction: string | null;
  lastCalculatedAt: string;
}

export interface ActivityEvent {
  id: string;
  type: 'document_upload' | 'quiz_complete' | 'flashcard_review' | 'tutor_session' | 'badge_earned';
  title: string;
  description: string;
  timestamp: string;
  metadata?: any;
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  points: number;
  earned: boolean;
  earnedAt?: string;
}

export interface QuizTrendData {
  quizName: string;
  score: number;
  date: string;
}

export interface StudyTimeData {
  week: string;
  minutes: number;
}

// ============================================
// USER PROFILE FUNCTIONS
// ============================================

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }

  return data;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<boolean> {
  const { error } = await supabase
    .from('user_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user profile:', error);
    return false;
  }

  return true;
}

export async function ensureUserProfile(userId: string): Promise<void> {
  // Check if profile exists
  const { data: existing } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('id', userId)
    .single();

  if (!existing) {
    // Create profile
    await supabase.from('user_profiles').insert({
      id: userId,
      role: 'Student',
      current_streak: 0,
      longest_streak: 0,
      total_study_minutes: 0,
    });
  }
}

// ============================================
// LEARNING STATS CALCULATION
// ============================================

export async function getLearningStats(userId: string): Promise<LearningStats> {
  // Documents Analyzed
  const { count: documentsCount } = await supabase
    .from('documents')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // Quizzes Completed
  const { count: quizzesCount } = await supabase
    .from('quiz_results')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true);

  // Flashcards Reviewed
  const { count: flashcardsCount } = await supabase
    .from('flashcard_reviews')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId);

  // AI Tutor Sessions (count unique dates with tutor activity)
  const { data: tutorData } = await supabase
    .from('tutor_chats')
    .select('created_at')
    .eq('user_id', userId)
    .eq('role', 'user'); // Only count user messages

  const uniqueDates = new Set(
    tutorData?.map(chat => new Date(chat.created_at).toDateString()) || []
  );

  // Get profile data for streak and study time
  const profile = await getUserProfile(userId);

  return {
    documentsAnalyzed: documentsCount || 0,
    quizzesCompleted: quizzesCount || 0,
    flashcardsReviewed: flashcardsCount || 0,
    tutorSessions: uniqueDates.size,
    currentStreak: profile?.current_streak || 0,
    totalStudyTime: profile?.total_study_minutes || 0,
  };
}

// ============================================
// MASTERY SCORE CALCULATION
// ============================================

export async function calculateDocumentMastery(
  userId: string,
  documentId: string
): Promise<number> {
  // QUIZ COMPONENT (50%)
  const { data: quizResults } = await supabase
    .from('quiz_results')
    .select('score, total_questions')
    .eq('user_id', userId)
    .eq('document_id', documentId)
    .eq('completed', true);

  let quizScore = 0;
  if (quizResults && quizResults.length > 0) {
    const avgScore = quizResults.reduce((sum, q) => {
      const percentage = (q.score / q.total_questions) * 100;
      return sum + percentage;
    }, 0) / quizResults.length;
    quizScore = avgScore * 0.5; // 50% weight
  }

  // FLASHCARD COMPONENT (30%)
  const { data: flashcardReviews } = await supabase
    .from('flashcard_reviews')
    .select('rating')
    .eq('user_id', userId)
    .eq('document_id', documentId);

  let flashcardScore = 0;
  if (flashcardReviews && flashcardReviews.length > 0) {
    // Rating: 1-5, convert to percentage
    const avgRating = flashcardReviews.reduce((sum, f) => sum + f.rating, 0) / flashcardReviews.length;
    const percentage = (avgRating / 5) * 100;
    flashcardScore = percentage * 0.3; // 30% weight
  }

  // TUTOR COMPONENT (20%)
  const { data: tutorMessages } = await supabase
    .from('tutor_chats')
    .select('id, mode')
    .eq('user_id', userId)
    .eq('document_id', documentId)
    .eq('role', 'user');

  let tutorScore = 0;
  if (tutorMessages && tutorMessages.length > 0) {
    // Count document-focus mode questions
    const focusedQuestions = tutorMessages.filter(m => m.mode === 'focused').length;
    // Cap at 10 questions = 100%
    const percentage = Math.min((focusedQuestions / 10) * 100, 100);
    tutorScore = percentage * 0.2; // 20% weight
  }

  const totalMastery = Math.round(quizScore + flashcardScore + tutorScore);

  // Save to database
  await supabase
    .from('document_mastery')
    .upsert({
      user_id: userId,
      document_id: documentId,
      mastery_score: totalMastery,
      quiz_component: quizScore,
      flashcard_component: flashcardScore,
      tutor_component: tutorScore,
      last_calculated_at: new Date().toISOString(),
    }, {
      onConflict: 'user_id,document_id'
    });

  return totalMastery;
}

export async function getAllDocumentMastery(userId: string): Promise<DocumentMastery[]> {
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name')
    .eq('user_id', userId);

  if (!documents) return [];

  const masteryPromises = documents.map(async (doc) => {
    const score = await calculateDocumentMastery(userId, doc.id);
    const suggestion = generateSuggestedAction(score, doc.name);

    return {
      documentId: doc.id,
      documentName: doc.name,
      masteryScore: score,
      quizComponent: 0,
      flashcardComponent: 0,
      tutorComponent: 0,
      suggestedAction: suggestion,
      lastCalculatedAt: new Date().toISOString(),
    };
  });

  return Promise.all(masteryPromises);
}

function generateSuggestedAction(masteryScore: number, documentName: string): string | null {
  if (masteryScore >= 95) {
    return null; // Expert level, no action needed
  } else if (masteryScore >= 85) {
    return 'Review flashcards to reinforce key concepts';
  } else if (masteryScore >= 70) {
    return 'Retake quiz to improve understanding';
  } else {
    return `Deep dive with AI Tutor on ${documentName}`;
  }
}

// ============================================
// RECENT ACTIVITY TIMELINE
// ============================================

export async function getRecentActivity(
  userId: string,
  limit: number = 20,
  daysFilter?: number
): Promise<ActivityEvent[]> {
  const events: ActivityEvent[] = [];

  // Calculate date filter
  let dateFilter = '';
  if (daysFilter) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysFilter);
    dateFilter = cutoffDate.toISOString();
  }

  // Fetch documents
  let documentsQuery = supabase
    .from('documents')
    .select('id, name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (dateFilter) {
    documentsQuery = documentsQuery.gte('created_at', dateFilter);
  }

  const { data: documents } = await documentsQuery;
  
  documents?.forEach(doc => {
    events.push({
      id: `doc-${doc.id}`,
      type: 'document_upload',
      title: 'Document Uploaded',
      description: `Uploaded "${doc.name}"`,
      timestamp: doc.created_at,
    });
  });

  // Fetch quizzes
  let quizzesQuery = supabase
    .from('quiz_results')
    .select('id, quiz_name, score, total_questions, completed_at, completed')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('completed_at', { ascending: false });

  if (dateFilter) {
    quizzesQuery = quizzesQuery.gte('completed_at', dateFilter);
  }

  const { data: quizzes } = await quizzesQuery;

  quizzes?.forEach(quiz => {
    const percentage = Math.round((quiz.score / quiz.total_questions) * 100);
    events.push({
      id: `quiz-${quiz.id}`,
      type: 'quiz_complete',
      title: 'Quiz Completed',
      description: `Completed "${quiz.quiz_name}" – ${percentage}% (${quiz.score}/${quiz.total_questions})`,
      timestamp: quiz.completed_at,
    });
  });

  // Fetch flashcard reviews (group by session)
  let flashcardsQuery = supabase
    .from('flashcard_reviews')
    .select('id, document_id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (dateFilter) {
    flashcardsQuery = flashcardsQuery.gte('created_at', dateFilter);
  }

  const { data: flashcards } = await flashcardsQuery;

  // Group flashcards by session (same day + document)
  const flashcardSessions = new Map<string, { count: number; timestamp: string }>();
  flashcards?.forEach(fc => {
    const sessionKey = `${fc.document_id}-${new Date(fc.created_at).toDateString()}`;
    const existing = flashcardSessions.get(sessionKey);
    if (existing) {
      existing.count++;
    } else {
      flashcardSessions.set(sessionKey, { count: 1, timestamp: fc.created_at });
    }
  });

  flashcardSessions.forEach((session, key) => {
    events.push({
      id: `flashcard-${key}`,
      type: 'flashcard_review',
      title: 'Flashcards Reviewed',
      description: `Reviewed ${session.count} flashcard${session.count > 1 ? 's' : ''}`,
      timestamp: session.timestamp,
    });
  });

  // Fetch tutor sessions (group by day)
  let tutorQuery = supabase
    .from('tutor_chats')
    .select('id, document_id, created_at, mode')
    .eq('user_id', userId)
    .eq('role', 'user')
    .order('created_at', { ascending: false });

  if (dateFilter) {
    tutorQuery = tutorQuery.gte('created_at', dateFilter);
  }

  const { data: tutorChats } = await tutorQuery;

  const tutorSessions = new Map<string, { count: number; timestamp: string; mode: string }>();
  tutorChats?.forEach(chat => {
    const sessionKey = new Date(chat.created_at).toDateString();
    const existing = tutorSessions.get(sessionKey);
    if (existing) {
      existing.count++;
    } else {
      tutorSessions.set(sessionKey, { count: 1, timestamp: chat.created_at, mode: chat.mode });
    }
  });

  tutorSessions.forEach((session, key) => {
    events.push({
      id: `tutor-${key}`,
      type: 'tutor_session',
      title: 'AI Tutor Session',
      description: `Asked ${session.count} question${session.count > 1 ? 's' : ''} (${session.mode === 'focused' ? 'Document Focus' : 'General'} Mode)`,
      timestamp: session.timestamp,
    });
  });

  // Sort all events by timestamp
  events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return events.slice(0, limit);
}

// ============================================
// BADGES & ACHIEVEMENTS
// ============================================

export async function getUserBadges(userId: string): Promise<Badge[]> {
  // Get all badges
  const { data: allBadges } = await supabase
    .from('badges')
    .select('*')
    .order('points', { ascending: false });

  // Get user's earned badges
  const { data: earnedBadges } = await supabase
    .from('user_badges')
    .select('badge_id, earned_at')
    .eq('user_id', userId);

  const earnedBadgeIds = new Set(earnedBadges?.map(b => b.badge_id) || []);

  return (allBadges || []).map(badge => ({
    id: badge.id,
    name: badge.name,
    description: badge.description,
    icon: badge.icon,
    points: badge.points,
    earned: earnedBadgeIds.has(badge.id),
    earnedAt: earnedBadges?.find(b => b.badge_id === badge.id)?.earned_at,
  }));
}

export async function checkAndAwardBadges(userId: string): Promise<string[]> {
  const newBadges: string[] = [];
  const stats = await getLearningStats(userId);
  
  const { data: allBadges } = await supabase.from('badges').select('*');
  const { data: earnedBadges } = await supabase
    .from('user_badges')
    .select('badge_id')
    .eq('user_id', userId);

  const earnedBadgeIds = new Set(earnedBadges?.map(b => b.badge_id) || []);

  for (const badge of allBadges || []) {
    if (earnedBadgeIds.has(badge.id)) continue; // Already earned

    const criteria = badge.criteria as any;
    let shouldAward = false;

    switch (criteria.type) {
      case 'document_upload':
        shouldAward = stats.documentsAnalyzed >= criteria.threshold;
        break;
      case 'quiz_complete':
        shouldAward = stats.quizzesCompleted >= criteria.threshold;
        break;
      case 'flashcard_count':
        shouldAward = stats.flashcardsReviewed >= criteria.threshold;
        break;
      case 'streak':
        shouldAward = stats.currentStreak >= criteria.threshold;
        break;
      // Add more criteria checks as needed
    }

    if (shouldAward) {
      await supabase.from('user_badges').insert({
        user_id: userId,
        badge_id: badge.id,
      });
      newBadges.push(badge.name);
    }
  }

  return newBadges;
}

// ============================================
// PERFORMANCE CHARTS DATA
// ============================================

export async function getQuizTrendData(userId: string, limit: number = 10): Promise<QuizTrendData[]> {
  const { data } = await supabase
    .from('quiz_results')
    .select('quiz_name, score, total_questions, completed_at')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('completed_at', { ascending: true })
    .limit(limit);

  if (!data) return [];

  return data.map(quiz => ({
    quizName: quiz.quiz_name.length > 20 ? quiz.quiz_name.substring(0, 20) + '...' : quiz.quiz_name,
    score: Math.round((quiz.score / quiz.total_questions) * 100),
    date: new Date(quiz.completed_at).toLocaleDateString(),
  }));
}

export async function getStudyTimeData(userId: string): Promise<StudyTimeData[]> {
  const { data } = await supabase
    .from('activity_sessions')
    .select('started_at, duration_minutes')
    .eq('user_id', userId)
    .not('duration_minutes', 'is', null)
    .gte('started_at', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString())
    .order('started_at', { ascending: true });

  if (!data) return [];

  // Group by week
  const weeklyData = new Map<string, number>();
  data.forEach(session => {
    const date = new Date(session.started_at);
    const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));
    const weekKey = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    weeklyData.set(weekKey, (weeklyData.get(weekKey) || 0) + (session.duration_minutes || 0));
  });

  return Array.from(weeklyData.entries()).map(([week, minutes]) => ({
    week,
    minutes: Math.round(minutes),
  }));
}

// ============================================
// SUGGESTED NEXT ACTION
// ============================================

export async function getSuggestedNextAction(userId: string): Promise<{
  title: string;
  description: string;
  actions: Array<{ label: string; action: string }>;
} | null> {
  const stats = await getLearningStats(userId);
  const profile = await getUserProfile(userId);

  // Check for streak maintenance
  if (profile?.last_activity_date) {
    const lastActivity = new Date(profile.last_activity_date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0 && stats.currentStreak >= 6) {
      return {
        title: '🔥 Keep Your Streak Alive!',
        description: `You're on a ${stats.currentStreak}-day streak! Study today to keep it going.`,
        actions: [
          { label: 'Start Quiz', action: 'quiz' },
          { label: 'Review Flashcards', action: 'flashcards' },
        ],
      };
    }
  }

  // Check for low-scoring recent quizzes
  const { data: recentQuizzes } = await supabase
    .from('quiz_results')
    .select('quiz_name, score, total_questions, document_id')
    .eq('user_id', userId)
    .eq('completed', true)
    .order('completed_at', { ascending: false })
    .limit(3);

  const lowScoreQuiz = recentQuizzes?.find(q => (q.score / q.total_questions) < 0.8);
  if (lowScoreQuiz) {
    const percentage = Math.round((lowScoreQuiz.score / lowScoreQuiz.total_questions) * 100);
    return {
      title: '📚 Strengthen Your Understanding',
      description: `You scored ${percentage}% on "${lowScoreQuiz.quiz_name}". Review the material to improve mastery.`,
      actions: [
        { label: 'Review Document', action: `document:${lowScoreQuiz.document_id}` },
        { label: 'Ask AI Tutor', action: `tutor:${lowScoreQuiz.document_id}` },
      ],
    };
  }

  // Check for documents without quizzes
  const { data: documents } = await supabase
    .from('documents')
    .select('id, name')
    .eq('user_id', userId);

  if (documents && documents.length > 0) {
    for (const doc of documents) {
      const { count } = await supabase
        .from('quiz_results')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('document_id', doc.id);

      if (!count || count === 0) {
        return {
          title: '🎯 Test Your Knowledge',
          description: `You uploaded "${doc.name}" but haven't taken a quiz yet. Generate one to assess your understanding.`,
          actions: [
            { label: 'Generate Quiz', action: `generate-quiz:${doc.id}` },
            { label: 'Ask AI Tutor', action: `tutor:${doc.id}` },
          ],
        };
      }
    }
  }

  // Default: Encourage new activity
  if (stats.documentsAnalyzed === 0) {
    return {
      title: '👋 Welcome! Start Your Learning Journey',
      description: 'Upload your first document to unlock AI-powered quizzes, flashcards, and personalized tutoring.',
      actions: [
        { label: 'Upload Document', action: 'upload' },
      ],
    };
  }

  return null;
}

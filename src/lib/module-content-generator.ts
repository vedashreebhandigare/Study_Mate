/**
 * Module Content Generator
 * Generates module-specific quizzes and flashcards with topic filtering
 */

import { AdvancedQuizGenerator, QuizGenerationOptions } from './quiz-generator-advanced';
import { AdvancedFlashcardGenerator } from './flashcard-generator-advanced';
import { supabase } from './supabase';
import { createFlashcard } from './database';
import { markContentGenerated } from './module-progress-service';

export interface ModuleContentConfig {
  userId: string;
  documentId: string;
  moduleId: string;
  moduleTitle: string;
  moduleTopics: string[];
  quizCount?: number;
  flashcardCount?: number;
}

export interface GeneratedModuleContent {
  quizzes: any[];
  flashcards: any[];
  success: boolean;
  error?: string;
}

/**
 * Generate complete study content for a module
 */
export async function generateModuleContent(
  config: ModuleContentConfig
): Promise<GeneratedModuleContent> {
  const {
    userId,
    documentId,
    moduleId,
    moduleTitle,
    moduleTopics,
    quizCount = 5,
    flashcardCount = 10,
  } = config;

  try {
    console.log(`🎯 Generating content for module: ${moduleTitle}`);
    console.log(`📚 Topics: ${moduleTopics.join(', ')}`);

    // Get document text
    const documentText = await getDocumentText(documentId);
    if (!documentText) {
      throw new Error('Document text not found');
    }

    // Create topic-focused prompt for AI
    const topicFocus = `
IMPORTANT: Focus specifically on these topics from the module "${moduleTitle}":
${moduleTopics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

Generate questions and flashcards that directly test understanding of these specific topics.
`.trim();

    // Generate quizzes
    console.log(`📝 Generating ${quizCount} module-specific quizzes...`);
    const quizPromises = Array.from({ length: quizCount }, async (_, i) => {
      try {
        // Determine difficulty distribution
        const difficulty: 'undergraduate' | 'graduate' | 'phd' = 
          i < 2 ? 'undergraduate' : i < 4 ? 'graduate' : 'phd';
        
        const options: QuizGenerationOptions = {
          difficulty,
          questionCount: 5,
          maxRetries: 2,
        };

        // Generate quiz using the proper API
        const result = await AdvancedQuizGenerator.generateQuiz(
          `${topicFocus}\n\n${documentText}`,
          options
        );

        if (result && result.questions && result.questions.length > 0) {
          // Save quiz to database
          const { data: quizData, error: quizError } = await supabase
            .from('quizzes')
            .insert({
              user_id: userId,
              document_id: documentId,
              title: `${moduleTitle} - Quiz ${i + 1}`,
              subject: moduleTitle,
              questions: result.questions,
              module_id: moduleId,
              module_topic: moduleTitle,
            })
            .select()
            .single();

          if (quizError) {
            console.error(`Error saving quiz ${i + 1}:`, quizError);
            return null;
          }

          return quizData;
        }
        return null;
      } catch (error) {
        console.error(`Error generating quiz ${i + 1}:`, error);
        return null;
      }
    });

    const quizzes = (await Promise.all(quizPromises)).filter(Boolean);

    // Generate flashcards
    console.log(`🃏 Generating ${flashcardCount} module-specific flashcards...`);
    const distribution = AdvancedFlashcardGenerator.calculateDistribution(flashcardCount, 'advanced');
    
    try {
      const result = await AdvancedFlashcardGenerator.generateFlashcards({
        documentText: `${topicFocus}\n\n${documentText}`,
        deckName: moduleTitle,
        totalCards: flashcardCount,
        distribution,
      });

      const flashcards: any[] = [];
      
      // Save flashcards to database with module tags
      for (const flashcard of result.flashcards) {
        try {
          const { data, error } = await createFlashcard({
            ...flashcard,
            user_id: userId,
            document_id: documentId,
          });

          if (!error && data) {
            // Tag the flashcard with module info
            await tagFlashcardWithModule(data.id, moduleId, moduleTitle);
            flashcards.push(data);
          }
        } catch (error) {
          console.error('Error saving flashcard:', error);
        }
      }

      // Mark content as generated
      await markContentGenerated(userId, documentId, moduleId);

      console.log(`✅ Module content generated: ${quizzes.length} quizzes, ${flashcards.length} flashcards`);

      return {
        quizzes,
        flashcards,
        success: true,
      };
    } catch (error) {
      console.error('Error generating flashcards:', error);
      
      // Return quizzes even if flashcards failed
      await markContentGenerated(userId, documentId, moduleId);
      
      return {
        quizzes,
        flashcards: [],
        success: true,
      };
    }
  } catch (error) {
    console.error('Error generating module content:', error);
    return {
      quizzes: [],
      flashcards: [],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get document text from storage
 */
async function getDocumentText(documentId: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('extracted_text')
      .eq('id', documentId)
      .single();

    if (error) throw error;
    return data?.extracted_text || null;
  } catch (error) {
    console.error('Error fetching document text:', error);
    return null;
  }
}

/**
 * Tag flashcard with module information
 */
async function tagFlashcardWithModule(
  flashcardId: string,
  moduleId: string,
  moduleTitle: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from('flashcards')
      .update({
        module_id: moduleId,
        module_topic: moduleTitle,
      })
      .eq('id', flashcardId);

    if (error) throw error;
  } catch (error) {
    console.error('Error tagging flashcard with module:', error);
  }
}

/**
 * Check if module already has generated content
 */
export async function hasModuleContent(
  userId: string,
  moduleId: string
): Promise<boolean> {
  try {
    // Check for quizzes
    const { data: quizzes } = await supabase
      .from('quizzes')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .limit(1);

    // Check for flashcards
    const { data: flashcards } = await supabase
      .from('flashcards')
      .select('id')
      .eq('user_id', userId)
      .eq('module_id', moduleId)
      .limit(1);

    return (quizzes?.length || 0) > 0 || (flashcards?.length || 0) > 0;
  } catch (error) {
    console.error('Error checking module content:', error);
    return false;
  }
}

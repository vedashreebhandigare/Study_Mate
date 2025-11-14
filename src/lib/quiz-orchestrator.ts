/**
 * Quiz Orchestrator - Coordinates generation with retry logic and quality validation
 * Implements: 3-attempt retry, quality thresholds, exponential backoff
 */

import { AdvancedQuizGenerator, QuizGenerationOptions, GenerationProgress, QuizGenerationResult } from './quiz-generator-advanced';
import { QuizValidator, QuizQuestion } from './quiz-validator';
import { shuffleOptionsWithTracking, validateQuizQuality, autoPadOptions } from './quiz-validator';

const MAX_ATTEMPTS = 3;
const QUALITY_THRESHOLD = 60; // Minimum acceptable score

interface QualityLevel {
  level: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
  message?: string;
}

export interface EnhancedQuizResult extends QuizGenerationResult {
  qualityLevel: QualityLevel;
  attempt: number;
  warning?: string;
}

/**
 * Generate quiz with automatic retry and quality validation
 */
export async function generateAndValidateQuiz(
  documentText: string,
  options: QuizGenerationOptions,
  onProgress?: (progress: GenerationProgress) => void
): Promise<EnhancedQuizResult> {
  let bestResult: {
    result: QuizGenerationResult | null;
    score: number;
    attempt: number;
  } = {
    result: null,
    score: 0,
    attempt: 0,
  };

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      console.log(`🔄 Quiz generation attempt ${attempt}/${MAX_ATTEMPTS}...`);

      // Update progress
      onProgress?.({
        stage: 'generating',
        progress: 10 + (attempt - 1) * 5,
        message: `Generating quiz (attempt ${attempt}/${MAX_ATTEMPTS})...`,
      });

      // Generate quiz using existing advanced generator
      const result = await AdvancedQuizGenerator.generateQuiz(
        documentText,
        options,
        (subProgress) => {
          // Forward sub-progress with adjustment
          onProgress?.({
            ...subProgress,
            progress: 10 + (attempt - 1) * 5 + subProgress.progress * 0.7,
          });
        }
      );

      // Shuffle options to remove position bias
      const shuffledQuestions = result.questions.map(q => shuffleOptionsWithTracking(q));

      // Validate quality (including length balance)
      const qualityValidation = validateQuizQuality(shuffledQuestions, documentText);

      console.log(`Attempt ${attempt} quality score: ${qualityValidation.score}/100`);
      if (qualityValidation.issues.length > 0) {
        console.warn('Quality issues detected:', qualityValidation.issues);
      }

      // Update result with shuffled questions
      const shuffledResult = {
        ...result,
        questions: shuffledQuestions,
      };

      // Track best result
      if (qualityValidation.score > bestResult.score) {
        bestResult = {
          result: shuffledResult,
          score: qualityValidation.score,
          attempt,
        };
      }

      // Success case: Quality acceptable
      if (qualityValidation.score >= QUALITY_THRESHOLD) {
        console.log(`✅ Quality passed on attempt ${attempt} (score: ${qualityValidation.score})`);
        
        const qualityLevel = getQualityLevel(qualityValidation.score);
        
        return {
          ...shuffledResult,
          qualityLevel,
          attempt,
          warning: qualityValidation.score < 75 
            ? 'Quiz quality is acceptable but could be improved' 
            : undefined,
        };
      }

      // If below threshold and not last attempt, retry
      if (attempt < MAX_ATTEMPTS) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.log(`⏳ Quality below threshold (${qualityValidation.score}/100). Waiting ${delay}ms before retry...`);
        
        onProgress?.({
          stage: 'validating',
          progress: 80 + attempt * 5,
          message: `Quality check: ${qualityValidation.score}/100. Retrying...`,
        });
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }

    } catch (error) {
      console.error(`Attempt ${attempt} failed with exception:`, error);
      
      // If last attempt, throw the error
      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }
      
      // Otherwise, wait and retry
      const delay = Math.pow(2, attempt - 1) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  // Max attempts reached - use best result
  console.warn(`⚠️ Max attempts (${MAX_ATTEMPTS}) reached. Using best result (score: ${bestResult.score})`);

  if (!bestResult.result) {
    throw new Error('Failed to generate quiz after maximum retries');
  }

  // If quality is still poor, try auto-padding as last resort
  let finalQuestions = bestResult.result.questions;
  if (bestResult.score < QUALITY_THRESHOLD) {
    console.log('🔧 Applying auto-padding as fallback for length balance...');
    finalQuestions = finalQuestions.map(q => autoPadOptions(q));
  }

  const qualityLevel = getQualityLevel(bestResult.score);

  // If score is unacceptable, throw error
  if (bestResult.score < 40) {
    throw new Error('Unable to generate acceptable quality quiz. Please try with a different document or adjust settings.');
  }

  return {
    ...bestResult.result,
    questions: finalQuestions,
    qualityLevel,
    attempt: bestResult.attempt,
    warning: bestResult.score < QUALITY_THRESHOLD
      ? `Quiz quality is below optimal (${bestResult.score}/100). Some questions may have minor issues.`
      : undefined,
  };
}

/**
 * Get quality level based on score
 */
function getQualityLevel(score: number): QualityLevel {
  if (score >= 90) {
    return { level: 'excellent', message: 'Excellent quality quiz generated!' };
  }
  if (score >= 75) {
    return { level: 'good', message: 'Good quality quiz generated!' };
  }
  if (score >= 60) {
    return { level: 'acceptable', message: 'Quiz generated with acceptable quality' };
  }
  if (score >= 40) {
    return { level: 'poor', message: 'Quiz quality is below recommended standards' };
  }
  return { level: 'unacceptable', message: 'Quiz quality is unacceptable' };
}

/**
 * Get user-friendly quality message
 */
export function getQualityMessage(level: QualityLevel['level']): string {
  const messages = {
    excellent: '✓ Quiz generated (excellent quality)',
    good: '✓ Quiz generated (good quality)',
    acceptable: '⚠️ Quiz generated (minor quality issues detected)',
    poor: '⚠️ Quiz generated (quality issues detected)',
    unacceptable: '❌ Unable to generate acceptable quality quiz',
  };
  return messages[level];
}

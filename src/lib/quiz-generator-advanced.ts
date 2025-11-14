/**
 * Advanced Quiz Generator - Generate quizzes from documents using Gemini AI
 * Features: Dynamic question count, difficulty levels, content analysis, quality validation
 * Enhanced with: Fine-tuned generation config, question distribution, quality control, performance optimization
 * COGNITIVE SCIENCE ENHANCEMENTS: Bloom's Taxonomy, in-context examples, non-technical filtering
 */

import { generateWithGemini } from './gemini';
import { ContentAnalyzer, ContentAnalysis } from './content-analyzer';
import { QuizValidator, QuizQuestion, ValidationResult } from './quiz-validator';
import { validateQuestionForLevel, isNonTechnical, getCognitiveFramework } from './cognitive-framework';
import { getExamplesForLevel, formatExamplesForPrompt } from './example-questions';
import { MultiHopRetriever, MultiHopResult } from './multi-hop-retrieval';

export type DifficultyLevel = 'undergraduate' | 'graduate' | 'phd';

export interface QuizGenerationOptions {
  difficulty: DifficultyLevel;
  questionCount?: number; // If not provided, will be calculated based on content
  maxRetries?: number;
  chunkSize?: number; // For large documents
}

export interface GenerationProgress {
  stage: 'analyzing' | 'generating' | 'validating' | 'complete' | 'error';
  progress: number; // 0-100
  message: string;
  currentStep?: number;
  totalSteps?: number;
}

export interface QuizGenerationResult {
  questions: QuizQuestion[];
  contentAnalysis: ContentAnalysis;
  validation: ValidationResult;
  metadata: {
    generationTime: number;
    difficulty: DifficultyLevel;
    attempts: number;
    chunksProcessed: number;
    difficultyDistribution: { easy: number; medium: number; hard: number };
    cognitiveQuality: number; // NEW: Cognitive validation score
  };
}

// ✅ KEY ENHANCEMENT 1: Generation Config Parameters
interface GenerationConfig {
  temperature: number;
  topK: number;
  topP: number;
  maxOutputTokens: number;
}

// ✅ KEY ENHANCEMENT 2: Question Distribution by Difficulty Level
const QUESTION_DISTRIBUTION = {
  undergraduate: { easy: 0.40, medium: 0.40, hard: 0.20 },
  graduate: { easy: 0.20, medium: 0.50, hard: 0.30 },
  phd: { easy: 0.10, medium: 0.40, hard: 0.50 },
} as const;

// ✅ KEY ENHANCEMENT 3: Quality Control Parameters
const QUALITY_PARAMS = {
  minExplanationLength: 50,
  maxExplanationLength: 250,
  minDistractorLength: 10,
  contentCoverageTarget: 0.75, // 75% of document should be covered
  minOptionLengthRatio: 0.3, // Options shouldn't be too short compared to others
} as const;

export class AdvancedQuizGenerator {
  private static readonly MAX_RETRIES = 3;
  private static readonly CHUNK_SIZE = 4000; // words per chunk
  private static readonly MAX_TOKENS = 30000; // Gemini limit

  /**
   * ✅ ENHANCED: Get generation config based on difficulty
   */
  private static getGenerationConfig(difficulty: DifficultyLevel, questionCount: number): GenerationConfig {
    const baseConfig = {
      undergraduate: {
        temperature: 0.4, // Lower temperature for straightforward questions
        topK: 30,
        topP: 0.85,
      },
      graduate: {
        temperature: 0.5, // Moderate creativity
        topK: 35,
        topP: 0.90,
      },
      phd: {
        temperature: 0.6, // Higher for complex, nuanced questions
        topK: 40,
        topP: 0.95,
      },
    }[difficulty];

    return {
      ...baseConfig,
      maxOutputTokens: questionCount * 400, // ~400 tokens per question
      retries: 5, // Auto-retry on 503 overload errors
      retryDelay: 2000, // Exponential backoff starting at 2s
    };
  }

  /**
   * ✅ ENHANCED: Calculate target distribution for questions
   */
  private static getTargetDistribution(questionCount: number, difficulty: DifficultyLevel) {
    const distribution = QUESTION_DISTRIBUTION[difficulty];
    return {
      easy: Math.round(questionCount * distribution.easy),
      medium: Math.round(questionCount * distribution.medium),
      hard: Math.round(questionCount * distribution.hard),
    };
  }

  /**
   * Generate quiz from document text
   */
  static async generateQuiz(
    documentText: string,
    options: QuizGenerationOptions,
    onProgress?: (progress: GenerationProgress) => void
  ): Promise<QuizGenerationResult> {
    const startTime = performance.now();
    const maxRetries = options.maxRetries || this.MAX_RETRIES;
    let attempts = 0;

    try {
      // Stage 1: Analyze content
      onProgress?.({
        stage: 'analyzing',
        progress: 10,
        message: 'Analyzing document content...',
      });

      const contentAnalysis = ContentAnalyzer.analyzeContent(documentText);
      const questionCount = options.questionCount || contentAnalysis.suggestedQuestionCount;
      const targetDistribution = this.getTargetDistribution(questionCount, options.difficulty);

      onProgress?.({
        stage: 'analyzing',
        progress: 25,
        message: `Analysis complete. Generating ${questionCount} questions (${targetDistribution.easy} easy, ${targetDistribution.medium} medium, ${targetDistribution.hard} hard)...`,
      });

      // Stage 2: Determine if chunking is needed
      const needsChunking = contentAnalysis.wordCount > this.CHUNK_SIZE;
      const chunks = needsChunking
        ? this.chunkDocument(documentText, this.CHUNK_SIZE)
        : [documentText];

      // Stage 3: Generate quiz with retry logic
      let questions: QuizQuestion[] = [];
      let validation: ValidationResult | null = null;
      let cognitiveQuality = 0;

      while (attempts < maxRetries) {
        attempts++;

        onProgress?.({
          stage: 'generating',
          progress: 30 + (attempts - 1) * 20,
          message: `Generating quiz (attempt ${attempts}/${maxRetries})...`,
          currentStep: attempts,
          totalSteps: maxRetries,
        });

        try {
          // ✅ ENHANCED: Generate with fine-tuned config and distribution
          const allQuestions = await this.generateFromChunks(
            chunks,
            questionCount,
            options.difficulty,
            targetDistribution,
            (chunkProgress) => {
              onProgress?.({
                stage: 'generating',
                progress: 30 + chunkProgress * 0.4,
                message: 'Generating questions from document sections...',
              });
            }
          );

          // ✅ COGNITIVE ENHANCEMENT: Filter non-technical questions
          const technicalQuestions = allQuestions.filter(q => !isNonTechnical(q.question));
          
          if (technicalQuestions.length < allQuestions.length) {
            console.log(`🔬 Filtered out ${allQuestions.length - technicalQuestions.length} non-technical questions`);
          }

          // ✅ COGNITIVE ENHANCEMENT: Validate cognitive level
          // ✅ FIX: Adaptive threshold - stricter for small quizzes, lenient for large
          const minScore = questionCount <= 10 ? 50 : 40; // Scale down for large batches
          const cognitiveValidated = technicalQuestions.filter(q => {
            const validation = validateQuestionForLevel(q.question, options.difficulty);
            return validation.isValid && validation.score >= minScore;
          });

          if (cognitiveValidated.length < technicalQuestions.length) {
            console.log(`🧠 Filtered out ${technicalQuestions.length - cognitiveValidated.length} questions with incorrect cognitive level`);
          }

          // ✅ ENHANCEMENT 4: Deduplication
          questions = this.deduplicateQuestions(cognitiveValidated);

          // ✅ FIX: Adaptive minimum - scales with quiz size
          // Small quizzes (≤10): 80% minimum (strict)
          // Large quizzes (>10): 65% minimum (lenient to account for filtering losses)
          const targetPercentage = questionCount <= 10 ? 0.80 : 0.65;
          const minAcceptable = Math.max(
            Math.ceil(questionCount * targetPercentage),
            Math.min(questionCount - 2, 3) // At least 3, or 2 short of target
          );
          
          if (questions.length < minAcceptable) {
            console.warn(`⚠️ Only ${questions.length}/${questionCount} questions after filtering (need ${minAcceptable}). Retrying...`);
            throw new Error(`Insufficient questions after filtering (${questions.length}/${questionCount}). Retrying with adjusted prompts...`);
          }
          
          // If we have enough but not exact count, that's OK
          if (questions.length < questionCount && questions.length >= minAcceptable) {
            console.warn(`⚠️ Generated ${questions.length}/${questionCount} questions. This is acceptable (${Math.round(questions.length/questionCount*100)}%).`);
          }

          // Take top questions by count
          questions = questions.slice(0, questionCount);

          // Stage 4: Validate quiz
          onProgress?.({
            stage: 'validating',
            progress: 80,
            message: 'Validating quiz quality...',
          });

          validation = QuizValidator.validateQuiz(questions);

          // ✅ COGNITIVE ENHANCEMENT: Calculate cognitive quality score
          cognitiveQuality = this.calculateCognitiveQuality(questions, options.difficulty);

          // ✅ UPDATE: Inject cognitive quality into quality card
          if (validation.qualityCard) {
            validation.qualityCard.cognitiveAlignment = cognitiveQuality;
            // Recalculate overall score with cognitive quality
            const positionValues = Object.values(validation.qualityCard.positionBalance);
            const avgPosition = positionValues.reduce((a, b) => a + b, 0) / 4;
            const positionVariance = Math.sqrt(
              positionValues.reduce((sum, val) => sum + Math.pow(val - avgPosition, 2), 0) / 4
            );
            validation.qualityCard.overallScore = Math.round(
              (positionVariance < 15 ? 25 : 0) +
              validation.qualityCard.lengthBalance * 0.25 +
              (validation.qualityCard.biasedPhrasing === 0 ? 25 : Math.max(0, 25 - validation.qualityCard.biasedPhrasing * 5)) +
              cognitiveQuality * 0.25
            );
            // Add cognitive badge if high quality
            if (cognitiveQuality >= 85 && !validation.qualityCard.badges.includes('PhD-level depth')) {
              if (options.difficulty === 'phd') validation.qualityCard.badges.push('PhD-level depth');
              else if (options.difficulty === 'graduate') validation.qualityCard.badges.push('Graduate-level depth');
            }
          }

          // ✅ ENHANCED: Check quality parameters
          const meetsQualityStandards = this.validateQualityStandards(questions);

          // ✅ FIX: Adaptive quality thresholds (reuse targetPercentage from above)
          const hasEnoughQuestions = questions.length >= Math.ceil(questionCount * targetPercentage);
          
          // Relax quality for large quizzes (harder to maintain across 20+ questions)
          const minValidation = questionCount <= 10 ? 60 : 55;
          const minCognitive = questionCount <= 10 ? 60 : 55;
          const hasDecentQuality = validation.score >= minValidation && cognitiveQuality >= minCognitive;
          const passesCheck = hasEnoughQuestions && hasDecentQuality && meetsQualityStandards;

          // If validation passes or we've used all retries, break
          if (passesCheck || attempts >= maxRetries) {
            if (passesCheck) {
              console.log('✅ Quality check passed!', { 
                questions: questions.length, 
                target: questionCount,
                validation: validation.score, 
                cognitive: cognitiveQuality 
              });
            } else {
              console.log(`⚠️ Using attempt ${attempts} results (not all criteria met but max retries reached)`);
            }
            break;
          }

          // If validation failed, try again
          console.log(`❌ Attempt ${attempts} failed quality check:`, {
            questions: questions.length,
            needed: Math.ceil(questionCount * targetPercentage),
            validationScore: validation.score,
            cognitiveQuality,
            meetsQualityStandards
          });
          
          onProgress?.({
            stage: 'generating',
            progress: 30 + attempts * 20,
            message: `Improving quality (attempt ${attempts}/${maxRetries})...`,
          });
        } catch (error) {
          if (attempts >= maxRetries) {
            throw error;
          }
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
      }

      if (!validation) {
        throw new Error('Failed to generate valid quiz after maximum retries');
      }

      // Calculate actual distribution
      const actualDistribution = {
        easy: questions.filter(q => q.difficulty === 'easy').length,
        medium: questions.filter(q => q.difficulty === 'medium').length,
        hard: questions.filter(q => q.difficulty === 'hard').length,
      };

      // ✅ LOG: Show generation summary
      console.log('✅ Quiz Generation Complete:', {
        requested: questionCount,
        generated: questions.length,
        distribution: actualDistribution,
        qualityScore: validation.score,
        cognitiveQuality,
        attempts,
      });

      // Stage 5: Complete
      onProgress?.({
        stage: 'complete',
        progress: 100,
        message: `Generated ${questions.length}/${questionCount} questions | Quality: ${QuizValidator.getQualityLabel(validation.score)} (${validation.score}/100)`,
      });

      const generationTime = performance.now() - startTime;

      return {
        questions,
        contentAnalysis,
        validation,
        metadata: {
          generationTime,
          difficulty: options.difficulty,
          attempts,
          chunksProcessed: chunks.length,
          difficultyDistribution: actualDistribution,
          cognitiveQuality,
        },
      };
    } catch (error) {
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      });
      throw error;
    }
  }

  /**
   * ✅ ENHANCED: Generate questions from multiple chunks with target distribution
   */
  private static async generateFromChunks(
    chunks: string[],
    totalQuestions: number,
    difficulty: DifficultyLevel,
    targetDistribution: { easy: number; medium: number; hard: number },
    onProgress?: (progress: number) => void
  ): Promise<QuizQuestion[]> {
    // ✅ FIX: Scale inflation based on quiz size
    // Small quizzes (≤10): 2.5x buffer
    // Large quizzes (>10): 3x buffer (filtering is harder at scale)
    const inflationFactor = totalQuestions <= 10 ? 2.5 : 3.0;
    const inflatedTotal = Math.ceil(totalQuestions * inflationFactor);
    const questionsPerChunk = Math.ceil(inflatedTotal / chunks.length);
    
    console.log(`📊 Generating ${inflatedTotal} questions (${inflationFactor}x) to filter down to ${totalQuestions}`);
    const allQuestions: QuizQuestion[] = [];
    const config = this.getGenerationConfig(difficulty, inflatedTotal);

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isLastChunk = i === chunks.length - 1;
      const questionsNeeded = isLastChunk
        ? inflatedTotal - allQuestions.length
        : questionsPerChunk;

      try {
        // ✅ ENHANCED: Pass distribution info to prompt with cognitive framework
        const prompt = this.buildCognitivePrompt(chunk, questionsNeeded, difficulty, targetDistribution);
        
        // ✅ ENHANCED: Use fine-tuned generation config
        const response = await generateWithGemini(prompt, config);
        
        if (!response || response.trim().length === 0) {
          console.error('❌ Empty response from Gemini');
          throw new Error('Received empty response from AI');
        }
        
        const questions = this.parseQuizResponse(response);
        
        if (questions.length === 0) {
          console.error('❌ No questions parsed from response');
          throw new Error('Failed to extract questions from AI response');
        }
        
        console.log(`✅ Generated ${questions.length} questions from chunk ${i + 1}/${chunks.length}`);
        allQuestions.push(...questions.slice(0, questionsNeeded));
        
      } catch (chunkError: any) {
        console.error(`❌ Error processing chunk ${i + 1}:`, chunkError.message);
        
        // If this isn't the first chunk and we have some questions, continue
        if (allQuestions.length > 0) {
          console.warn(`⚠️ Continuing with ${allQuestions.length} questions from previous chunks`);
          break;
        } else {
          // If this is the first chunk or we have no questions, rethrow
          throw new Error(`Failed to generate quiz: ${chunkError.message}`);
        }
      }

      onProgress?.((i + 1) / chunks.length * 100);

      if (allQuestions.length >= inflatedTotal) {
        break;
      }
    }

    // Return all generated questions (will be filtered later)
    return allQuestions;
  }

  /**
   * ✅ ENHANCED: Build concise, effective prompt with critical quality rules
   */
  private static buildCognitivePrompt(
    content: string,
    questionCount: number,
    difficulty: DifficultyLevel,
    targetDistribution: { easy: number; medium: number; hard: number }
  ): string {
    const cognitiveFramework = getCognitiveFramework(difficulty);

    // Difficulty-specific instructions (condensed)
    const difficultyGuide = {
      undergraduate: {
        bloomLevel: 'Levels 1-2 (Remember, Understand, Apply)',
        verbs: cognitiveFramework.preferredVerbs.slice(0, 8).join(', '),
        focus: 'Test fundamental understanding and conceptual knowledge',
        example: `Q: "What primary metric does the system use to detect cognitive disengagement?"
Options (ALL ~8 words, ALL plausible):
A. "Mouth opening patterns measured through facial landmark analysis" (9 words)
B. "Eye closure patterns measured through aspect ratio calculations" (8 words) ✓
C. "Head rotation patterns measured through pose estimation algorithms" (8 words)
D. "Facial expression patterns measured through emotion classification models" (9 words)`
      },
      graduate: {
        bloomLevel: 'Levels 3-4 (Apply, Analyze, Evaluate)',
        verbs: cognitiveFramework.preferredVerbs.slice(0, 8).join(', '),
        focus: 'Require applying concepts to new scenarios and analyzing trade-offs',
        example: `Q: "Why is GRU more efficient than LSTM for edge devices with limited memory?"
Options (ALL ~10 words, ALL plausible):
A. "GRU has fewer parameters reducing memory footprint during inference" (9 words) ✓
B. "LSTM provides better accuracy compensating for increased memory usage" (9 words)
C. "GRU processes sequences faster but requires more memory allocation" (9 words)
D. "LSTM gates enable longer memory retention with minimal overhead" (9 words)`
      },
      phd: {
        bloomLevel: 'Levels 5-6 (Evaluate, Create)',
        verbs: cognitiveFramework.preferredVerbs.slice(0, 8).join(', '),
        focus: 'Require critical evaluation of methodology and theoretical limitations',
        example: `Q: "What fundamental assumption limits the generalizability of this approach to new populations?"
Options (ALL ~12 words, ALL plausible):
A. "Eye aspect ratio thresholds remain constant across different demographic groups and lighting" (12 words)
B. "Facial landmark detection accuracy is independent of head pose and occlusions" (12 words) ✓
C. "Student engagement patterns are universally consistent regardless of cultural educational contexts" (11 words)
D. "Camera frame rate and resolution do not affect temporal pattern detection" (12 words)`
      }
    };

    const guide = difficultyGuide[difficulty];

    return `Generate ${questionCount} multiple-choice questions from this content.

CONTENT:
${content}

DIFFICULTY: ${difficulty} (Bloom's ${guide.bloomLevel})
${guide.focus}

CRITICAL QUALITY RULES (NON-NEGOTIABLE):
✓ ALL 4 options MUST be 8-12 words (±2 words max difference)
✓ ALL options MUST sound equally plausible and academic
✓ Paraphrase concepts - NO verbatim copying from content (no 6+ consecutive words)
✓ Wrong answers = plausible misconceptions (use patterns below), NOT obviously false
✓ NO absolute words ("always", "never", "only", "randomly") in wrong answers
✓ Vary correct answer position (A/B/C/D should be roughly equal across all questions)

PLAUSIBILITY PATTERNS FOR WRONG ANSWERS:
1. Misapplied Concept: Correct technique, wrong context
2. Partial Truth: Accurate but incomplete/missing critical factor
3. Outdated Method: Valid historically, now superseded
4. Overgeneralization: True sometimes, not this case

TARGET DISTRIBUTION:
- Easy: ${targetDistribution.easy} (${Math.round(targetDistribution.easy / questionCount * 100)}%)
- Medium: ${targetDistribution.medium} (${Math.round(targetDistribution.medium / questionCount * 100)}%)
- Hard: ${targetDistribution.hard} (${Math.round(targetDistribution.hard / questionCount * 100)}%)

PREFERRED COGNITIVE VERBS: ${guide.verbs}

PERFECT EXAMPLE:
${guide.example}

Notice: All options same length, all sound technical, all plausible, no absolute language.

OUTPUT FORMAT (CRITICAL - FOLLOW EXACTLY):

⚠️ CRITICAL JSON RULES - MUST FOLLOW:
1. Return ONLY a JSON array - no markdown, no code blocks, no text before/after
2. ALL property names MUST use double quotes: "question", "options", "correctAnswer", "explanation", "difficulty"
3. ALL string values MUST use double quotes " NOT single quotes '
4. NO trailing commas before ] or }
5. correctAnswer MUST be a number (0, 1, 2, or 3) NOT a string
6. All strings must be on a single line (no unescaped newlines)
7. Escape quotes inside strings using \"
8. DO NOT use unquoted property names like {question: ...} - MUST be {"question": ...}

VALID EXAMPLE:
[
  {
    "question": "Which approach best explains the primary advantage discussed in the text?",
    "options": ["Option A with 8-12 words describing a concept", "Option B with similar length explaining alternative", "Option C presenting another plausible approach clearly", "Option D offering different but reasonable perspective"],
    "correctAnswer": 2,
    "explanation": "Option C is correct because it accurately describes the documented advantage. Option A misapplies the concept to wrong context. Option B is historically valid but now outdated. Option D overgeneralizes a specific case.",
    "difficulty": "medium"
  }
]

CRITICAL: Ensure all JSON is properly formatted. Test each question object is valid before adding to array.

Return ONLY the JSON array, nothing else:`;
  }

  /**
   * Parse Gemini response into quiz questions with robust fallback strategies
   */
  private static parseQuizResponse(response: string): QuizQuestion[] {
    try {
      console.log('📝 Parsing quiz response (length:', response.length, 'chars)');
      
      // Strategy 1: Remove markdown code blocks and extract JSON
      let cleaned = response
        .replace(/```json\s*/gi, '')
        .replace(/```\s*/g, '')
        .trim();

      // Strategy 2: Extract JSON array with greedy matching
      let jsonMatch = cleaned.match(/\[\s*\{[\s\S]*\}\s*\]/);
      
      // If no match, try to find the first [ and last ] to extract the array
      if (!jsonMatch) {
        const firstBracket = cleaned.indexOf('[');
        const lastBracket = cleaned.lastIndexOf(']');
        
        if (firstBracket !== -1 && lastBracket !== -1 && firstBracket < lastBracket) {
          cleaned = cleaned.substring(firstBracket, lastBracket + 1);
          jsonMatch = [cleaned];
        } else {
          throw new Error('No valid JSON array found in response');
        }
      }

      let jsonString = jsonMatch[0];
      
      // Strategy 3: Fix common JSON issues
      // Fix unquoted property names (word followed by colon, not inside quotes)
      jsonString = jsonString.replace(/([{,]\s*)(\w+)(\s*:)/g, '$1"$2"$3');
      
      // Replace single quotes with double quotes (but be careful with apostrophes in strings)
      // First, protect apostrophes in already quoted strings
      const protectedStrings: string[] = [];
      jsonString = jsonString.replace(/"([^"]*)"/g, (match, content) => {
        protectedStrings.push(content);
        return `__PROTECTED_${protectedStrings.length - 1}__`;
      });
      
      // Now replace single quotes with double quotes
      jsonString = jsonString.replace(/'/g, '"');
      
      // Restore protected strings
      jsonString = jsonString.replace(/__PROTECTED_(\d+)__/g, (match, index) => {
        return `"${protectedStrings[parseInt(index)]}"`;
      });
      
      // Remove trailing commas before ] or }
      jsonString = jsonString.replace(/,\s*([\]}])/g, '$1');
      
      // Fix unescaped newlines in strings
      jsonString = jsonString.replace(/"([^"]*)\n([^"]*)"/g, '"$1\\n$2"');
      
      // Fix unescaped tabs
      jsonString = jsonString.replace(/"([^"]*)\t([^"]*)"/g, '"$1\\t$2"');
      
      // Fix potential double-double quotes created by fixes
      jsonString = jsonString.replace(/""+/g, '"');

      console.log('🧹 Cleaned JSON (first 200 chars):', jsonString.substring(0, 200));

      let parsed: any[];
      
      try {
        // Strategy 4: Try standard JSON parse
        parsed = JSON.parse(jsonString);
        console.log('✅ Standard JSON parse successful');
      } catch (parseError) {
        console.warn('⚠️ Standard parse failed, trying repair...', parseError);
        
        // Strategy 5: Try manual extraction with regex
        parsed = this.extractQuestionsManually(jsonString);
        console.log('✅ Manual extraction successful');
      }

      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('Parsed result is not a valid question array');
      }

      // Convert to our QuizQuestion format
      const questions = parsed.map((q: any, index: number) => {
        try {
          // Validate required fields
          if (!q.question || !Array.isArray(q.options) || q.options.length < 2) {
            console.warn(`⚠️ Skipping invalid question at index ${index}:`, q);
            return null;
          }

          // Parse correct answer (handle both number and string formats)
          let correctAnswer: number;
          if (typeof q.correctAnswer === 'number') {
            correctAnswer = q.correctAnswer;
          } else if (typeof q.correct_answer === 'number') {
            correctAnswer = q.correct_answer;
          } else if (typeof q.correctAnswer === 'string') {
            correctAnswer = parseInt(q.correctAnswer);
          } else if (typeof q.correct_answer === 'string') {
            correctAnswer = parseInt(q.correct_answer);
          } else {
            correctAnswer = 0; // Default to first option
          }

          return {
            question: String(q.question).trim(),
            options: q.options.map((opt: any) => String(opt).trim()),
            correctAnswer,
            explanation: q.explanation ? String(q.explanation).trim() : 'No explanation provided',
            difficulty: q.difficulty || 'medium',
          };
        } catch (mapError) {
          console.warn(`⚠️ Error mapping question at index ${index}:`, mapError);
          return null;
        }
      }).filter((q): q is QuizQuestion => q !== null);

      if (questions.length === 0) {
        throw new Error('No valid questions found after parsing');
      }

      console.log(`✅ Successfully parsed ${questions.length} questions`);
      return questions;
      
    } catch (error: any) {
      console.error('❌ Failed to parse quiz response:', error);
      console.log('📄 Response preview (first 500 chars):', response.substring(0, 500));
      console.log('📄 Response preview (last 500 chars):', response.substring(Math.max(0, response.length - 500)));
      throw new Error(`Failed to parse quiz from AI response: ${error.message}`);
    }
  }

  /**
   * Manual extraction fallback when JSON.parse fails
   * Handles unquoted/single-quoted property names and values
   */
  private static extractQuestionsManually(jsonString: string): any[] {
    console.log('🔧 Attempting manual question extraction...');
    console.log('📄 JSON preview (first 300 chars):', jsonString.substring(0, 300));
    
    const questions: any[] = [];
    
    // First, try to fix common JSON issues that prevent parsing
    let fixedJson = jsonString
      // Replace single quotes with double quotes (but preserve escaped quotes)
      .replace(/'/g, '"')
      // Fix unquoted property names (word followed by colon)
      .replace(/(\w+)\s*:/g, '"$1":')
      // Remove trailing commas
      .replace(/,\s*([\]}])/g, '$1')
      // Fix double-double quotes that might have been created
      .replace(/""+/g, '"');
    
    console.log('🔧 Fixed JSON preview (first 300 chars):', fixedJson.substring(0, 300));
    
    // Try parsing the fixed JSON first
    try {
      const parsed = JSON.parse(fixedJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log('✅ Fixed JSON parsed successfully!');
        return parsed;
      }
    } catch (e) {
      console.warn('⚠️ Fixed JSON still invalid, trying regex extraction...');
    }
    
    // Pattern 1: Match with flexible property names (quoted or unquoted)
    // Matches: question/options/correctAnswer/explanation/difficulty in any quote style
    const flexiblePattern = /['"']?question['"']?\s*:\s*['"']([^'"]*)['"']\s*,?\s*['"']?options['"']?\s*:\s*\[([\s\S]*?)\]\s*,?\s*['"']?correctAnswer['"']?\s*:\s*['"']?(\d+)['"']?\s*,?\s*['"']?explanation['"']?\s*:\s*['"']([^'"]*)['"']/gi;
    
    let match;
    while ((match = flexiblePattern.exec(jsonString)) !== null) {
      try {
        const questionText = match[1];
        const optionsStr = match[2];
        const correctAns = parseInt(match[3]);
        const explanation = match[4];
        
        // Extract options - handle both quoted and unquoted
        const options: string[] = [];
        const optionPattern = /['"']([^'"]+)['"']/g;
        let optMatch;
        while ((optMatch = optionPattern.exec(optionsStr)) !== null) {
          options.push(optMatch[1]);
        }
        
        if (questionText && options.length >= 2) {
          questions.push({
            question: questionText,
            options,
            correctAnswer: correctAns,
            explanation: explanation || 'No explanation provided',
            difficulty: 'medium'
          });
        }
      } catch (extractError) {
        console.warn('⚠️ Failed to extract a question:', extractError);
      }
    }
    
    // Pattern 2: If still no questions, try even more flexible extraction
    if (questions.length === 0) {
      console.log('🔧 Trying ultra-flexible extraction...');
      
      // Split by object boundaries and try to extract each question
      const objectSplits = jsonString.split(/[{}]/);
      
      for (const section of objectSplits) {
        try {
          // Look for question text
          const qMatch = section.match(/question['"']?\s*:\s*['"']([^'"]+)['"']/i);
          if (!qMatch) continue;
          
          // Look for options array
          const optsMatch = section.match(/options['"']?\s*:\s*\[([^\]]+)\]/i);
          if (!optsMatch) continue;
          
          // Look for correct answer
          const ansMatch = section.match(/correctAnswer['"']?\s*:\s*['"']?(\d+)['"']?/i);
          if (!ansMatch) continue;
          
          // Look for explanation
          const expMatch = section.match(/explanation['"']?\s*:\s*['"']([^'"]*)['"']/i);
          
          // Extract options
          const options: string[] = [];
          const optPattern = /['"']([^'"]+)['"']/g;
          let om;
          while ((om = optPattern.exec(optsMatch[1])) !== null) {
            options.push(om[1]);
          }
          
          if (options.length >= 2) {
            questions.push({
              question: qMatch[1],
              options,
              correctAnswer: parseInt(ansMatch[1]),
              explanation: expMatch ? expMatch[1] : 'No explanation provided',
              difficulty: 'medium'
            });
          }
        } catch (e) {
          // Skip this section
        }
      }
    }
    
    console.log(`🔧 Manual extraction found ${questions.length} questions`);
    
    if (questions.length === 0) {
      console.error('❌ No questions found. JSON structure:');
      console.log('Sample:', jsonString.substring(0, 500));
      throw new Error('Manual extraction found no valid questions');
    }
    
    return questions;
  }

  /**
   * ✅ ENHANCEMENT 4: Deduplicate similar questions
   */
  private static deduplicateQuestions(questions: QuizQuestion[]): QuizQuestion[] {
    const unique: QuizQuestion[] = [];
    const seen = new Set<string>();

    for (const question of questions) {
      // Create a normalized version for comparison
      const normalized = question.question.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .trim();

      // Check if we've seen a very similar question
      let isDuplicate = false;
      for (const seenQuestion of seen) {
        const similarity = this.calculateSimilarity(normalized, seenQuestion);
        if (similarity > 0.85) { // 85% similarity threshold
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        unique.push(question);
        seen.add(normalized);
      }
    }

    return unique;
  }

  /**
   * Calculate similarity between two strings (simple Jaccard similarity)
   */
  private static calculateSimilarity(str1: string, str2: string): number {
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * ✅ KEY ENHANCEMENT 3: Validate quality standards
   */
  private static validateQualityStandards(questions: QuizQuestion[]): boolean {
    let passedChecks = 0;
    let totalChecks = 0;

    for (const question of questions) {
      // Check 1: Explanation length
      totalChecks++;
      if (
        question.explanation.length >= QUALITY_PARAMS.minExplanationLength &&
        question.explanation.length <= QUALITY_PARAMS.maxExplanationLength
      ) {
        passedChecks++;
      }

      // Check 2: Option length consistency (no suspiciously short options)
      totalChecks++;
      const optionLengths = question.options.map(opt => opt.length);
      const avgLength = optionLengths.reduce((a, b) => a + b, 0) / optionLengths.length;
      const allOptionsReasonable = optionLengths.every(
        len => len >= avgLength * QUALITY_PARAMS.minOptionLengthRatio
      );
      if (allOptionsReasonable) {
        passedChecks++;
      }

      // Check 3: All options have minimum length
      totalChecks++;
      if (question.options.every(opt => opt.length >= QUALITY_PARAMS.minDistractorLength)) {
        passedChecks++;
      }

      // Check 4: Question has question mark
      totalChecks++;
      if (question.question.endsWith('?')) {
        passedChecks++;
      }
    }

    // Must pass at least 80% of quality checks
    const qualityScore = passedChecks / totalChecks;
    return qualityScore >= 0.80;
  }

  /**
   * ✅ COGNITIVE ENHANCEMENT: Calculate cognitive quality score
   */
  private static calculateCognitiveQuality(
    questions: QuizQuestion[],
    difficulty: DifficultyLevel
  ): number {
    let totalScore = 0;

    for (const question of questions) {
      const validation = validateQuestionForLevel(question.question, difficulty);
      totalScore += validation.score;
    }

    return Math.round(totalScore / questions.length);
  }

  /**
   * Chunk large document into smaller pieces
   */
  private static chunkDocument(text: string, chunkSize: number): string[] {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += chunkSize) {
      const chunk = words.slice(i, i + chunkSize).join(' ');
      chunks.push(chunk);
    }

    return chunks;
  }

  /**
   * Estimate tokens in text (rough approximation)
   */
  private static estimateTokens(text: string): number {
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  /**
   * ✅ MULTI-HOP ENHANCEMENT: Generate cross-sectional questions using multi-hop retrieval
   * 
   * This method creates PhD-level questions that require understanding of implicit
   * relationships across document sections (e.g., "How does Docker relate to Kubernetes?")
   * 
   * @param documentText - Full document content
   * @param startConcept - Initial concept to start retrieval (e.g., "Docker")
   * @param difficulty - Question difficulty level
   * @returns A multi-hop quiz question requiring concept chain understanding
   */
  static async generateMultiHopQuestion(
    documentText: string,
    startConcept: string,
    difficulty: DifficultyLevel = 'phd'
  ): Promise<QuizQuestion | null> {
    console.log(`🔗 Generating multi-hop question starting from: "${startConcept}"`);

    try {
      // Step 1: Split document into chunks
      const chunks = documentText
        .split(/\n\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 50);

      if (chunks.length === 0) {
        console.error('❌ No valid chunks found in document');
        return null;
      }

      // Step 2: Perform multi-hop retrieval
      const multiHopResult = await MultiHopRetriever.retrieve(startConcept, chunks, {
        maxHops: 3,
        topK: 5,
        similarityThreshold: 0.65,
        minChainLength: 2,
      });

      if (!multiHopResult.success || multiHopResult.conceptChain.length < 2) {
        console.warn('⚠️ Multi-hop retrieval failed or found insufficient concepts');
        return null;
      }

      console.log(`✅ Found concept chain: ${multiHopResult.conceptChain.join(' → ')}`);
      console.log(`   Confidence: ${(multiHopResult.confidence * 100).toFixed(0)}%`);

      // Step 3: Generate cross-sectional question using concept chain
      const conceptChain = multiHopResult.conceptChain.slice(0, 4); // Limit to 4 concepts
      const context = multiHopResult.context.join('\n\n').substring(0, 3000); // Limit context size

      const prompt = `
You are an expert educator creating a multi-hop reasoning question for ${difficulty}-level students.

**Concept Chain**: ${conceptChain.join(' → ')}

**Context**:
${context}

**Task**: Create ONE multiple-choice question that requires understanding the RELATIONSHIP between these concepts across the chain. The question should:
1. Explicitly mention at least 2 concepts from the chain
2. Require reasoning across multiple document sections
3. Test understanding of how concepts connect (not just isolated definitions)
4. Be appropriate for ${difficulty}-level (use advanced cognitive skills)

**Example multi-hop question formats**:
- "How does [Concept A] enable [Concept C] in the context of [Concept B]?"
- "What is the relationship between [Concept A] and [Concept D]?"
- "Why is understanding [Concept B] necessary for implementing [Concept C]?"

Provide your answer in JSON format:
{
  "question": "Your multi-hop question here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Detailed explanation referencing the concept chain",
  "difficulty": "hard"
}`;

      const responseText = await generateWithGemini(prompt, {
        temperature: 0.6,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 600,
      });

      // Parse JSON response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('❌ Failed to parse JSON from Gemini response');
        return null;
      }

      const questionData = JSON.parse(jsonMatch[0]);

      // Validate question structure
      if (
        !questionData.question ||
        !Array.isArray(questionData.options) ||
        questionData.options.length !== 4 ||
        typeof questionData.correctAnswer !== 'number' ||
        !questionData.explanation
      ) {
        console.error('❌ Invalid question structure');
        return null;
      }

      // Create QuizQuestion object (mark as hard for multi-hop)
      const question: QuizQuestion = {
        question: `[Multi-Hop] ${questionData.question}`,
        options: questionData.options,
        correctAnswer: questionData.correctAnswer,
        explanation: `Concept Chain: ${conceptChain.join(' → ')}\n\n${questionData.explanation}`,
        difficulty: 'hard', // Multi-hop questions are always hard
      };

      console.log('✅ Multi-hop question generated successfully');
      return question;

    } catch (error: any) {
      console.error('❌ Multi-hop question generation failed:', error);
      return null;
    }
  }

  /**
   * ✅ BATCH MULTI-HOP: Generate multiple multi-hop questions for a document
   * 
   * For PhD-level quizzes, this generates 20% multi-hop questions automatically.
   * 
   * @param documentText - Full document content
   * @param count - Number of multi-hop questions to generate
   * @param difficulty - Question difficulty level
   * @returns Array of multi-hop questions
   */
  static async generateMultiHopBatch(
    documentText: string,
    count: number,
    difficulty: DifficultyLevel = 'phd'
  ): Promise<QuizQuestion[]> {
    console.log(`🔗 Generating ${count} multi-hop questions...`);

    // Extract potential starting concepts from document
    const startConcepts = this.extractKeyConceptsFromDocument(documentText);
    
    if (startConcepts.length === 0) {
      console.warn('⚠️ No key concepts found in document');
      return [];
    }

    const questions: QuizQuestion[] = [];

    // Generate multi-hop questions for different starting concepts
    for (let i = 0; i < count && i < startConcepts.length; i++) {
      const question = await this.generateMultiHopQuestion(
        documentText,
        startConcepts[i],
        difficulty
      );

      if (question) {
        questions.push(question);
      }

      // Add delay to avoid rate limiting
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log(`✅ Generated ${questions.length}/${count} multi-hop questions`);
    return questions;
  }

  /**
   * Extract key concepts from document (simple heuristic)
   */
  private static extractKeyConceptsFromDocument(text: string): string[] {
    // Extract capitalized words (likely technical terms)
    const words = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g) || [];
    
    // Count frequency
    const frequency = new Map<string, number>();
    words.forEach(word => {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    });

    // Sort by frequency and take top concepts
    return Array.from(frequency.entries())
      .filter(([word]) => word.length > 3) // Skip short words
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }
}

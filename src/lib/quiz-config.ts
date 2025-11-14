/**
 * Quiz Generation Configuration
 * Central place to tune all generation parameters for optimal quality
 */

import { DifficultyLevel } from './quiz-generator-advanced';

// ✅ 1. GENERATION CONFIG - AI Model Parameters
export const GENERATION_CONFIG = {
  undergraduate: {
    temperature: 0.4,    // Lower = more focused, predictable
    topK: 30,            // Sample from top 30 tokens
    topP: 0.85,          // Cumulative probability threshold
    description: 'Straightforward, clear questions with less creativity'
  },
  graduate: {
    temperature: 0.5,    // Moderate creativity
    topK: 35,
    topP: 0.90,
    description: 'Balanced approach with analytical depth'
  },
  phd: {
    temperature: 0.6,    // Higher creativity for complex scenarios
    topK: 40,
    topP: 0.95,
    description: 'Nuanced, sophisticated questions requiring deep thought'
  },
} as const;

// ✅ 2. QUESTION DISTRIBUTION - Difficulty Balance
export const QUESTION_DISTRIBUTION = {
  undergraduate: {
    easy: 0.40,      // 40% easy questions
    medium: 0.40,    // 40% medium questions
    hard: 0.20,      // 20% hard questions
    description: 'Emphasis on fundamentals with some challenge'
  },
  graduate: {
    easy: 0.20,      // 20% easy questions
    medium: 0.50,    // 50% medium questions
    hard: 0.30,      // 30% hard questions
    description: 'Focus on application and analysis'
  },
  phd: {
    easy: 0.10,      // 10% easy questions (foundations check)
    medium: 0.40,    // 40% medium questions
    hard: 0.50,      // 50% hard questions (research-level)
    description: 'Advanced theoretical and critical thinking'
  },
} as const;

// ✅ 3. QUALITY CONTROL - Standards for Generated Content
export const QUALITY_PARAMS = {
  // Explanation quality
  minExplanationLength: 50,     // Minimum characters in explanation
  maxExplanationLength: 250,    // Maximum characters (avoid verbosity)
  optimalExplanationLength: 120, // Sweet spot for clarity
  
  // Option quality (distractors)
  minDistractorLength: 10,      // Minimum length for each option
  minOptionLengthRatio: 0.3,    // Options can't be < 30% of average length
  
  // Content coverage
  contentCoverageTarget: 0.75,  // Should cover 75% of document
  minTopicDiversity: 0.7,       // Avoid focusing too heavily on one topic
  
  // Validation thresholds
  qualityPassThreshold: 0.80,   // Must pass 80% of quality checks
  similarityThreshold: 0.85,    // Questions > 85% similar are duplicates
  
  // Scoring weights
  questionQualityWeight: 0.30,
  optionsQualityWeight: 0.30,
  explanationQualityWeight: 0.20,
  diversityWeight: 0.20,
} as const;

// ✅ 4. PERFORMANCE OPTIMIZATION
export const PERFORMANCE_CONFIG = {
  maxRetries: 3,                // Maximum generation attempts
  chunkSize: 4000,              // Words per chunk for large documents
  maxTokens: 30000,             // Gemini token limit
  tokensPerQuestion: 400,       // Estimated tokens needed per question
  retryDelayMs: 1000,           // Base delay between retries (exponential backoff)
  parallelChunks: false,        // Set to true for parallel processing (experimental)
  enableDeduplication: true,    // Remove similar questions
  minQuestionCount: 5,          // Minimum questions in a quiz
} as const;

// ✅ HELPER: Get generation config for difficulty level
export function getGenerationConfig(difficulty: DifficultyLevel, questionCount: number) {
  const config = GENERATION_CONFIG[difficulty];
  return {
    temperature: config.temperature,
    topK: config.topK,
    topP: config.topP,
    maxOutputTokens: questionCount * PERFORMANCE_CONFIG.tokensPerQuestion,
  };
}

// ✅ HELPER: Get target distribution for question count
export function getTargetDistribution(questionCount: number, difficulty: DifficultyLevel) {
  const distribution = QUESTION_DISTRIBUTION[difficulty];
  return {
    easy: Math.round(questionCount * distribution.easy),
    medium: Math.round(questionCount * distribution.medium),
    hard: Math.round(questionCount * distribution.hard),
  };
}

// ✅ HELPER: Validate if question meets quality standards
export function meetsQualityStandards(
  explanation: string,
  optionLengths: number[]
): boolean {
  // Check explanation length
  const explanationOk = 
    explanation.length >= QUALITY_PARAMS.minExplanationLength &&
    explanation.length <= QUALITY_PARAMS.maxExplanationLength;
  
  // Check option length consistency
  const avgLength = optionLengths.reduce((a, b) => a + b, 0) / optionLengths.length;
  const optionsOk = optionLengths.every(
    len => len >= avgLength * QUALITY_PARAMS.minOptionLengthRatio
  );
  
  // Check minimum distractor length
  const minLengthOk = optionLengths.every(
    len => len >= QUALITY_PARAMS.minDistractorLength
  );
  
  return explanationOk && optionsOk && minLengthOk;
}

// ✅ CONFIGURATION SUMMARY for debugging/logging
export function getConfigSummary(difficulty: DifficultyLevel, questionCount: number) {
  const genConfig = GENERATION_CONFIG[difficulty];
  const distribution = getTargetDistribution(questionCount, difficulty);
  
  return {
    difficulty,
    questionCount,
    generation: {
      temperature: genConfig.temperature,
      topK: genConfig.topK,
      topP: genConfig.topP,
      maxTokens: questionCount * PERFORMANCE_CONFIG.tokensPerQuestion,
    },
    distribution: {
      easy: `${distribution.easy} (${Math.round(distribution.easy / questionCount * 100)}%)`,
      medium: `${distribution.medium} (${Math.round(distribution.medium / questionCount * 100)}%)`,
      hard: `${distribution.hard} (${Math.round(distribution.hard / questionCount * 100)}%)`,
    },
    quality: {
      explanationRange: `${QUALITY_PARAMS.minExplanationLength}-${QUALITY_PARAMS.maxExplanationLength} chars`,
      minDistractorLength: `${QUALITY_PARAMS.minDistractorLength} chars`,
      contentCoverage: `${QUALITY_PARAMS.contentCoverageTarget * 100}%`,
    },
  };
}

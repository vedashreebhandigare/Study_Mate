/**
 * Quiz Validator - Validate and score generated quizzes
 */

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface ValidationResult {
  isValid: boolean;
  score: number; // 0-100
  issues: string[];
  warnings: string[];
  metrics: {
    questionQuality: number;
    optionsQuality: number;
    explanationQuality: number;
    diversityScore: number;
  };
  qualityCard?: QualityScoreCard; // NEW: Trust badge metrics
}

export interface QualityScoreCard {
  overallScore: number; // 0-100
  positionBalance: { A: number; B: number; C: number; D: number }; // Percentage distribution
  lengthBalance: number; // 0-100 score
  biasedPhrasing: number; // Count of absolute language instances
  cognitiveAlignment: number; // 0-100 score
  badges: string[]; // Achievement badges: "Balanced options", "No biased phrasing", "PhD-level depth"
}

export class QuizValidator {
  /**
   * Validate a complete quiz
   */
  static validateQuiz(questions: QuizQuestion[]): ValidationResult {
    const issues: string[] = [];
    const warnings: string[] = [];
    const metrics = {
      questionQuality: 0,
      optionsQuality: 0,
      explanationQuality: 0,
      diversityScore: 0,
    };

    // Check if quiz exists and has questions
    if (!questions || questions.length === 0) {
      issues.push('Quiz has no questions');
      return {
        isValid: false,
        score: 0,
        issues,
        warnings,
        metrics,
      };
    }

    // Validate minimum question count
    if (questions.length < 5) {
      warnings.push(`Quiz has only ${questions.length} questions (recommended: at least 5)`);
    }

    // Validate each question
    let totalQuestionScore = 0;
    let totalOptionsScore = 0;
    let totalExplanationScore = 0;

    questions.forEach((q, index) => {
      const questionValidation = this.validateQuestion(q, index);
      issues.push(...questionValidation.issues);
      warnings.push(...questionValidation.warnings);
      
      totalQuestionScore += questionValidation.questionScore;
      totalOptionsScore += questionValidation.optionsScore;
      totalExplanationScore += questionValidation.explanationScore;
    });

    // Calculate average scores
    metrics.questionQuality = Math.round(totalQuestionScore / questions.length);
    metrics.optionsQuality = Math.round(totalOptionsScore / questions.length);
    metrics.explanationQuality = Math.round(totalExplanationScore / questions.length);
    metrics.diversityScore = this.calculateDiversityScore(questions);

    // Calculate overall score
    const score = Math.round(
      metrics.questionQuality * 0.3 +
      metrics.optionsQuality * 0.3 +
      metrics.explanationQuality * 0.2 +
      metrics.diversityScore * 0.2
    );

    // ✅ NEW: Generate Quality Score Card
    const qualityCard = this.generateQualityScoreCard(questions);

    return {
      isValid: issues.length === 0,
      score,
      issues,
      warnings,
      metrics,
      qualityCard,
    };
  }

  /**
   * Validate individual question
   */
  private static validateQuestion(
    question: QuizQuestion,
    index: number
  ): {
    issues: string[];
    warnings: string[];
    questionScore: number;
    optionsScore: number;
    explanationScore: number;
  } {
    const issues: string[] = [];
    const warnings: string[] = [];
    let questionScore = 100;
    let optionsScore = 100;
    let explanationScore = 100;

    const questionPrefix = `Question ${index + 1}:`;

    // Validate question text
    if (!question.question || question.question.trim().length === 0) {
      issues.push(`${questionPrefix} Question text is empty`);
      questionScore = 0;
    } else {
      if (question.question.length < 10) {
        warnings.push(`${questionPrefix} Question text is very short`);
        questionScore -= 20;
      }
      if (!question.question.endsWith('?')) {
        warnings.push(`${questionPrefix} Question should end with a question mark`);
        questionScore -= 10;
      }
    }

    // Validate options
    if (!question.options || !Array.isArray(question.options)) {
      issues.push(`${questionPrefix} Options are missing or invalid`);
      optionsScore = 0;
    } else {
      if (question.options.length !== 4) {
        issues.push(`${questionPrefix} Must have exactly 4 options (found ${question.options.length})`);
        optionsScore -= 50;
      }

      // Check for empty options
      const emptyOptions = question.options.filter(opt => !opt || opt.trim().length === 0);
      if (emptyOptions.length > 0) {
        issues.push(`${questionPrefix} Has ${emptyOptions.length} empty option(s)`);
        optionsScore -= 25 * emptyOptions.length;
      }

      // Check for duplicate options
      const uniqueOptions = new Set(question.options.map(opt => opt.toLowerCase().trim()));
      if (uniqueOptions.size < question.options.length) {
        warnings.push(`${questionPrefix} Has duplicate options`);
        optionsScore -= 30;
      }

      // Check option length similarity
      const lengths = question.options.map(opt => opt.length);
      const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const hasOneTooShort = lengths.some(len => len < avgLength * 0.3);
      if (hasOneTooShort) {
        warnings.push(`${questionPrefix} One option is suspiciously short (might be obvious)`);
        optionsScore -= 15;
      }
    }

    // Validate correct answer
    if (typeof question.correctAnswer !== 'number') {
      issues.push(`${questionPrefix} Correct answer index is not a number`);
      optionsScore -= 50;
    } else if (question.correctAnswer < 0 || question.correctAnswer >= (question.options?.length || 4)) {
      issues.push(`${questionPrefix} Correct answer index is out of range`);
      optionsScore -= 50;
    }

    // Validate explanation (✅ ENHANCED with quality standards)
    if (!question.explanation || question.explanation.trim().length === 0) {
      warnings.push(`${questionPrefix} Missing explanation`);
      explanationScore = 0;
    } else {
      // Check minimum length (should be 50-250 characters for quality)
      if (question.explanation.length < 50) {
        warnings.push(`${questionPrefix} Explanation is too brief (< 50 chars)`);
        explanationScore -= 50;
      } else if (question.explanation.length < 80) {
        warnings.push(`${questionPrefix} Explanation could be more detailed`);
        explanationScore -= 20;
      }
      
      // Check maximum length
      if (question.explanation.length > 250) {
        warnings.push(`${questionPrefix} Explanation is too verbose (> 250 chars)`);
        explanationScore -= 15;
      }
      
      // Check if explanation mentions why other options are wrong
      const mentionsAlternatives = 
        question.explanation.toLowerCase().includes('other') ||
        question.explanation.toLowerCase().includes('incorrect') ||
        question.explanation.toLowerCase().includes('wrong') ||
        question.explanation.toLowerCase().includes('however') ||
        question.explanation.toLowerCase().includes('while');
      
      if (!mentionsAlternatives && question.explanation.length < 100) {
        warnings.push(`${questionPrefix} Explanation should explain why other options are incorrect`);
        explanationScore -= 10;
      }
    }

    // Validate difficulty
    if (!question.difficulty || !['easy', 'medium', 'hard'].includes(question.difficulty)) {
      warnings.push(`${questionPrefix} Invalid or missing difficulty level`);
      questionScore -= 10;
    }

    return {
      issues,
      warnings,
      questionScore: Math.max(0, questionScore),
      optionsScore: Math.max(0, optionsScore),
      explanationScore: Math.max(0, explanationScore),
    };
  }

  /**
   * Calculate diversity score (variety in difficulty, question types, etc.)
   */
  private static calculateDiversityScore(questions: QuizQuestion[]): number {
    let score = 100;

    // Check difficulty distribution
    const difficulties = questions.map(q => q.difficulty);
    const uniqueDifficulties = new Set(difficulties);
    
    if (uniqueDifficulties.size === 1) {
      score -= 30; // All questions same difficulty
    } else if (uniqueDifficulties.size === 2) {
      score -= 15; // Only two difficulty levels
    }

    // Check question length variety
    const questionLengths = questions.map(q => q.question.length);
    const avgLength = questionLengths.reduce((a, b) => a + b, 0) / questionLengths.length;
    const variance = questionLengths.reduce((sum, len) => sum + Math.pow(len - avgLength, 2), 0) / questionLengths.length;
    
    if (variance < 100) {
      score -= 20; // Questions are too similar in length
    }

    return Math.max(0, score);
  }

  /**
   * Get quality label based on score
   */
  static getQualityLabel(score: number): string {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Good';
    if (score >= 60) return 'Fair';
    if (score >= 40) return 'Poor';
    return 'Very Poor';
  }

  /**
   * Get quality color for UI display
   */
  static getQualityColor(score: number): string {
    if (score >= 90) return 'from-green-500 to-emerald-500';
    if (score >= 75) return 'from-blue-500 to-cyan-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    if (score >= 40) return 'from-orange-500 to-red-500';
    return 'from-red-500 to-red-700';
  }

  /**
   * ✅ NEW: Generate Quality Score Card (Trust Badge)
   */
  static generateQualityScoreCard(questions: QuizQuestion[]): QualityScoreCard {
    // 1. Calculate position balance (correct answers should be evenly distributed)
    const positionCounts = { A: 0, B: 0, C: 0, D: 0 };
    questions.forEach(q => {
      const position = ['A', 'B', 'C', 'D'][q.correctAnswer];
      if (position) positionCounts[position as keyof typeof positionCounts]++;
    });

    const positionBalance = {
      A: Math.round((positionCounts.A / questions.length) * 100),
      B: Math.round((positionCounts.B / questions.length) * 100),
      C: Math.round((positionCounts.C / questions.length) * 100),
      D: Math.round((positionCounts.D / questions.length) * 100),
    };

    // 2. Calculate length balance score (correct answer shouldn't be disproportionately longer)
    let lengthBalanceScore = 100;
    let lengthIssuesCount = 0;

    questions.forEach(q => {
      const correctLength = q.options[q.correctAnswer]?.length || 0;
      const distractorLengths = q.options
        .filter((_, idx) => idx !== q.correctAnswer)
        .map(opt => opt.length);
      
      const avgDistractorLength = distractorLengths.reduce((a, b) => a + b, 0) / distractorLengths.length;

      // ✅ REFINEMENT 1: Length Balancing (flag if >30% longer than average)
      if (correctLength > avgDistractorLength * 1.3) {
        lengthBalanceScore -= 10;
        lengthIssuesCount++;
      }
    });

    lengthBalanceScore = Math.max(0, lengthBalanceScore);

    // 3. Detect absolute/biased language
    const absoluteTerms = ['always', 'never', 'guarantee', 'guarantees', 'impossible', 'certainly', 'definitely', 'absolutely'];
    let biasedPhrasingCount = 0;

    questions.forEach(q => {
      q.options.forEach(opt => {
        const lowerOpt = opt.toLowerCase();
        if (absoluteTerms.some(term => lowerOpt.includes(term))) {
          biasedPhrasingCount++;
        }
      });
    });

    // 4. Calculate cognitive alignment (will be updated by quiz generator)
    const cognitiveAlignment = 85; // Default - will be overridden by generator

    // 5. Award badges
    const badges: string[] = [];
    
    // Position balance badge (variance < 15%)
    const positionValues = Object.values(positionBalance);
    const avgPosition = positionValues.reduce((a, b) => a + b, 0) / 4;
    const positionVariance = Math.sqrt(
      positionValues.reduce((sum, val) => sum + Math.pow(val - avgPosition, 2), 0) / 4
    );
    if (positionVariance < 15) badges.push('Balanced Options');

    // No biased phrasing badge
    if (biasedPhrasingCount === 0) badges.push('No Biased Phrasing');

    // Length balance badge
    if (lengthIssuesCount === 0) badges.push('Length Balanced');

    // Overall quality badge
    const overallScore = Math.round(
      (positionVariance < 15 ? 25 : 0) +
      lengthBalanceScore * 0.25 +
      (biasedPhrasingCount === 0 ? 25 : Math.max(0, 25 - biasedPhrasingCount * 5)) +
      cognitiveAlignment * 0.25
    );

    if (overallScore >= 90) badges.push('Excellent Quality');
    else if (overallScore >= 80) badges.push('High Quality');

    return {
      overallScore,
      positionBalance,
      lengthBalance: lengthBalanceScore,
      biasedPhrasing: biasedPhrasingCount,
      cognitiveAlignment,
      badges,
    };
  }
}

/**
 * ✅ NEW: Shuffle question options (Fisher-Yates algorithm)
 * Removes position bias by randomizing correct answer location
 */
export function shuffleOptionsWithTracking(question: QuizQuestion): QuizQuestion {
  const originalCorrectIndex = question.correctAnswer;
  const originalOptions = [...question.options];
  
  // Create array of indices and shuffle (Fisher-Yates)
  const indices = [0, 1, 2, 3];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  
  // Reorder options and track new correct index
  return {
    ...question,
    options: indices.map(i => originalOptions[i]),
    correctAnswer: indices.indexOf(originalCorrectIndex)
  };
}

/**
 * ✅ NEW: Validate quiz quality with comprehensive checks
 * Returns score 0-100 based on: length balance, keyword copying, absolute language, etc.
 */
export function validateQuizQuality(
  questions: QuizQuestion[],
  documentContent: string = ''
): {
  isValid: boolean;
  issues: string[];
  score: number;
} {
  const issues: string[] = [];
  let qualityScore = 100;

  questions.forEach((q, qIdx) => {
    // 1. Check option length balance (word count)
    const lengths = q.options.map(opt => opt.split(' ').length);
    const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const maxDeviation = Math.max(...lengths.map(len => Math.abs(len - avgLength)));
    
    if (maxDeviation > 5) {
      issues.push(
        `Q${qIdx + 1}: Option length imbalance (max: ${Math.max(...lengths)}, min: ${Math.min(...lengths)} words)`
      );
      qualityScore -= 10;
    }

    // 2. Check if correct answer is significantly longer than distractors
    const correctLength = lengths[q.correctAnswer];
    const avgOtherLength = lengths
      .filter((_, idx) => idx !== q.correctAnswer)
      .reduce((a, b) => a + b, 0) / 3;
    
    if (correctLength > avgOtherLength + 3) {
      issues.push(`Q${qIdx + 1}: Correct answer significantly longer than distractors`);
      qualityScore -= 15;
    }

    // 3. Check for keyword copying (verbatim 6-word phrases from document)
    if (documentContent) {
      const correctAnswer = q.options[q.correctAnswer];
      const words = correctAnswer.split(' ');
      
      for (let i = 0; i < words.length - 5; i++) {
        const phrase = words.slice(i, i + 6).join(' ').toLowerCase();
        if (documentContent.toLowerCase().includes(phrase)) {
          issues.push(`Q${qIdx + 1}: Correct answer contains verbatim phrase from document`);
          qualityScore -= 5;
          break;
        }
      }
    }

    // 4. Check for absolute language in wrong answers (makes them obviously wrong)
    const wrongAnswers = q.options.filter((_, idx) => idx !== q.correctAnswer);
    wrongAnswers.forEach((opt, idx) => {
      if (/\b(always|never|only|randomly|impossible|cannot|must)\b/i.test(opt)) {
        issues.push(`Q${qIdx + 1} Option ${idx + 1}: Uses absolute language in wrong answer`);
        qualityScore -= 5;
      }
    });

    // 5. Check if options are too short (suspiciously brief)
    if (lengths.some(len => len < 5)) {
      issues.push(`Q${qIdx + 1}: One or more options too short (< 5 words)`);
      qualityScore -= 5;
    }

    // 6. Check for duplicate options
    const uniqueOptions = new Set(q.options.map(opt => opt.toLowerCase().trim()));
    if (uniqueOptions.size < 4) {
      issues.push(`Q${qIdx + 1}: Duplicate or nearly duplicate options detected`);
      qualityScore -= 20;
    }
  });

  return {
    isValid: qualityScore >= 70,
    issues,
    score: Math.max(0, qualityScore)
  };
}

/**
 * ✅ NEW: Auto-pad short options as fallback (last resort)
 * Only used when regeneration fails after 3 attempts
 */
export function autoPadOptions(question: QuizQuestion): QuizQuestion {
  const lengths = question.options.map(opt => opt.split(' ').length);
  const targetLength = Math.max(...lengths);
  
  const paddedOptions = question.options.map(opt => {
    const currentLength = opt.split(' ').length;
    
    // Only pad if significantly shorter (>2 words difference)
    if (currentLength < targetLength - 2) {
      const fillers = [
        'according to the system design',
        'as described in the methodology',
        'based on the implementation approach',
        'following the established framework',
        'per the documented specifications',
        'within the given parameters'
      ];
      const filler = fillers[Math.floor(Math.random() * fillers.length)];
      return `${opt}, ${filler}`;
    }
    return opt;
  });
  
  return {
    ...question,
    options: paddedOptions
  };
}

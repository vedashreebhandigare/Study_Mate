/**
 * Cognitive Framework for Quiz Generation
 * Based on Bloom's Taxonomy and cognitive science principles
 */

export type CognitiveLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';

export interface CognitiveFramework {
  level: CognitiveLevel;
  verbs: string[];
  questionStarters: string[];
  avoidPatterns: string[];
}

// ✅ Bloom's Taxonomy - Cognitive Verbs by Level
export const COGNITIVE_VERBS = {
  // Lower-Order Thinking (Undergraduate-heavy)
  remember: ['identify', 'list', 'name', 'recall', 'define', 'recognize', 'state'],
  understand: ['explain', 'describe', 'interpret', 'summarize', 'classify', 'compare'],
  
  // Higher-Order Thinking (Graduate-heavy)
  apply: ['apply', 'demonstrate', 'execute', 'implement', 'solve', 'use', 'illustrate'],
  analyze: ['analyze', 'differentiate', 'distinguish', 'examine', 'investigate', 'categorize', 'deconstruct'],
  
  // Advanced Thinking (PhD-heavy)
  evaluate: ['evaluate', 'critique', 'assess', 'judge', 'defend', 'justify', 'argue', 'prioritize'],
  create: ['design', 'construct', 'develop', 'formulate', 'hypothesize', 'synthesize', 'propose'],
} as const;

// ✅ Question Patterns by Difficulty Level
export const COGNITIVE_PATTERNS = {
  undergraduate: {
    goodPatterns: [
      'What is the primary function of',
      'Which component is responsible for',
      'How does X differ from Y',
      'Explain the purpose of',
      'Identify the correct sequence',
    ],
    avoidPatterns: [
      'What is the name of',
      'Who authored',
      'Which year was',
      'What accuracy did',
      'Which dataset contains',
    ],
  },
  
  graduate: {
    goodPatterns: [
      'How would you apply',
      'Analyze the trade-offs between',
      'What are the implications of',
      'Compare the effectiveness of',
      'Which approach would be most suitable for',
    ],
    avoidPatterns: [
      'What is',
      'List the',
      'Name the',
      'Which author',
      'What page number',
    ],
  },
  
  phd: {
    goodPatterns: [
      'Critique the assumption that',
      'Evaluate the limitations of',
      'Under what conditions would',
      'How might X limit the ability to',
      'Why might the methodology fail when',
      'What are the theoretical implications of',
      'Propose an alternative approach to',
    ],
    avoidPatterns: [
      'What is the accuracy',
      'Which dataset was used',
      'What are the authors',
      'How many layers',
      'What is the name',
      'Which university',
    ],
  },
} as const;

// ✅ Non-Technical Question Filters
export const NON_TECHNICAL_PATTERNS = [
  // Author/affiliation related
  /\b(author|writer|researcher|scientist|professor|dr\.|phd)\b/i,
  /\b(university|institution|college|department|lab|laboratory)\b/i,
  /\b(published|journal|conference|proceedings|citation)\b/i,
  
  // Metadata
  /\b(page number|section number|figure number|table number)\b/i,
  /\b(year|date|month|published when|published where)\b/i,
  /\b(abstract|introduction|conclusion|references|bibliography)\b/i,
  
  // Superficial details
  /\b(title of|name of the paper|name of the study)\b/i,
  /\b(acknowledgments|funding|grant)\b/i,
  /\b(biographical|biography|background of)\b/i,
] as const;

// ✅ Shallow Question Patterns (to avoid)
export const SHALLOW_PATTERNS = [
  /^what is\b/i,
  /^which dataset\b/i,
  /^what accuracy\b/i,
  /^how many\b/i,
  /^name the\b/i,
  /^list the\b/i,
  /\bwhat.*called\b/i,
  /\bwhich.*named\b/i,
] as const;

// ✅ Deep Question Patterns (preferred for higher levels)
export const DEEP_PATTERNS = [
  /\bwhy might\b/i,
  /\bhow would\b/i,
  /\bunder what conditions\b/i,
  /\bcritique\b/i,
  /\bevaluate\b/i,
  /\banalyze.*trade-?off/i,
  /\blimitations?\b/i,
  /\bassumptions?\b/i,
  /\bgenerali[sz]ation\b/i,
  /\btheoretical implications\b/i,
] as const;

/**
 * Classify question cognitive level
 */
export function classifyQuestionLevel(question: string): CognitiveLevel {
  const lowerQuestion = question.toLowerCase();
  
  // Check for create-level verbs
  if (COGNITIVE_VERBS.create.some(verb => lowerQuestion.includes(verb))) {
    return 'create';
  }
  
  // Check for evaluate-level verbs
  if (COGNITIVE_VERBS.evaluate.some(verb => lowerQuestion.includes(verb))) {
    return 'evaluate';
  }
  
  // Check for analyze-level verbs
  if (COGNITIVE_VERBS.analyze.some(verb => lowerQuestion.includes(verb))) {
    return 'analyze';
  }
  
  // Check for apply-level verbs
  if (COGNITIVE_VERBS.apply.some(verb => lowerQuestion.includes(verb))) {
    return 'apply';
  }
  
  // Check for understand-level verbs
  if (COGNITIVE_VERBS.understand.some(verb => lowerQuestion.includes(verb))) {
    return 'understand';
  }
  
  // Default to remember
  return 'remember';
}

/**
 * Check if question is non-technical (should be filtered)
 */
export function isNonTechnical(question: string): boolean {
  return NON_TECHNICAL_PATTERNS.some(pattern => pattern.test(question));
}

/**
 * Check if question is shallow (not suitable for higher levels)
 */
export function isShallowQuestion(question: string): boolean {
  return SHALLOW_PATTERNS.some(pattern => pattern.test(question));
}

/**
 * Check if question is deep/complex
 */
export function isDeepQuestion(question: string): boolean {
  return DEEP_PATTERNS.some(pattern => pattern.test(question));
}

/**
 * Validate question quality for difficulty level
 */
export function validateQuestionForLevel(
  question: string,
  difficulty: 'undergraduate' | 'graduate' | 'phd'
): { isValid: boolean; reason?: string; score: number } {
  // Filter non-technical questions
  if (isNonTechnical(question)) {
    return {
      isValid: false,
      reason: 'Non-technical content (authors, affiliations, metadata)',
      score: 0,
    };
  }
  
  const cognitiveLevel = classifyQuestionLevel(question);
  const isShallow = isShallowQuestion(question);
  const isDeep = isDeepQuestion(question);
  
  let score = 50; // Base score
  
  // PhD level validation
  if (difficulty === 'phd') {
    // PhD questions should be evaluate/create level
    if (cognitiveLevel === 'evaluate' || cognitiveLevel === 'create') {
      score += 30;
    } else if (cognitiveLevel === 'analyze') {
      score += 10;
    } else {
      score -= 20;
    }
    
    // Should be deep, not shallow
    if (isDeep) {
      score += 20;
    }
    if (isShallow) {
      score -= 40;
      return {
        isValid: false,
        reason: 'Too shallow for PhD level (avoid "what is", "which dataset", etc.)',
        score,
      };
    }
  }
  
  // Graduate level validation
  if (difficulty === 'graduate') {
    // Graduate questions should be analyze/apply level
    if (cognitiveLevel === 'analyze' || cognitiveLevel === 'apply' || cognitiveLevel === 'evaluate') {
      score += 20;
    } else if (cognitiveLevel === 'understand') {
      score += 5;
    } else {
      score -= 10;
    }
    
    if (isShallow) {
      score -= 20;
    }
  }
  
  // Undergraduate level validation
  if (difficulty === 'undergraduate') {
    // Undergraduate can use remember/understand
    if (cognitiveLevel === 'remember' || cognitiveLevel === 'understand') {
      score += 10;
    }
    
    // But still avoid non-technical
    if (isShallow && isNonTechnical(question)) {
      score -= 30;
    }
  }
  
  return {
    isValid: score >= 50,
    reason: score < 50 ? `Cognitive level mismatch for ${difficulty}` : undefined,
    score,
  };
}

/**
 * Get cognitive framework for difficulty level
 */
export function getCognitiveFramework(difficulty: 'undergraduate' | 'graduate' | 'phd') {
  const frameworks = {
    undergraduate: {
      primaryLevels: ['remember', 'understand', 'apply'] as CognitiveLevel[],
      preferredVerbs: [...COGNITIVE_VERBS.understand, ...COGNITIVE_VERBS.apply],
      avoidVerbs: [...COGNITIVE_VERBS.create],
    },
    graduate: {
      primaryLevels: ['apply', 'analyze', 'evaluate'] as CognitiveLevel[],
      preferredVerbs: [...COGNITIVE_VERBS.analyze, ...COGNITIVE_VERBS.apply],
      avoidVerbs: [...COGNITIVE_VERBS.remember],
    },
    phd: {
      primaryLevels: ['analyze', 'evaluate', 'create'] as CognitiveLevel[],
      preferredVerbs: [...COGNITIVE_VERBS.evaluate, ...COGNITIVE_VERBS.create],
      avoidVerbs: [...COGNITIVE_VERBS.remember, ...COGNITIVE_VERBS.understand],
    },
  };
  
  return frameworks[difficulty];
}

/**
 * Content Analyzer - Analyze document content for quiz generation
 */

export interface ContentAnalysis {
  wordCount: number;
  characterCount: number;
  estimatedReadingTime: number;
  complexity: 'beginner' | 'intermediate' | 'advanced';
  topics: string[];
  keyPhrases: string[];
  suggestedQuestionCount: number;
  contentType: 'technical' | 'academic' | 'general';
}

export class ContentAnalyzer {
  /**
   * Analyze content and return metadata
   */
  static analyzeContent(text: string): ContentAnalysis {
    const wordCount = this.countWords(text);
    const characterCount = text.length;
    const estimatedReadingTime = Math.ceil(wordCount / 200); // 200 words per minute
    const complexity = this.determineComplexity(text, wordCount);
    const topics = this.extractTopics(text);
    const keyPhrases = this.extractKeyPhrases(text);
    const suggestedQuestionCount = this.calculateQuestionCount(wordCount);
    const contentType = this.determineContentType(text);

    return {
      wordCount,
      characterCount,
      estimatedReadingTime,
      complexity,
      topics,
      keyPhrases,
      suggestedQuestionCount,
      contentType,
    };
  }

  /**
   * Count words in text
   */
  private static countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  /**
   * Determine content complexity based on text analysis
   */
  private static determineComplexity(
    text: string,
    wordCount: number
  ): 'beginner' | 'intermediate' | 'advanced' {
    // Calculate average word length
    const words = text.trim().split(/\s+/);
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;

    // Calculate average sentence length
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const avgSentenceLength = wordCount / sentences.length;

    // Count complex words (more than 3 syllables or technical terms)
    const complexWords = words.filter(word => this.isComplexWord(word)).length;
    const complexityRatio = complexWords / wordCount;

    // Determine complexity
    if (avgWordLength > 6 && avgSentenceLength > 20 && complexityRatio > 0.15) {
      return 'advanced';
    } else if (avgWordLength > 5 && avgSentenceLength > 15 && complexityRatio > 0.1) {
      return 'intermediate';
    }
    return 'beginner';
  }

  /**
   * Check if a word is considered complex
   */
  private static isComplexWord(word: string): boolean {
    // Remove punctuation
    const cleanWord = word.replace(/[^a-zA-Z]/g, '').toLowerCase();
    
    // Technical/academic indicators
    const technicalPrefixes = ['bio', 'geo', 'theo', 'techno', 'socio', 'psycho', 'neuro'];
    const technicalSuffixes = ['ology', 'ography', 'ization', 'ification'];
    
    return (
      cleanWord.length > 8 ||
      technicalPrefixes.some(prefix => cleanWord.startsWith(prefix)) ||
      technicalSuffixes.some(suffix => cleanWord.endsWith(suffix))
    );
  }

  /**
   * Extract main topics from text
   */
  private static extractTopics(text: string): string[] {
    // Simple topic extraction based on capitalized words and frequency
    const words = text.match(/\b[A-Z][a-z]+\b/g) || [];
    const wordFrequency = new Map<string, number>();

    words.forEach(word => {
      if (word.length > 3 && !this.isCommonWord(word.toLowerCase())) {
        wordFrequency.set(word, (wordFrequency.get(word) || 0) + 1);
      }
    });

    // Sort by frequency and return top 5
    return Array.from(wordFrequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  /**
   * Extract key phrases from text
   */
  private static extractKeyPhrases(text: string): string[] {
    // Extract phrases in quotes or after colons
    const quotedPhrases = text.match(/"([^"]+)"/g) || [];
    const colonPhrases = text.match(/:\s*([A-Z][^.!?]*)/g) || [];

    const phrases = [
      ...quotedPhrases.map(p => p.replace(/"/g, '')),
      ...colonPhrases.map(p => p.replace(/:\s*/, '')),
    ];

    return phrases.slice(0, 5);
  }

  /**
   * Calculate suggested number of questions based on content length
   */
  private static calculateQuestionCount(wordCount: number): number {
    if (wordCount < 500) return 5;
    if (wordCount < 1000) return 8;
    if (wordCount < 2000) return 10;
    if (wordCount < 3000) return 12;
    return 15;
  }

  /**
   * Determine content type (technical, academic, general)
   */
  private static determineContentType(text: string): 'technical' | 'academic' | 'general' {
    const technicalTerms = [
      'algorithm', 'function', 'variable', 'method', 'class', 'interface',
      'implementation', 'architecture', 'protocol', 'framework', 'API',
      'database', 'server', 'client', 'network', 'system',
    ];

    const academicTerms = [
      'research', 'study', 'theory', 'hypothesis', 'methodology', 'analysis',
      'evidence', 'conclusion', 'abstract', 'literature', 'findings',
      'significant', 'correlation', 'demonstrates', 'suggests',
    ];

    const lowerText = text.toLowerCase();
    const technicalCount = technicalTerms.filter(term => lowerText.includes(term)).length;
    const academicCount = academicTerms.filter(term => lowerText.includes(term)).length;

    if (technicalCount > 5) return 'technical';
    if (academicCount > 5) return 'academic';
    return 'general';
  }

  /**
   * Check if word is a common word to filter out
   */
  private static isCommonWord(word: string): boolean {
    const commonWords = [
      'the', 'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
      'were', 'will', 'would', 'could', 'should', 'about', 'which', 'their',
      'there', 'where', 'when', 'what', 'some', 'other', 'such', 'into',
    ];
    return commonWords.includes(word);
  }

  /**
   * Format analysis for display
   */
  static formatAnalysis(analysis: ContentAnalysis): string {
    return `
Content Analysis:
- Words: ${analysis.wordCount.toLocaleString()}
- Reading Time: ~${analysis.estimatedReadingTime} min
- Complexity: ${analysis.complexity}
- Content Type: ${analysis.contentType}
- Suggested Questions: ${analysis.suggestedQuestionCount}
- Main Topics: ${analysis.topics.join(', ') || 'None identified'}
    `.trim();
  }
}
